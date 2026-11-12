const { uuid, fail } = require("./marketplace");
const { isAdmin } = require("./middleware/auth");
function assertAdmin(user) {
  if (!isAdmin(user)) fail(403, "Administrator access required.");
}
function reason(value) {
  if (
    typeof value !== "string" ||
    value.trim().length < 3 ||
    value.trim().length > 500
  )
    fail(400, "Enter a reason between 3 and 500 characters.");
  return value.trim();
}
function createModeration(pool, market, media) {
  return {
    async report(user, id, body) {
      uuid(id);
      if (
        ![
          "inappropriate_image",
          "unsafe_food",
          "inaccurate_listing",
          "other",
        ].includes(body.reason)
      )
        fail(400, "Choose a report reason.");
      if (
        typeof (body.details ?? "") !== "string" ||
        (body.details || "").length > 500
      )
        fail(400, "Keep report details under 500 characters.");
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const {
          rows: [listing],
        } = await client.query(
          "SELECT listing_id FROM listings WHERE listing_id=$1 AND published_by_vendor AND removed_at IS NULL FOR UPDATE",
          [id],
        );
        if (!listing) fail(404, "Listing not found.");
        await client.query(
          `INSERT INTO listing_reports(listing_id,reporter_id,reason,details) VALUES($1,$2,$3,$4)
   ON CONFLICT(listing_id,reporter_id) DO UPDATE SET reason=EXCLUDED.reason,details=EXCLUDED.details WHERE listing_reports.resolved_at IS NULL`,
          [id, user.user_id, body.reason, (body.details || "").trim()],
        );
        await client.query("COMMIT");
        return { status: "reported" };
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    },
    async list(user) {
      assertAdmin(user);
      const { rows } =
        await pool.query(`SELECT l.*,it.name AS item_name,v.business_name,v.user_id AS owner_id,v.address,v.email AS vendor_email,v.phone AS vendor_phone,v.vendor_id,
   (SELECT count(*)::int FROM listing_reports r WHERE r.listing_id=l.listing_id AND r.resolved_at IS NULL) AS report_count
   FROM listings l JOIN vendors v ON v.vendor_id=l.vendor_id JOIN item_templates it ON it.item_template_id=l.item_template_id
   WHERE l.published_by_vendor ORDER BY (l.removed_at IS NULL) DESC,report_count DESC,l.created_at DESC LIMIT 200`);
      if (!rows.length) return [];
      const reports = await pool.query(
        "SELECT listing_id,reason,details,created_at FROM listing_reports WHERE listing_id=ANY($1::uuid[]) AND resolved_at IS NULL ORDER BY created_at DESC",
        [rows.map((r) => r.listing_id)],
      );
      return Promise.all(
        rows.map(async (row) => {
          let dto;
          try {
            dto = await market.toDto(row);
          } catch (error) {
            console.error(
              "Moderation photo preview unavailable:",
              error.code || error.name,
            );
            dto = await market.toDto({ ...row, photo_key: null });
          }
          return {
            ...dto,
            removedAt: row.removed_at,
            removalReason: row.removal_reason,
            photoCleanupPending: !!(
              row.removed_at &&
              row.photo_key &&
              !row.photo_blocked_at
            ),
            reportCount: row.report_count,
            reports: reports.rows.filter(
              (r) => r.listing_id === row.listing_id,
            ),
          };
        }),
      );
    },
    async remove(user, id, body) {
      assertAdmin(user);
      uuid(id);
      const note = reason(body.reason);
      const client = await pool.connect();
      let row;
      try {
        await client.query("BEGIN");
        ({
          rows: [row],
        } = await client.query(
          "SELECT * FROM listings WHERE listing_id=$1 AND published_by_vendor FOR UPDATE",
          [id],
        ));
        if (!row) fail(404, "Listing not found.");
        if (!row.removed_at) {
          await client.query(
            "UPDATE listings SET status='removed',removed_at=now(),removed_by=$1,removal_reason=$2,updated_at=now() WHERE listing_id=$3",
            [user.user_id, note, id],
          );
          await client.query(
            "INSERT INTO moderation_actions(listing_id,actor_id,action,reason) VALUES($1,$2,'remove',$3)",
            [id, user.user_id, note],
          );
          await client.query(
            "UPDATE listing_reports SET resolved_at=now() WHERE listing_id=$1 AND resolved_at IS NULL",
            [id],
          );
        }
        await client.query("COMMIT");
      } catch (e) {
        await client.query("ROLLBACK");
        throw e;
      } finally {
        client.release();
      }
      // Hide immediately, even if storage is temporarily unavailable; retry the same action for cleanup.
      let blocked = !row.photo_key || !!row.photo_blocked_at;
      if (!blocked) {
        try {
          await media.block(row.photo_key);
          await pool.query(
            "UPDATE listings SET photo_blocked_at=now() WHERE listing_id=$1",
            [id],
          );
          blocked = true;
        } catch (e) {
          console.error("Moderation photo cleanup pending:", e.code || e.name);
        }
      }
      return { status: "removed", photoBlocked: blocked };
    },
    async dismiss(user, id, body) {
      assertAdmin(user);
      uuid(id);
      const note = reason(body.reason);
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const listing = await client.query(
          "SELECT listing_id FROM listings WHERE listing_id=$1 AND published_by_vendor",
          [id],
        );
        if (!listing.rowCount) fail(404, "Listing not found.");
        await client.query(
          "UPDATE listing_reports SET resolved_at=now() WHERE listing_id=$1 AND resolved_at IS NULL",
          [id],
        );
        await client.query(
          "INSERT INTO moderation_actions(listing_id,actor_id,action,reason) VALUES($1,$2,'dismiss_reports',$3)",
          [id, user.user_id, note],
        );
        await client.query("COMMIT");
        return { status: "reviewed" };
      } catch (e) {
        await client.query("ROLLBACK");
        throw e;
      } finally {
        client.release();
      }
    },
  };
}
module.exports = { createModeration };
