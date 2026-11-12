const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  applyPreset,
  toInstant,
  localValue,
  sortPickups,
} = require("../../frontend/src/state/pickup-time");
test("presets reuse local clock times on a new date, including daylight saving", () => {
  const p = {
    start_time: "18:00:00",
    end_time: "20:00:00",
    end_next_day: false,
    time_zone: "America/New_York",
  };
  assert.equal(
    applyPreset(p, "2026-11-12").pickupStart,
    "2026-11-12T23:00:00.000Z",
  );
  assert.equal(
    applyPreset(p, "2026-07-12").pickupStart,
    "2026-07-12T22:00:00.000Z",
  );
  assert.equal(
    localValue(
      applyPreset(p, undefined, Date.parse("2026-11-13T02:00Z")).pickupStart,
      p.time_zone,
    ).slice(0, 10),
    "2026-11-13",
  );
  assert.equal(
    applyPreset(
      { ...p, start_time: "23:00", end_time: "01:00", end_next_day: true },
      "2026-11-12",
    ).pickupEnd,
    "2026-11-13T06:00:00.000Z",
  );
});
test("calendar rejects invalid dates and nonexistent DST wall times", () => {
  assert.throws(
    () => toInstant("2026-03-08T02:30", "America/New_York"),
    /daylight/,
  );
  assert.throws(() => toInstant("2026-02-30T12:00", "America/New_York"));
});
test("local pickup history keeps active pickups first and expires exactly at grace end", () => {
  const end = Date.parse("2026-11-12T22:00Z");
  const r = {
    reservation_id: "a",
    status: "reserved",
    pickup_window_end: new Date(end).toISOString(),
    created_at: "2026-11-12T10:00Z",
  };
  assert.equal(sortPickups([r], end + 599999)[0].status, "reserved");
  assert.equal(sortPickups([r], end + 600000)[0].status, "expired");
  const active = {
    ...r,
    reservation_id: "b",
    pickup_window_end: new Date(end + 7200000).toISOString(),
  };
  assert.equal(sortPickups([r, active], end + 600000)[0].reservation_id, "b");
});
