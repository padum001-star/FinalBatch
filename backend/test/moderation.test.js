const { test } = require("node:test");
const assert = require("node:assert/strict");
const { randomUUID, randomBytes } = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
test(
  "moderation ownership reporting expiry and photo revocation",
  { skip: !process.env.TEST_DATABASE_URL },
  async (t) => {
    const schema = "moderation_" + randomBytes(6).toString("hex");
    Object.assign(process.env, {
      DATABASE_URL: process.env.TEST_DATABASE_URL,
      PGOPTIONS: `-c search_path=${schema},public`,
      ADMIN_EMAIL: "owner@example.test",
      JWT_SECRET: randomBytes(32).toString("hex"),
      SESSION_SECRET: randomBytes(32).toString("hex"),
      GOOGLE_CLIENT_ID: "",
      GOOGLE_CLIENT_SECRET: "",
    });
    const pool = require("../db");
    await pool.query(`CREATE SCHEMA ${schema}`);
    let server;
    let blocks = 0;
    let blockFailure = false;
    const media = {
      readUrl: async (key) => "https://test-photos.example/" + key,
      verify: async () => {},
      uploadUrl: async () => "https://test-upload.example",
      block: async () => {
        blocks++;
        if (blockFailure)
          throw Object.assign(new Error("Test storage failure"), {
            code: "TEST_STORAGE_UNAVAILABLE",
          });
      },
    };
    Object.assign(require("../media"), media);
    const market = require("../marketplace").createMarketplace(pool, media);
    const moderation = require("../moderation").createModeration(
      pool,
      market,
      media,
    );
    try {
      await pool.query(
        fs.readFileSync(
          path.join(__dirname, "../../database/food_rescue_schema.sql"),
          "utf8",
        ),
      );
      for (const file of fs
        .readdirSync(path.join(__dirname, "../../database/migrations"))
        .sort())
        await pool.query(
          fs.readFileSync(
            path.join(__dirname, "../../database/migrations", file),
            "utf8",
          ),
        );
      await pool.query(
        fs.readFileSync(
          path.join(
            __dirname,
            "../../database/migrations/003_listing_moderation.sql",
          ),
          "utf8",
        ),
      );
      const user = async (email, role = "consumer") =>
        (
          await pool.query(
            "INSERT INTO users(email,role,full_name) VALUES($1,$2,'Test account') RETURNING *",
            [email, role],
          )
        ).rows[0];
      const owner = await user("owner@example.test", "admin"),
        impostor = await user("fake-admin@example.test", "admin"),
        vendor = await user("vendor@example.test"),
        customer = await user("customer@example.test"),
        outsider = await user("other@example.test");
      await market.saveVendor(vendor, {
        businessName: "Moderation test vendor",
        address: "Test pickup address",
      });
      const create = async () => {
        const upload = await market.upload(vendor, {
          contentType: "image/jpeg",
          size: 100,
        });
        return market.publish(vendor, {
          title: "Moderation test batch",
          description: "Test fixture only.",
          category: "Meals",
          price: "3.00",
          quantity: 3,
          pickupStart: new Date().toISOString(),
          pickupEnd: new Date(Date.now() + 3600000).toISOString(),
          uploadId: upload.uploadId,
        });
      };
      const listing = await create();
      let reservation;
      await t.test(
        "owners can close listings but cannot close another vendor’s batch",
        async () => {
          const close = await create();
          await assert.rejects(
            market.close(outsider, close.id),
            (e) => e.status === 404,
          );
          await market.close(vendor, close.id);
          assert.equal((await market.get(close.id)).status, "closed");
          assert.ok(!(await market.list()).some((l) => l.id === close.id));
        },
      );
      await t.test(
        "expiry is the pickup end and a record is retained",
        async () => {
          const expired = await create();
          await pool.query(
            "UPDATE listings SET pickup_end_at=now()-interval '1 second' WHERE listing_id=$1",
            [expired.id],
          );
          assert.equal((await market.get(expired.id)).status, "expired");
          assert.ok(!(await market.list()).some((l) => l.id === expired.id));
          await assert.rejects(
            market.reserve(customer, {
              listingId: expired.id,
              quantity: 1,
              requestId: randomUUID(),
            }),
            (e) => e.status === 409,
          );
        },
      );
      await t.test(
        "reports are authenticated idempotent and retain the listing publicly",
        async () => {
          await moderation.report(customer, listing.id, {
            reason: "inappropriate_image",
            details: "Test report, not a real objection.",
          });
          await moderation.report(customer, listing.id, {
            reason: "inappropriate_image",
            details: "Test report updated.",
          });
          assert.equal(
            (await pool.query("SELECT count(*) FROM listing_reports")).rows[0]
              .count,
            "1",
          );
          assert.ok((await market.list()).some((l) => l.id === listing.id));
          await assert.rejects(
            moderation.report(customer, listing.id, { reason: "unknown" }),
            (e) => e.status === 400,
          );
        },
      );
      await t.test(
        "only the configured owner admin can read or remove listings",
        async () => {
          for (const actor of [customer, vendor, impostor]) {
            await assert.rejects(
              moderation.list(actor),
              (e) => e.status === 403,
            );
            await assert.rejects(
              moderation.remove(actor, listing.id, { reason: "Not permitted" }),
              (e) => e.status === 403,
            );
          }
          assert.equal(
            (await moderation.list(owner)).find((l) => l.id === listing.id)
              .reportCount,
            1,
          );
          await assert.rejects(
            moderation.remove(owner, listing.id, { reason: "" }),
            (e) => e.status === 400,
          );
        },
      );
      await t.test(
        "removal hides immediately without deleting reservations; failed photo cleanup can retry",
        async () => {
          reservation = await market.reserve(customer, {
            listingId: listing.id,
            quantity: 1,
            requestId: randomUUID(),
          });
          blockFailure = true;
          const first = await moderation.remove(owner, listing.id, {
            reason: "Inappropriate image reported in test.",
          });
          assert.equal(first.photoBlocked, false);
          await assert.rejects(market.get(listing.id), (e) => e.status === 404);
          assert.ok(!(await market.list()).some((l) => l.id === listing.id));
          await assert.rejects(
            market.close(vendor, listing.id),
            (e) => e.status === 404,
          );
          await assert.rejects(
            market.reserve(outsider, {
              listingId: listing.id,
              quantity: 1,
              requestId: randomUUID(),
            }),
            (e) => e.status === 409,
          );
          assert.equal((await market.reservations(customer)).length, 1);
          assert.ok(
            (await market.reservations(customer))[0].listing_removed_at,
          );
          const owned = (await market.ownListings(vendor)).find(
            (l) => l.id === listing.id,
          );
          assert.equal(owned.photoUrl, null);
          assert.equal(owned.status, "removed");
          blockFailure = false;
          assert.equal(
            (
              await moderation.remove(owner, listing.id, {
                reason: "Retry the same removal.",
              })
            ).photoBlocked,
            true,
          );
          const previousBlocks = blocks;
          await moderation.remove(owner, listing.id, {
            reason: "Repeat removal.",
          });
          assert.equal(blocks, previousBlocks);
          assert.equal(
            (
              await pool.query(
                "SELECT count(*) FROM moderation_actions WHERE action='remove'",
              )
            ).rows[0].count,
            "1",
          );
          await market.changeReservation(
            customer,
            reservation.reservation_id,
            "cancel",
          );
          assert.equal(
            (
              await pool.query(
                "SELECT quantity_available FROM listings WHERE listing_id=$1",
                [listing.id],
              )
            ).rows[0].quantity_available,
            3,
          );
          assert.ok(!(await market.list()).some((l) => l.id === listing.id));
        },
      );
      await t.test(
        "admins can dismiss a mistaken report without removing the listing",
        async () => {
          const keep = await create();
          await moderation.report(customer, keep.id, { reason: "other" });
          await moderation.dismiss(owner, keep.id, {
            reason: "Reviewed: no issue.",
          });
          assert.equal(
            (await moderation.list(owner)).find((l) => l.id === keep.id)
              .reportCount,
            0,
          );
          assert.ok((await market.list()).some((l) => l.id === keep.id));
        },
      );
      await t.test(
        "HTTP admin routes reject forged roles and unauthenticated requests",
        async () => {
          server = require("../server").listen(0, "127.0.0.1");
          await new Promise((r) => server.once("listening", r));
          const base = `http://127.0.0.1:${server.address().port}`;
          const headers = (actor) => ({
            Authorization: "Bearer " + require("../accounts").tokenFor(actor),
            "Content-Type": "application/json",
          });
          assert.equal((await fetch(base + "/admin/listings")).status, 401);
          assert.equal(
            (
              await fetch(base + "/admin/listings", {
                headers: headers(customer),
              })
            ).status,
            403,
          );
          assert.equal(
            (
              await fetch(base + "/admin/listings", {
                headers: headers(impostor),
              })
            ).status,
            403,
          );
          assert.equal(
            (await fetch(base + "/admin/listings", { headers: headers(owner) }))
              .status,
            200,
          );
        },
      );
      await t.test(
        "report and removal racing cannot leave an unresolved report on a hidden listing",
        async () => {
          const raced = await create();
          await Promise.allSettled([
            moderation.report(customer, raced.id, { reason: "other" }),
            moderation.remove(owner, raced.id, { reason: "QA race removal" }),
          ]);
          const open = await pool.query(
            "SELECT count(*) FROM listing_reports WHERE listing_id=$1 AND resolved_at IS NULL",
            [raced.id],
          );
          assert.equal(open.rows[0].count, "0");
        },
      );
    } finally {
      if (server) await new Promise((r) => server.close(r));
      await pool.query(`DROP SCHEMA ${schema} CASCADE`);
      await pool.end();
    }
  },
);
