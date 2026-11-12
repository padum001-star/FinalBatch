# FinalBatch on request-driven AWS Lambda

The API now exports `backend/lambda.handler`; the same Express app still runs with `npm start` locally. `template.yaml` defines an API Gateway HTTP API, an on-demand Lambda, a private encrypted S3 photo bucket, and seven-day API logs. It does not provision a new database, NAT gateway, or RDS Proxy. Nothing in this change deploys AWS resources automatically.

## Costs and connectivity first

Lambda is available when a request arrives; it is not a continuously running background process. The template has no provisioned concurrency or keep-warm timer. Request duration, API Gateway traffic, S3 storage/requests, logs, Secrets Manager, and the existing database have separate costs. Reserved concurrency caps simultaneous functions, not spending.

The existing PostgreSQL/RDS instance keeps its own compute/storage costs even with no app requests. A NAT gateway and RDS Proxy also have standing charges if you add them. Lambda alone cannot make the entire stack pay-per-request. Confirm AWS credit eligibility and set budget alerts; alerts are not hard caps.

The template requires database-VPC subnets and a Lambda security group. Allow PostgreSQL port 5432 on the RDS security group **from that Lambda security group**, not from the internet. Leave the database private. Each function uses at most two pooled connections and the template caps functions at five concurrent instances; review database connection capacity alongside other applications.

Lambda in a VPC does not gain internet access merely by using a public subnet. The configured subnets need an existing outbound route (typically NAT) for Google OAuth and S3, or appropriate endpoints for supported AWS services. An S3 gateway endpoint can avoid NAT for S3 traffic. Google still requires internet egress. Check existing networking and recurring costs before deploying; this template deliberately does not create NAT infrastructure. A lower-idle-cost PostgreSQL option is a separate migration decision, not a reason to discard this relational schema.

## Local setup and real data

1. In `backend`, run `npm ci` and preserve your existing `.env`.
2. Existing databases: run `npm run migrate`. New databases only: apply `database/food_rescue_schema.sql` first, then run migrations. **Do not run the seed-data file** for the real marketplace.
3. Set `LISTING_PHOTOS_BUCKET` and `AWS_REGION`. Local development needs AWS credentials with access to that private bucket (use `aws configure sso` / your team's approved profile, not keys in frontend code). Lambda uses its execution role.
4. For web uploads, the bucket CORS configuration must allow your exact frontend origin, `PUT`, `GET`, and `HEAD`, and the Content-Type/AWS signing headers. The SAM template configures one `WebOrigin`; add actual additional browser origins if needed.
5. Start the backend: `npm start`. Check `/health` and `/ready`.
6. Set the phone's ignored `frontend/.env`: `EXPO_PUBLIC_API_URL=https://YOUR_API_HOST` (no trailing `/api`). Run `npm ci` in `frontend`, then `npx expo start --go --clear`. Image Picker is included in Expo Go for this SDK; Google sign-in still needs the existing development-build/custom-scheme flow.
7. Sign up and open Profile → Become a vendor. Enter the real business name, pickup address, and optional phone. Account email and these contact details are shown on listings.
8. Select a real food photo, enter the batch details/allergens, price, quantity, and pickup dates/times using the calendar and time controls, then publish. Photos must be JPEG/PNG/WebP, <=8 MB. They upload directly to private S3 with a short-lived signed URL. Publication checks upload ownership, size and declared type. Read URLs are signed for one hour; refresh the feed if they expire.
9. On a separate customer account, browse, open details, reserve, view Pickups, or cancel. Vendors see incoming reservations and confirm collection. No online payment is created or marked paid. Customers and vendors can message privately in the app, with email/phone as fallbacks.

## Database migration behavior

`002_marketplace.sql` adds fields/tables, retaining old rows. Only listings explicitly published through the vendor workflow appear in the new feed. Old seeded/demo rows are not exposed. New canonical pickup timestamps have time zones; historical timestamp columns remain untouched. Prices and quantities are validated on the API. Reservations lock inventory in a transaction, snapshot the database price, and deduplicate per-user request IDs. Cancellation before the pickup end restores quantity once. Missed pickups expire after a ten-minute grace period without restoring expired inventory. Collection requires the listing's actual vendor.

Favourites now use vendor IDs rather than hardcoded business-name strings. Old demo-name favourites remain stored but do not attach to unrelated real vendors.

## Deploy with AWS SAM

Prerequisites: AWS CLI authenticated to the intended account, AWS SAM CLI installed, access to the database VPC, and permission to deploy CloudFormation/IAM/S3/Lambda/API Gateway resources. Run `aws sts get-caller-identity` yourself to confirm the account before creating resources.

1. Apply the migrations from a machine that can reach the database (for example your existing trusted development connection). The runtime does not migrate on requests. Review/apply the SQL before directing users at the new API.
2. Download the public RDS CA bundle into the deployment package:
   ```sh
   mkdir -p backend/certs
   curl -fsSL https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem -o backend/certs/rds-global-bundle.pem
   ```
3. In Secrets Manager, create a JSON secret containing `PGHOST`, `PGDATABASE`, `PGUSER`, `PGPASSWORD`, `JWT_SECRET`, and `SESSION_SECRET`. Use the existing working database and strong independent JWT/session secrets. Do not put secret values in Git, shell arguments, or `samconfig.toml`. Secrets Manager has its own charges.
4. From the repository root:
   ```sh
   sam validate --lint
   sam build
   sam deploy --guided
   ```
5. Choose the intended region and a stack name such as `finalbatch-api`. Supply `DatabaseSecretArn`, database-VPC `SubnetIds`, Lambda `SecurityGroupIds`, your browser `WebOrigin`, and `AdminEmail` if admin access is used. Keep change-set confirmation enabled and review the resources before executing. Native Expo requests do not require a browser CORS origin.
6. Google login is optional. If enabling it, also supply `GoogleClientId`, `GoogleCallbackUrl`, `AppAuthRedirect`, and `GoogleSecretArn` (a Secrets Manager JSON secret containing `GOOGLE_CLIENT_SECRET`). After obtaining the API URL, update the exact Google callback in the stack and Google Cloud Console. Email login works without Google.
7. Open the stack output `ApiUrl` + `/health` and `/ready`. Put `ApiUrl` in `frontend/.env`, then restart Expo. Try vendor upload → customer reservation → vendor collection with real accounts before sharing the deployment.
8. Watch CloudWatch and AWS Billing. Do not add provisioned concurrency or a keep-warm timer to this low-idle-cost setup without reviewing cost.

The upload bucket is retained if you delete the stack so actual vendor photos are not silently destroyed. It continues to incur storage costs until you intentionally empty/delete it. Existing RDS/networking are outside this stack and must be managed separately.

## Remaining boundaries

No Stripe/payment processing, vendor verification program, push notifications, or automatic AI image moderation is implemented. Human reporting/admin takedown, in-app text messaging, pickup presets, location capture and ten-minute no-show expiry are implemented. See LISTING_LIFECYCLE.md and PICKUP_AND_MESSAGES.md. Expiry is reconciled on relevant requests and on open-screen clock boundaries; there is no background worker. Listings/reservations/conversations are capped at 200 per response for this first pass; add cursor pagination before growing beyond that. Message history already uses cursor pagination.


References: [Lambda pricing](https://aws.amazon.com/lambda/pricing/), [API Gateway pricing](https://aws.amazon.com/api-gateway/pricing/), [RDS pricing](https://aws.amazon.com/rds/postgresql/pricing/), [S3 signed URLs](https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-presigned-url.html), [Lambda VPC internet access](https://docs.aws.amazon.com/lambda/latest/dg/configuration-vpc-internet.html).
