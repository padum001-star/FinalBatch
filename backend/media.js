const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
} = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { fail } = require("./marketplace");
const client = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
  requestChecksumCalculation: "WHEN_REQUIRED",
});
const bucket = () => {
  if (!process.env.LISTING_PHOTOS_BUCKET)
    fail(503, "Photo uploads need server storage configuration.");
  return process.env.LISTING_PHOTOS_BUCKET;
};
module.exports = {
  readUrl: (key) =>
    getSignedUrl(
      client,
      new GetObjectCommand({
        Bucket: bucket(),
        Key: key,
        ResponseCacheControl: "no-store",
      }),
      {
        expiresIn: 3600,
      },
    ),
  uploadUrl: (key, type, size) =>
    getSignedUrl(
      client,
      new PutObjectCommand({
        Bucket: bucket(),
        Key: key,
        ContentType: type,
        ContentLength: size,
        IfNoneMatch: "*",
      }),
      { expiresIn: 300 },
    ),
  async block(key) {
    await client.send(
      new PutObjectCommand({
        Bucket: bucket(),
        Key: key,
        Body: Buffer.alloc(0),
        ContentType: "application/octet-stream",
        CacheControl: "no-store",
        Metadata: { moderated: "true" },
      }),
    );
  },
  async verify(upload) {
    let head;
    try {
      head = await client.send(
        new HeadObjectCommand({ Bucket: bucket(), Key: upload.object_key }),
      );
    } catch (e) {
      if (e.$metadata?.httpStatusCode === 404)
        fail(400, "Photo upload is incomplete. Please try again.");
      throw e;
    }
    if (
      head.ContentLength !== upload.byte_size ||
      head.ContentType !== upload.content_type
    )
      fail(400, "Uploaded photo does not match the selected file.");
    const file = await client.send(
      new GetObjectCommand({ Bucket: bucket(), Key: upload.object_key }),
    );
    const bytes = await file.Body.transformToByteArray();
    if (bytes.length !== upload.byte_size || bytes.length > 8388608)
      fail(400, "Photo size changed after upload. Choose the photo again.");
    require("./image-validation").validateImage(bytes, upload.content_type);
  },
};
