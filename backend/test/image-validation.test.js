const { test } = require("node:test");
const assert = require("node:assert/strict");
const { validateImage } = require("../image-validation");
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jw1sAAAAASUVORK5CYII=",
  "base64",
);
test("accepts PNG headers and checks actual type rather than filename", () => {
  assert.deepEqual(validateImage(png, "image/png"), { width: 1, height: 1 });
  assert.throws(
    () => validateImage(png, "image/jpeg"),
    (e) => e.status === 400,
  );
});
test("rejects PDFs SVGs text and unreasonable dimensions", () => {
  for (const bytes of [
    Buffer.from("%PDF-1.7 fake.jpg"),
    Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>'),
    Buffer.from("not an image"),
  ])
    assert.throws(
      () => validateImage(bytes, "image/jpeg"),
      (e) => e.status === 400,
    );
  const big = Buffer.from(png);
  big.writeUInt32BE(20000, 16);
  assert.throws(
    () => validateImage(big, "image/png"),
    (e) => e.status === 400,
  );
});
