const { randomUUID } = require("node:crypto");
const CATEGORIES = [
  "Bakery",
  "Café",
  "Restaurant",
  "Produce",
  "Meals",
  "Other",
];
const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function fail(status, message) {
  const error = new Error(message);
  error.status = status;
  error.public = true;
  throw error;
}
function text(value, max, label) {
  if (typeof value !== "string" || !value.trim() || value.trim().length > max)
    fail(400, `Enter ${label} (up to ${max} characters).`);
  return value.trim();
}
function uuid(value) {
  if (typeof value !== "string" || !UUID.test(value))
    fail(400, "Invalid identifier.");
  return value;
}
function money(value) {
  if (typeof value !== "string" || !/^\d{1,4}(\.\d{1,2})?$/.test(value))
    fail(400, "Enter a price with at most two decimal places.");
  return Math.round(Number(value) * 100);
}
function listingInput(body) {
  const title = text(body.title, 150, "an item name");
  const description = text(
    body.description,
    1500,
    "a description, including any allergen information",
  );
  if (!CATEGORIES.includes(body.category)) fail(400, "Choose a category.");
  if (
    !Number.isInteger(body.quantity) ||
    body.quantity < 1 ||
    body.quantity > 10000
  )
    fail(400, "Quantity must be a whole number between 1 and 10,000.");
  const price = money(body.price);
  const original = body.originalPrice ? money(body.originalPrice) : null;
  if (original !== null && original < price)
    fail(400, "Original price cannot be less than the listing price.");
  const start = new Date(body.pickupStart),
    end = new Date(body.pickupEnd);
  if (
    !Number.isFinite(+start) ||
    !Number.isFinite(+end) ||
    +end <= +start ||
    +end <= Date.now() ||
    +end - Date.now() > 31 * 86400000
  )
    fail(
      400,
      "Choose a pickup window ending within the next 31 days, after its start.",
    );
  return {
    title,
    description,
    category: body.category,
    quantity: body.quantity,
    price: price / 100,
    original: original === null ? null : original / 100,
    start,
    end,
    uploadId: uuid(body.uploadId),
  };
}
const SELECT = `SELECT l.*,it.name AS item_name,v.business_name,v.user_id AS owner_id,v.address,v.email AS vendor_email,v.phone AS vendor_phone,v.vendor_id,v.latitude,v.longitude
 FROM listings l JOIN vendors v ON v.vendor_id=l.vendor_id JOIN item_templates it ON it.item_template_id=l.item_template_id`;
function createMarketplace(pool, media) {
  // Reconcile only the requesting account's due pickups. No always-running worker.
  async function expireReservations(user) {
    await pool.query(
      `UPDATE reservations r SET status='expired',closed_reason='pickup_timeout',updated_at=now()
      FROM listings l JOIN vendors v ON v.vendor_id=l.vendor_id
      WHERE r.listing_id=l.listing_id AND r.status='reserved' AND l.pickup_end_at + interval '10 minutes' <= clock_timestamp()
      AND (r.user_id=$1 OR v.user_id=$1)`,
      [user.user_id],
    );
  }
  async function dto(row) {
    return {
      id: row.listing_id,
      vendorId: row.vendor_id,
      ownerId: row.owner_id,
      itemName: row.item_name,
      vendorName: row.business_name,
      description: row.description,
      tag: row.category,
      price: Number(row.price),
      originalPrice:
        row.original_price === null ? null : Number(row.original_price),
      quantity: row.quantity_available,
      pickupStart: row.pickup_start_at,
      pickupEnd: row.pickup_end_at,
      createdAt: row.created_at,
      status: row.removed_at
        ? "removed"
        : row.status === "active" && +new Date(row.pickup_end_at) <= Date.now()
          ? "expired"
          : row.status === "active" && row.quantity_available === 0
            ? "sold_out"
            : row.status,
      expiresAt: row.pickup_end_at,
      removalReason: row.removed_at ? row.removal_reason : null,
      photoUrl:
        row.photo_key && !row.removed_at
          ? await media.readUrl(row.photo_key)
          : null,
      address: row.address,
      location:
        row.latitude !== null && row.longitude !== null
          ? { latitude: Number(row.latitude), longitude: Number(row.longitude) }
          : null,
      contact: { email: row.vendor_email, phone: row.vendor_phone },
    };
  }
  return {
    toDto: dto,
    async list() {
      const { rows } = await pool.query(
        `${SELECT} WHERE l.published_by_vendor AND l.removed_at IS NULL AND l.status='active' AND l.quantity_available>0 AND l.pickup_end_at>now() ORDER BY l.created_at DESC LIMIT 200`,
      );
      return Promise.all(rows.map(dto));
    },
    async get(id) {
      const {
        rows: [row],
      } = await pool.query(
        `${SELECT} WHERE l.listing_id=$1 AND l.published_by_vendor AND l.removed_at IS NULL`,
        [uuid(id)],
      );
      if (!row) fail(404, "Listing not found.");
      return dto(row);
    },
    async vendor(user) {
      const {
        rows: [row],
      } = await pool.query("SELECT * FROM vendors WHERE user_id=$1", [
        user.user_id,
      ]);
      return row || null;
    },
    async saveVendor(user, body) {
      if (user.role === "admin")
        fail(403, "Use a vendor account to publish listings.");
      const name = text(body.businessName, 150, "your business name"),
        address = text(body.address, 255, "a pickup address");
      const phone = body.phone ? text(body.phone, 20, "a phone number") : null;
      if (phone && !/^[+\d ()-]{5,20}$/.test(phone))
        fail(400, "Enter a valid contact phone number.");
      const supplied =
        Object.prototype.hasOwnProperty.call(body, "latitude") ||
        Object.prototype.hasOwnProperty.call(body, "longitude");
      const lat = body.latitude,
        lon = body.longitude;
      if (
        supplied &&
        !(lat === null && lon === null) &&
        !(
          typeof lat === "number" &&
          Number.isFinite(lat) &&
          Math.abs(lat) <= 90 &&
          typeof lon === "number" &&
          Number.isFinite(lon) &&
          Math.abs(lon) <= 180
        )
      )
        fail(400, "Choose a valid shop location.");
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const {
          rows: [vendor],
        } = await client.query(
          `INSERT INTO vendors(user_id,business_name,email,address,phone,latitude,longitude) VALUES($1,$2,$3,$4,$5,$6,$7)
          ON CONFLICT(user_id) DO UPDATE SET business_name=EXCLUDED.business_name,address=EXCLUDED.address,phone=EXCLUDED.phone,latitude=CASE WHEN $8 THEN EXCLUDED.latitude ELSE vendors.latitude END,longitude=CASE WHEN $8 THEN EXCLUDED.longitude ELSE vendors.longitude END RETURNING *`,
          [
            user.user_id,
            name,
            user.email,
            address,
            phone,
            supplied ? lat : null,
            supplied ? lon : null,
            supplied,
          ],
        );
        await client.query("UPDATE users SET role='vendor' WHERE user_id=$1", [
          user.user_id,
        ]);
        await client.query("COMMIT");
        return vendor;
      } catch (e) {
        await client.query("ROLLBACK");
        throw e;
      } finally {
        client.release();
      }
    },
    async upload(user, body) {
      if (!(await this.vendor(user)))
        fail(403, "Set up your vendor profile first.");
      if (
        !["image/jpeg", "image/png", "image/webp"].includes(body.contentType) ||
        !Number.isInteger(body.size) ||
        body.size < 1 ||
        body.size > 8388608
      )
        fail(400, "Choose a JPEG, PNG, or WebP photo under 8 MB.");
      const id = randomUUID(),
        key = `listings/${user.user_id}/${id}`;
      const uploadUrl = await media.uploadUrl(key, body.contentType, body.size);
      await pool.query(
        "INSERT INTO listing_uploads(upload_id,user_id,object_key,content_type,byte_size) VALUES($1,$2,$3,$4,$5)",
        [id, user.user_id, key, body.contentType, body.size],
      );
      return {
        uploadId: id,
        uploadUrl,
        headers: { "Content-Type": body.contentType, "If-None-Match": "*" },
      };
    },
    async publish(user, body) {
      const input = listingInput(body),
        vendor = await this.vendor(user);
      if (!vendor) fail(403, "Set up your vendor profile first.");
      const {
        rows: [upload],
      } = await pool.query(
        "SELECT * FROM listing_uploads WHERE upload_id=$1 AND user_id=$2",
        [input.uploadId, user.user_id],
      );
      if (!upload) fail(400, "Upload your listing photo first.");
      const {
        rows: [existing],
      } = await pool.query(
        "SELECT listing_id FROM listings WHERE upload_id=$1 AND vendor_id=$2",
        [input.uploadId, vendor.vendor_id],
      );
      if (existing) return this.get(existing.listing_id);
      await media.verify(upload);
      const client = await pool.connect();
      let listing;
      try {
        await client.query("BEGIN");
        const {
          rows: [item],
        } = await client.query(
          "INSERT INTO item_templates(vendor_id,name,default_price) VALUES($1,$2,$3) RETURNING item_template_id",
          [vendor.vendor_id, input.title, input.price],
        );
        const {
          rows: [row],
        } = await client.query(
          `INSERT INTO listings(vendor_id,item_template_id,quantity_available,price,pickup_window_start,pickup_window_end,description,category,original_price,photo_key,published_by_vendor,pickup_start_at,pickup_end_at,upload_id)
          VALUES($1,$2,$3,$4,$5::timestamptz AT TIME ZONE 'UTC',$6::timestamptz AT TIME ZONE 'UTC',$7,$8,$9,$10,TRUE,$5::timestamptz,$6::timestamptz,$11) RETURNING listing_id`,
          [
            vendor.vendor_id,
            item.item_template_id,
            input.quantity,
            input.price,
            input.start,
            input.end,
            input.description,
            input.category,
            input.original,
            upload.object_key,
            input.uploadId,
          ],
        );
        listing = row.listing_id;
        await client.query("COMMIT");
      } catch (e) {
        await client.query("ROLLBACK");
        if (e.code === "23505") {
          const {
            rows: [saved],
          } = await client.query(
            "SELECT listing_id FROM listings WHERE upload_id=$1 AND vendor_id=$2",
            [input.uploadId, vendor.vendor_id],
          );
          if (saved) listing = saved.listing_id;
          else throw e;
        } else throw e;
      } finally {
        client.release();
      }
      return this.get(listing);
    },
    async ownListings(user) {
      const { rows } = await pool.query(
        `${SELECT} WHERE v.user_id=$1 AND l.published_by_vendor ORDER BY l.created_at DESC`,
        [user.user_id],
      );
      return Promise.all(rows.map(dto));
    },
    async close(user, id) {
      const { rowCount } = await pool.query(
        `UPDATE listings l SET status='closed',updated_at=now() FROM vendors v WHERE l.vendor_id=v.vendor_id AND v.user_id=$1 AND l.listing_id=$2 AND l.published_by_vendor AND l.removed_at IS NULL`,
        [user.user_id, uuid(id)],
      );
      if (!rowCount) fail(404, "Listing not found.");
    },
    async reserve(user, body) {
      await expireReservations(user);
      const id = uuid(body.listingId),
        requestId = uuid(body.requestId),
        quantity = body.quantity;
      if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100)
        fail(400, "Reserve between 1 and 100 items.");
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        // Serialize same-user retries, even if they target different listings.
        await client.query(
          "SELECT user_id FROM users WHERE user_id=$1 FOR UPDATE",
          [user.user_id],
        );
        const {
          rows: [previous],
        } = await client.query(
          "SELECT * FROM reservations WHERE user_id=$1 AND request_id=$2",
          [user.user_id, requestId],
        );
        if (previous) {
          if (previous.listing_id !== id || previous.quantity !== quantity)
            fail(
              409,
              "This request was already used for a different reservation.",
            );
          await client.query("COMMIT");
          return previous;
        }
        const {
          rows: [listing],
        } = await client.query(
          `SELECT l.*,v.user_id AS owner_id FROM listings l JOIN vendors v ON v.vendor_id=l.vendor_id WHERE l.listing_id=$1 AND l.published_by_vendor FOR UPDATE OF l`,
          [id],
        );
        if (!listing) fail(404, "Listing not found.");
        if (listing.owner_id === user.user_id)
          fail(400, "You cannot reserve your own listing.");
        if (
          listing.status !== "active" ||
          +new Date(listing.pickup_end_at) <= Date.now() ||
          listing.quantity_available < quantity
        )
          fail(
            409,
            "This quantity is no longer available. Refresh the listing.",
          );
        const {
          rows: [reservation],
        } = await client.query(
          "INSERT INTO reservations(user_id,listing_id,request_id,quantity,unit_price) VALUES($1,$2,$3,$4,$5) RETURNING *",
          [user.user_id, id, requestId, quantity, listing.price],
        );
        await client.query(
          "UPDATE listings SET quantity_available=quantity_available-$1,updated_at=now() WHERE listing_id=$2",
          [quantity, id],
        );
        await client.query("COMMIT");
        return reservation;
      } catch (e) {
        await client.query("ROLLBACK");
        throw e;
      } finally {
        client.release();
      }
    },
    async reservations(user, vendor = false) {
      await expireReservations(user);
      const { rows } = await pool.query(
        `SELECT r.*,l.pickup_end_at + interval '10 minutes' AS expires_at,l.removed_at AS listing_removed_at,l.removal_reason,l.status AS listing_status,it.name AS item_name,v.business_name,v.email AS vendor_email,v.phone AS vendor_phone,v.address,u.full_name AS customer_name,l.pickup_start_at AS pickup_window_start,l.pickup_end_at AS pickup_window_end
        FROM reservations r JOIN listings l ON l.listing_id=r.listing_id JOIN item_templates it ON it.item_template_id=l.item_template_id JOIN vendors v ON v.vendor_id=l.vendor_id JOIN users u ON u.user_id=r.user_id
        WHERE ${vendor ? "v.user_id" : "r.user_id"}=$1 ORDER BY (r.status='reserved') DESC,CASE WHEN r.status='reserved' THEN l.pickup_end_at END ASC,r.created_at DESC LIMIT 200`,
        [user.user_id],
      );
      return rows;
    },
    async changeReservation(user, id, action) {
      uuid(id);
      if (!["cancel", "collect"].includes(action))
        fail(400, "Invalid reservation action.");
      const client = await pool.connect();
      let committed = false;
      try {
        await client.query("BEGIN");
        const {
          rows: [r],
        } = await client.query(
          `SELECT r.*,l.pickup_end_at,v.user_id AS owner_id FROM reservations r JOIN listings l ON l.listing_id=r.listing_id JOIN vendors v ON v.vendor_id=l.vendor_id WHERE r.reservation_id=$1 FOR UPDATE OF r`,
          [id],
        );
        if (
          !r ||
          (action === "cancel" ? r.user_id : r.owner_id) !== user.user_id
        )
          fail(404, "Reservation not found.");
        const checkedAt = Date.now();
        const overdue = +new Date(r.pickup_end_at) + 600000 <= checkedAt;
        if (r.status === "reserved" && overdue) {
          await client.query(
            "UPDATE reservations SET status='expired',closed_reason='pickup_timeout',updated_at=now() WHERE reservation_id=$1",
            [id],
          );
          await client.query("COMMIT");
          committed = true;
          fail(
            409,
            "The 10-minute pickup grace period has ended. This reservation has expired.",
          );
        }
        const target = action === "cancel" ? "cancelled" : "collected";
        if (r.status !== target) {
          if (r.status !== "reserved")
            fail(409, "This reservation has already been closed.");
          await client.query(
            "UPDATE reservations SET status=$1,closed_reason=$2,updated_at=now() WHERE reservation_id=$3",
            [target, action === "cancel" ? "customer_cancelled" : null, id],
          );
          // Expired food must never become reservable inventory again.
          if (action === "cancel" && +new Date(r.pickup_end_at) > checkedAt)
            await client.query(
              "UPDATE listings SET quantity_available=quantity_available+$1,updated_at=now() WHERE listing_id=$2",
              [r.quantity, r.listing_id],
            );
        }
        await client.query("COMMIT");
        committed = true;
        return { status: target };
      } catch (e) {
        if (!committed) await client.query("ROLLBACK");
        throw e;
      } finally {
        client.release();
      }
    },
  };
}
module.exports = { createMarketplace, listingInput, uuid, fail };
