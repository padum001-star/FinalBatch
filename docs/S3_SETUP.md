# FinalBatch S3 setup

The private listing-photo bucket is configured for this Mac and has passed a real signed upload, metadata check, signed download, and cleanup. It uses us-east-1, bucket-owner-enforced ownership, block-public-access, default S3 encryption, and browser CORS for localhost/127.0.0.1 on ports 8081 and 8082. It is not a public website bucket.

## Where the settings belong

`backend/.env` contains the actual `LISTING_PHOTOS_BUCKET`, `AWS_REGION=us-east-1`, and `AWS_PROFILE=finalbatch`. Existing database/authentication settings are retained. The bucket name is a plain name, not an `s3://` or HTTPS URL.

`frontend/.env` continues to contain only `EXPO_PUBLIC_API_URL` for this connection. Never add AWS secret access keys or session tokens to the mobile app. The backend signs temporary upload/read URLs and the app transfers photos directly to S3.

Credentials are provided through the local named profile created with `aws login --profile finalbatch`. Renew that browser login if local AWS credentials expire. A local profile is only for this Mac. When deploying to Lambda/EC2, use the function execution role/instance role, remove `AWS_PROFILE` from that hosted environment, and set bucket/region there. Do not copy local AWS credentials to the phone or commit `.env`.

## Verify or troubleshoot

From `backend`:

```sh
npm run check:setup
npm run storage:check
```

The storage check writes only a temporary object under `listings/_checks/`, verifies it, and deletes it. It does not create a vendor, listing or reservation. It needs temporary-object delete permission as well as photo read/write permission.

CORS JSON for the S3 Console → bucket → Permissions → CORS is in `backend/config/s3-cors.json`. CORS is separate from IAM authorization and does not make the bucket public. Add exact browser origins there if deploying a web frontend elsewhere.

The IAM identity policy for the actual bucket is `backend/config/s3-access-policy.json`; its reusable placeholder version is alongside it. Attach an appropriately scoped policy to the backend's IAM user/role if access is denied. Do not paste this into a public bucket policy. The SAM template provides the function's S3 permissions for its own managed photo bucket.

After editing backend environment settings, restart the backend. The currently configured live database has the marketplace migration applied. No fake listings or accounts were added: Explore remains empty until a vendor publishes, and Favourites shows available batches from vendors you have saved.

S3 storage and requests have separate AWS charges; it is not an always-on compute server. Check your credits and AWS Billing as usage grows.

References: https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-sign-in.html and https://docs.aws.amazon.com/AmazonS3/latest/userguide/ManageCorsUsing.html.
