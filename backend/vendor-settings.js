const { fail, uuid } = require("./marketplace");
function presetInput(body) {
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name || name.length > 40)
    fail(400, "Name your pickup preset (up to 40 characters).");
  for (const field of ["startTime", "endTime"])
    if (
      typeof body[field] !== "string" ||
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(body[field])
    )
      fail(400, "Choose valid pickup times.");
  if (
    typeof body.endNextDay !== "boolean" ||
    typeof body.isDefault !== "boolean"
  )
    fail(400, "Choose the preset options.");
  if (!body.endNextDay && body.endTime <= body.startTime)
    fail(
      400,
      "Pickup end must be after its start. Use next day for overnight pickups.",
    );
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: body.timeZone }).format();
  } catch {
    fail(400, "Choose a valid time zone.");
  }
  if (typeof body.timeZone !== "string" || body.timeZone.length > 100)
    fail(400, "Choose a valid time zone.");
  return { ...body, name };
}
function createVendorSettings(pool, market) {
  async function vendor(user) {
    const v = await market.vendor(user);
    if (!v) fail(403, "Set up your vendor profile first.");
    return v;
  }
  return {
    async list(user) {
      const v = await vendor(user);
      return (
        await pool.query(
          "SELECT * FROM vendor_pickup_presets WHERE vendor_id=$1 ORDER BY is_default DESC,created_at",
          [v.vendor_id],
        )
      ).rows;
    },
    async save(user, body) {
      const p = presetInput(body),
        v = await vendor(user),
        client = await pool.connect();
      try {
        await client.query("BEGIN");
        await client.query(
          "SELECT vendor_id FROM vendors WHERE vendor_id=$1 FOR UPDATE",
          [v.vendor_id],
        );
        const existing = (
          await client.query(
            "SELECT preset_id FROM vendor_pickup_presets WHERE vendor_id=$1 AND lower(name)=lower($2)",
            [v.vendor_id, p.name],
          )
        ).rows[0];
        const count = Number(
          (
            await client.query(
              "SELECT count(*) FROM vendor_pickup_presets WHERE vendor_id=$1",
              [v.vendor_id],
            )
          ).rows[0].count,
        );
        if (!existing && count >= 10)
          fail(400, "You can save up to 10 pickup presets. Remove one first.");
        if (p.isDefault)
          await client.query(
            "UPDATE vendor_pickup_presets SET is_default=FALSE WHERE vendor_id=$1",
            [v.vendor_id],
          );
        const {
          rows: [saved],
        } = await client.query(
          `INSERT INTO vendor_pickup_presets(vendor_id,name,start_time,end_time,end_next_day,time_zone,is_default) VALUES($1,$2,$3,$4,$5,$6,$7)
          ON CONFLICT(vendor_id,lower(name)) DO UPDATE SET start_time=EXCLUDED.start_time,end_time=EXCLUDED.end_time,end_next_day=EXCLUDED.end_next_day,time_zone=EXCLUDED.time_zone,is_default=EXCLUDED.is_default RETURNING *`,
          [
            v.vendor_id,
            p.name,
            p.startTime,
            p.endTime,
            p.endNextDay,
            p.timeZone,
            p.isDefault || count === 0,
          ],
        );
        await client.query("COMMIT");
        return saved;
      } catch (e) {
        await client.query("ROLLBACK");
        throw e;
      } finally {
        client.release();
      }
    },
    async remove(user, id) {
      const v = await vendor(user);
      const r = await pool.query(
        "DELETE FROM vendor_pickup_presets WHERE preset_id=$1 AND vendor_id=$2",
        [uuid(id), v.vendor_id],
      );
      if (!r.rowCount) fail(404, "Pickup preset not found.");
    },
  };
}
module.exports = { createVendorSettings, presetInput };
