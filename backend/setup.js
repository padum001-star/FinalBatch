const expected = {
  users: ["user_id", "full_name", "role"],
  vendors: ["vendor_id", "user_id", "business_name", "latitude", "longitude"],
  vendor_pickup_presets: [
    "preset_id",
    "vendor_id",
    "start_time",
    "end_time",
    "time_zone",
    "is_default",
  ],
  conversations: ["conversation_id", "listing_id", "customer_id"],
  messages: [
    "message_id",
    "conversation_id",
    "sender_id",
    "client_message_id",
    "body",
  ],
  listings: [
    "published_by_vendor",
    "description",
    "category",
    "original_price",
    "photo_key",
    "pickup_start_at",
    "pickup_end_at",
    "upload_id",
    "removed_at",
    "removed_by",
    "removal_reason",
    "photo_blocked_at",
  ],
  listing_uploads: [
    "upload_id",
    "user_id",
    "object_key",
    "content_type",
    "byte_size",
  ],
  reservations: [
    "reservation_id",
    "user_id",
    "listing_id",
    "request_id",
    "quantity",
    "unit_price",
    "closed_reason",
    "status",
  ],
  listing_reports: ["report_id", "listing_id", "reporter_id", "resolved_at"],
  moderation_actions: ["action_id", "listing_id", "actor_id", "reason"],
  saved_places: ["user_id", "place_id"],
};
async function inspectMarketplace(pool) {
  const { rows } = await pool.query(
    "SELECT table_name,column_name FROM information_schema.columns WHERE table_schema=current_schema() AND table_name=ANY($1::text[])",
    [Object.keys(expected)],
  );
  const known = new Set(rows.map((r) => `${r.table_name}.${r.column_name}`));
  const missing = Object.entries(expected).flatMap(([table, cols]) =>
    cols
      .filter((col) => !known.has(`${table}.${col}`))
      .map((col) => `${table}.${col}`),
  );
  const indexes = await pool.query(
    "SELECT indexname FROM pg_indexes WHERE schemaname=current_schema() AND tablename='vendors' AND indexname='vendors_user_unique'",
  );
  if (!indexes.rowCount) missing.push("vendors_user_unique");
  return { ready: missing.length === 0, missing };
}
module.exports = { inspectMarketplace };
