const pad = (n) => String(n).padStart(2, "0");
function parts(value, timeZone) {
  const values = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(value));
  return Object.fromEntries(
    values.filter((p) => p.type !== "literal").map((p) => [p.type, p.value]),
  );
}
function localValue(value, timeZone) {
  const p = parts(value, timeZone);
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}
function toInstant(wall, timeZone) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(wall))
    throw new Error("Choose a date and time.");
  const desired = Date.parse(wall + "Z");
  let guess = desired;
  for (let i = 0; i < 4; i++) {
    const asWall = Date.parse(localValue(guess, timeZone) + "Z");
    const delta = desired - asWall;
    if (!delta) break;
    guess += delta;
  }
  if (!Number.isFinite(guess) || localValue(guess, timeZone) !== wall)
    throw new Error(
      "That local time is unavailable because of daylight saving. Choose another time.",
    );
  return new Date(guess).toISOString();
}
function dateAfter(date, days) {
  const d = new Date(date + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}
function applyPreset(preset, selectedDate, now = Date.now()) {
  const zone = preset.time_zone;
  let date = selectedDate || localValue(now, zone).slice(0, 10);
  const window = () => ({
    pickupStart: toInstant(`${date}T${preset.start_time.slice(0, 5)}`, zone),
    pickupEnd: toInstant(
      `${dateAfter(date, preset.end_next_day ? 1 : 0)}T${preset.end_time.slice(0, 5)}`,
      zone,
    ),
  });
  let result = window();
  if (!selectedDate && +new Date(result.pickupEnd) <= now) {
    date = dateAfter(date, 1);
    result = window();
  }
  return result;
}
function defaultWindow(now = Date.now()) {
  const start = new Date(now);
  start.setMinutes(Math.ceil(start.getMinutes() / 15) * 15, 0, 0);
  return {
    pickupStart: start.toISOString(),
    pickupEnd: new Date(+start + 2 * 3600000).toISOString(),
  };
}
function effectiveReservation(row, now = Date.now()) {
  return row.status === "reserved" &&
    +new Date(row.expires_at || +new Date(row.pickup_window_end) + 600000) <=
      now
    ? { ...row, status: "expired", closed_reason: "pickup_timeout" }
    : row;
}
function sortPickups(rows, now = Date.now()) {
  return rows
    .map((r) => effectiveReservation(r, now))
    .sort(
      (a, b) =>
        (b.status === "reserved") - (a.status === "reserved") ||
        (a.status === "reserved"
          ? +new Date(a.pickup_window_end) - +new Date(b.pickup_window_end)
          : +new Date(b.created_at) - +new Date(a.created_at)),
    );
}
module.exports = {
  parts,
  localValue,
  toInstant,
  dateAfter,
  applyPreset,
  defaultWindow,
  effectiveReservation,
  sortPickups,
};
