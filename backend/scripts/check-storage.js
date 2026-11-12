const path = require("node:path");
const { randomUUID } = require("node:crypto");
require("dotenv").config({
  path: path.join(__dirname, "../.env"),
  quiet: true,
});
const {
  S3Client,
  PutObjectCommand,
  HeadObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const bucket = process.env.LISTING_PHOTOS_BUCKET,
  region = process.env.AWS_REGION;
const s3 = new S3Client({
  region: region || "us-east-1",
  requestChecksumCalculation: "WHEN_REQUIRED",
});
(async () => {
  let wrote = false;
  const key = `listings/_checks/${randomUUID()}`;
  try {
    if (!bucket || !region)
      throw Object.assign(new Error(), { code: "MISSING_S3_CONFIGURATION" });
    const bytes = Buffer.from("FinalBatch private photo-storage verification.");
    const url = await getSignedUrl(
      s3,
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        ContentType: "application/octet-stream",
        ContentLength: bytes.length,
        IfNoneMatch: "*",
      }),
      { expiresIn: 120 },
    );
    const put = await fetch(url, {
      method: "PUT",
      headers: {
        "Content-Type": "application/octet-stream",
        "If-None-Match": "*",
      },
      body: bytes,
      signal: AbortSignal.timeout(20000),
    });
    if (!put.ok)
      throw Object.assign(new Error(), {
        code: `SIGNED_UPLOAD_HTTP_${put.status}`,
      });
    wrote = true;
    const second = await fetch(url, {
      method: "PUT",
      headers: {
        "Content-Type": "application/octet-stream",
        "If-None-Match": "*",
      },
      body: bytes,
      signal: AbortSignal.timeout(20000),
    });
    if (second.status !== 412)
      throw Object.assign(new Error(), {
        code: "PHOTO_WRITE_ONCE_CHECK_FAILED",
      });
    const head = await s3.send(
      new HeadObjectCommand({ Bucket: bucket, Key: key }),
    );
    if (head.ContentLength !== bytes.length)
      throw Object.assign(new Error(), { code: "STORAGE_SIZE_MISMATCH" });
    const read = await getSignedUrl(
      s3,
      new GetObjectCommand({ Bucket: bucket, Key: key }),
      { expiresIn: 120 },
    );
    const response = await fetch(read, { signal: AbortSignal.timeout(20000) });
    if (
      !response.ok ||
      !Buffer.from(await response.arrayBuffer()).equals(bytes)
    )
      throw Object.assign(new Error(), { code: "SIGNED_DOWNLOAD_FAILED" });
    console.log(
      "S3 verified: signed upload, metadata check and signed download passed.",
    );
  } catch (e) {
    const code = e.Code || e.code || e.name;
    console.error("S3 check failed:", code);
    if (/Credential|Token|Expired|InvalidClient|Signature/.test(code))
      console.error(
        "On your Mac, renew access with aws login --profile finalbatch. Confirm backend/.env has AWS_PROFILE=finalbatch.",
      );
    if (code === "AccessDenied")
      console.error(
        "Check the backend IAM user/role policy for this private bucket.",
      );
    if (code === "MISSING_S3_CONFIGURATION")
      console.error(
        "Set LISTING_PHOTOS_BUCKET and AWS_REGION in backend/.env.",
      );
    process.exitCode = 1;
  } finally {
    if (wrote) {
      try {
        await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
        console.log("Temporary verification object removed.");
      } catch {
        console.error(
          "Could not remove the temporary listings/_checks/ object; remove it from S3 manually.",
        );
        process.exitCode = 1;
      }
    }
    s3.destroy();
  }
})();
