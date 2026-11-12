const { test } = require("node:test");
const assert = require("node:assert/strict");
test("S3 browser uploads do not sign an empty-body checksum", async () => {
  Object.assign(process.env, {
    AWS_ACCESS_KEY_ID: "test-only-key",
    AWS_SECRET_ACCESS_KEY: "test-only-secret",
    AWS_REGION: "us-east-1",
    LISTING_PHOTOS_BUCKET: "finalbatch-test-photos",
  });
  const media = require("../media");
  const upload = new URL(
    await media.uploadUrl("listings/test/photo", "image/jpeg", 1000),
  );
  assert.equal(upload.searchParams.get("X-Amz-Expires"), "300");
  assert.equal(upload.searchParams.has("x-amz-checksum-crc32"), false);
  assert.equal(upload.pathname, "/listings/test/photo");
  assert.ok(
    upload.searchParams.get("X-Amz-SignedHeaders").includes("if-none-match"),
  );
  const read = new URL(await media.readUrl("listings/test/photo"));
  assert.equal(read.searchParams.get("X-Amz-Expires"), "3600");
});
