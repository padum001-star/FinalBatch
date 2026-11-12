# Marketplace verification

Tests run against a temporary local PostgreSQL cluster on a separate port and isolated schemas. No live RDS database, real vendor/customer accounts, or AWS resources are modified by these checks. External S3 transport is substituted in tests; SQL transactions, account authentication, route handling, quantities, and ownership use the real implementation.

- Backend: `TEST_DATABASE_URL=... npm test`. All 27 tests passed, including Google/auth regressions, real publication ownership, duplicate publication, simultaneous last-item reservations, server price enforcement, repeated-request deduplication, cancellation inventory restoration, vendor-only collection and expired-listing rejection, and the Lambda HTTP API adapter.
- Frontend: `npm run lint`, `npm run typecheck`, and web static export passed during development. Both web and iOS JavaScript exports passed; the iOS check used `--no-bytecode`, not a signed native release build.
- Browser: nine end-to-end checks passed with no browser errors: empty state; vendor setup/photo selection/upload/publication; persisted favourites; reservation receipt; cancellation; lost-response retry without another POST; vendor collection; persisted dark mode; and no page-level horizontal overflow at 320/390/768px. Temporary API/database and local object storage are used for actual UI upload/publication/reservation flows. Test account names, temporary food photo and listings are confined to the isolated QA setup; they are not app seed data or production inventory.

AWS deployment, a real S3 upload round trip, native iPhone/Android image selection and release-device motion performance require checks against the configured deployment/device. Do not interpret browser checks as those validations.

## Live setup repair

The configured RDS database was reachable but lacked migration 002. That additive migration was applied while preserving existing records; the live `/listings` route changed from HTTP 500 to HTTP 200 with an empty array. An actual private S3 bucket was configured and passed a signed upload/head/download test; the temporary object was removed. No live test accounts, vendor profiles or inventory were created. Backend tests now pass 29 checks including missing-schema detection and S3 presigning without an empty-body checksum; frontend lint and typecheck pass. The local API was restarted to load the profile/bucket settings.

## Listing lifecycle and moderation upgrade

- All 40 backend tests passed. Coverage includes immediate publication after a report, report deduplication, configured-admin authorization, concurrent reporting/removal, photo-block retries without duplicate audit events, retained reservations, and actual image-header validation.
- All 13 browser checks passed with no browser errors. Added coverage exercises Files validation and optimized photo uploads, reporting without automatic hiding, administrator removal, preserved reservation history, and local expiry without API polling. See `moderation-qa-report.json`.
- Frontend lint, typecheck, web export and iOS JavaScript export passed. The iOS export used `--no-bytecode`; this is not a signed device build. Expo Doctor passed 20/20 checks.
- A separate live S3 check verified a real photo, blocked its bytes from a previously issued read URL, and rejected reuse of its original upload URL with HTTP 412. The temporary object was removed. Bucket CORS was updated while preserving existing origins.
- Migration 003 was applied to the configured RDS database, preserving existing records. The designated administrator account was confirmed already provisioned. No live customer/vendor fixtures or inventory were created, reported or removed.

Physical-device camera permission prompts and gallery/Files provider behavior still need an iPhone/Android check. Image-format validation does not detect inappropriate subject matter; moderation currently relies on reports and administrator review.

## Pickup presets, location and messaging

- All 54 backend tests passed, including real SQL preset ownership/persistence, GPS coordinate validation, 10-minute pickup grace, missed-pickup reconciliation, collection/cancellation concurrency, retained history, message participant permissions, send deduplication and cursor pagination. Pure time tests cover daylight-saving changes, overnight presets and the exact grace boundary.
- All 18 browser checks passed against isolated QA accounts, PostgreSQL and local object storage. New checks cover browser location permission and persisted shop coordinates, calendar/time inputs, default presets across reloads, a lost message response with one saved message, two-session customer/vendor replies, and a real server grace deadline while the pickup screen stays open. See pickup-qa-report.json. The test explicitly brings a receiving chat to the foreground; background chat polling intentionally stops.
- Frontend lint/typecheck, web export and iOS JavaScript export passed after aligning the SDK 58 patch packages. The iOS export used --no-bytecode and is not a signed native device build. Expo Doctor passed 20/20 checks.
- Migration 004 was applied to the configured RDS database, retaining existing accounts, listings and reservations. No real customer/vendor test fixtures or messages were created.

Physical iPhone/Android calendar/time picker behavior, location prompts and keyboard ergonomics still need a phone check. The user's intermittent bottom-of-screen error needs its screenshot or exact message; passing browser checks cannot identify that unspecified device error.

Live storage recheck on November 12 initially found unusable local AWS profile credentials (`CredentialsProviderError`). After Phil renewed the browser login, `npm run storage:check` passed real signed upload, write-once rejection, metadata and signed download checks; its temporary verification object was removed. The restarted public API returned HTTP 200 for /health and /ready, and the database schema check passed. The API is still served from the Mac through its configured public tunnel; Lambda has not been deployed.
