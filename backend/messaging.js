const { fail, uuid } = require("./marketplace");
const { randomUUID } = require("node:crypto");
const SELECT = `SELECT c.*,it.name AS item_name,v.business_name,v.user_id AS vendor_user_id,u.full_name AS customer_name
 FROM conversations c JOIN listings l ON l.listing_id=c.listing_id JOIN item_templates it ON it.item_template_id=l.item_template_id JOIN vendors v ON v.vendor_id=l.vendor_id JOIN users u ON u.user_id=c.customer_id`;
function createMessaging(pool) {
  async function participant(user, id) {
    const {
      rows: [c],
    } = await pool.query(
      `${SELECT} WHERE c.conversation_id=$1 AND (c.customer_id=$2 OR v.user_id=$2)`,
      [uuid(id), user.user_id],
    );
    if (!c) fail(404, "Conversation not found.");
    return c;
  }
  return {
    async list(user) {
      return (
        await pool.query(
          `${SELECT.replace("SELECT c.*", "SELECT c.*,latest.last_message,latest.last_message_at")} LEFT JOIN LATERAL (SELECT body AS last_message,created_at AS last_message_at FROM messages WHERE conversation_id=c.conversation_id ORDER BY created_at DESC,message_id DESC LIMIT 1) latest ON TRUE
      WHERE c.customer_id=$1 OR v.user_id=$1 ORDER BY COALESCE(latest.last_message_at,c.created_at) DESC LIMIT 200`,
          [user.user_id],
        )
      ).rows;
    },
    async open(user, body) {
      let listingId, customerId;
      if (body.reservationId) {
        const {
          rows: [r],
        } = await pool.query(
          `SELECT r.listing_id,r.user_id FROM reservations r JOIN listings l ON l.listing_id=r.listing_id JOIN vendors v ON v.vendor_id=l.vendor_id WHERE r.reservation_id=$1 AND (r.user_id=$2 OR v.user_id=$2)`,
          [uuid(body.reservationId), user.user_id],
        );
        if (!r) fail(404, "Reservation not found.");
        listingId = r.listing_id;
        customerId = r.user_id;
      } else {
        listingId = uuid(body.listingId);
        customerId = user.user_id;
        const {
          rows: [l],
        } = await pool.query(
          "SELECT l.*,v.user_id AS owner_id FROM listings l JOIN vendors v ON v.vendor_id=l.vendor_id WHERE l.listing_id=$1 AND l.published_by_vendor",
          [listingId],
        );
        if (!l || l.owner_id === user.user_id)
          fail(404, "Choose a listing from another vendor.");
        const existing = (
          await pool.query(
            "SELECT conversation_id FROM conversations WHERE listing_id=$1 AND customer_id=$2",
            [listingId, customerId],
          )
        ).rows[0];
        if (existing) return participant(user, existing.conversation_id);
        if (
          l.removed_at ||
          l.status !== "active" ||
          +new Date(l.pickup_end_at) <= Date.now()
        )
          fail(
            409,
            "This listing is no longer available. Message from your pickup history instead.",
          );
      }
      const {
        rows: [c],
      } = await pool.query(
        `INSERT INTO conversations(listing_id,customer_id) VALUES($1,$2) ON CONFLICT(listing_id,customer_id) DO UPDATE SET listing_id=EXCLUDED.listing_id RETURNING conversation_id`,
        [listingId, customerId],
      );
      return participant(user, c.conversation_id);
    },
    async history(user, id, before) {
      const conversation = await participant(user, id);
      if (before) {
        uuid(before);
        const { rowCount } = await pool.query(
          "SELECT 1 FROM messages WHERE message_id=$1 AND conversation_id=$2",
          [before, id],
        );
        if (!rowCount) fail(400, "Invalid message cursor.");
      }
      const { rows } = await pool.query(
        `SELECT * FROM messages WHERE conversation_id=$1 ${before ? "AND (created_at,message_id)<(SELECT created_at,message_id FROM messages WHERE message_id=$2)" : ""} ORDER BY created_at DESC,message_id DESC LIMIT 51`,
        before ? [id, before] : [id],
      );
      const hasMore = rows.length > 50;
      const page = rows.slice(0, 50);
      return {
        conversation,
        messages: page.reverse(),
        nextCursor: hasMore ? page[0].message_id : null,
      };
    },
    async send(user, id, body) {
      await participant(user, id);
      const clientId = uuid(body.clientMessageId),
        content = typeof body.body === "string" ? body.body.trim() : "";
      if (!content || content.length > 2000)
        fail(400, "Write a message of up to 2,000 characters.");
      const {
        rows: [m],
      } = await pool.query(
        `INSERT INTO messages(message_id,conversation_id,sender_id,client_message_id,body) VALUES($1,$2,$3,$4,$5) ON CONFLICT(conversation_id,sender_id,client_message_id) DO UPDATE SET client_message_id=EXCLUDED.client_message_id RETURNING *`,
        [randomUUID(), uuid(id), user.user_id, clientId, content],
      );
      if (m.body !== content)
        fail(409, "This send request was already used for another message.");
      return m;
    },
  };
}
module.exports = { createMessaging };
