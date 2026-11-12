# Closing, expiry, moderation, and listing photos

## Vendor controls and expiry

Profile → Manage your batches → Your listings → Close listing → Confirm close listing stops new reservations. The listing record and existing reservations remain for pickup/history. Expired, closed, sold-out and removed listings are separate states.

The pickup-window end is the expiry time. Public browsing filters expired listings and reservation creation checks the time again on the server. The app also hides expired cards with a local timer while a screen is open, without polling or scheduled Lambda calls. Do not delete every listing 24 hours after creation: the vendor's stated pickup window is the relevant deadline. New-day inventory should be a new batch with its own quantity and pickup window.

Closing keeps existing reservations. An uncollected pickup now expires ten minutes after the pickup end, with history retained; it is never marked paid. See PICKUP_AND_MESSAGES.md. Refunds and paid no-show rules remain separate policies before adding payments.

## Reporting and admin removal

Listings publish immediately, per the chosen product policy. Customers open a listing → Report listing → choose a reason and optionally explain. Reports do not hide listings automatically, and repeated reports from the same account do not create duplicate report rows.

Sign into the designated administrator account, then Profile → Manage listings. Needs review prioritizes reports; All listings also permits proactive removal. Photos are hidden until the admin explicitly chooses View listing photo. Enter a reason and confirm removal, or dismiss a mistaken report with a reason.

Admin access requires BOTH a database `admin` role AND an email matching `ADMIN_EMAIL` on the backend. Regular customers/vendors and other accounts cannot call these endpoints. Use the existing `npm run create-admin` provisioning workflow if the owner account is not yet provisioned; do not turn public signup into an admin-creation path.

Removal hides the listing from public queries, disables new reservations, records who removed it/when/why, resolves its reports, and preserves prior reservation records. Vendors cannot undo a moderation removal by closing/reopening or retrying publication. Customers with existing reservations see a removal notice and may still cancel uncollected reservations; stock restoration does not make a removed listing visible again.

S3 photo content is replaced with an empty private tombstone. New signed PUT URLs require `If-None-Match: *`, preventing replacement after the first upload and preventing reuse after the moderation tombstone. New read URLs use no-store caching. Previously downloaded images cannot be erased from a user's device. Upload URLs issued by the older app before this change expire within five minutes; their older unconditional behavior ends at expiry.

Storage cleanup runs after the database takedown so the listing is hidden even if S3 is temporarily unavailable. If cleanup fails, the admin sees a retry action; the audit record is not duplicated. Do not claim the photo was blocked until cleanup confirms success.

This is human moderation with reporting, not automatic pornography detection. Valid JPEG/PNG/WebP files can still contain inappropriate content. Amazon Rekognition moderation is a possible next layer before publishing or for flagging reports, but has separate costs and can make mistakes. Human review and appeal policy remain necessary. No paid automated moderation service was enabled by this change.

## Photo selection and validation

Vendors can Take a photo, Choose from gallery, or Choose from Files. Native camera use requests permission. Files accepts JPEG, PNG and WebP; supported gallery/camera images are normalized to JPEG. Photos are resized to at most 1600px on their long edge and compressed before upload. The preview shows the optimized photo that will be uploaded.

Inputs larger than 20 MB are rejected before processing. Optimized uploads must be <=8 MB. The server checks the actual stored size/type, reads image headers, rejects formats outside JPEG/PNG/WebP, and checks dimensions/pixel count; it does not trust a filename extension. These checks validate format, not the subject of the picture. Use physical iOS/Android devices to verify permission prompts and camera/files provider behavior.

## Deployment

Run `npm run migrate` in backend to apply additive migration `003_listing_moderation.sql`. Existing accounts, listings and reservations are retained. Existing listings remain visible unless expired/closed/sold-out; no existing listing is automatically classified as inappropriate or removed.

Apply the updated `backend/config/s3-cors.json` to the photo bucket (it adds the conditional upload header), restart the backend, install frontend dependencies with `npm ci`, and restart Expo with `npx expo start --go --clear`. A custom development build must be rebuilt after adding the native picker/manipulator modules. SDK 58 Expo Go includes these modules.

References: https://docs.expo.dev/versions/v58.0.0/sdk/imagepicker/, https://docs.expo.dev/versions/v58.0.0/sdk/document-picker/, https://docs.expo.dev/versions/v58.0.0/sdk/imagemanipulator/, https://docs.aws.amazon.com/rekognition/latest/dg/moderation.html.
