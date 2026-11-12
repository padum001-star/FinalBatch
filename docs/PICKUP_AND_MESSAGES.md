# Pickup presets, shop location and messages

## Vendor pickup windows

Profile → Manage your batches → Publish a fresh batch → Pickup window. Choose the date with the calendar and time with the native device control. iPhone uses a calendar and time wheel; Android uses its system date/time dialogs. Web uses date/time inputs. Times are displayed in the named time zone, and the API receives timestamps with a UTC offset.

Choose your start/end, name a preset such as Dinner pickups, then Save pickup preset. The first preset becomes the default; the checkbox lets a later preset replace it. Default windows populate new batches using today's date, or tomorrow if today's end has passed. A saved preset reuses clock times and its time zone, never a stale date. Overnight presets retain the following-day end. Selecting a preset preserves an explicitly chosen future date. Saving the same name updates that preset; each vendor can keep ten. Remove a preset to stop using it. Presets belong to the vendor account in PostgreSQL and work across devices.

The existing listing validation still requires the end after the start, in the future and within 31 days. Invalid/nonexistent daylight-saving times are rejected by the web/preset conversion rather than silently shifted.

## Shop location

Use my current location requests foreground location permission only when pressed. Use it while at the shop. On native devices, Expo Location attempts a system address lookup; the vendor can review/correct the address and check the coordinates in Google Maps before saving business details. A failed address lookup retains the pin and asks for an address. Denied permissions leave manual entry available. Remove location pin clears it on the next save. If moving the shop manually, remove the old pin or capture its new location too.

The confirmed address and optional coordinates become public listing data. No continuous tracking, background location permission, or customer location collection is added. Web geolocation requires a secure context (HTTPS, or localhost); web address lookup is manual. The Google Maps search links use Maps URLs, not a paid embedded Maps/Geocoding API, and require no API key. Native system address lookup is separate from Google Cloud APIs.

## Pickup expiry and history

New reservations stop at the exact pickup end, both in Explore and on the API. Existing reserved pickups stay collectible for ten more minutes. At or after that deadline, an uncollected pickup becomes `expired` with `closed_reason=pickup_timeout`; the UI calls it Cancelled · pickup missed. Collected and customer-cancelled pickups remain unchanged. Expired food is never restored as available inventory.

Your pickups shows active reservations first, followed by retained history. Vendors see the same effective status in Incoming pickups. Expiry is checked server-side when reading pickups, retrying a reservation or acting on one; local screen timers update the UI at the window/grace boundary. No always-running worker or keep-warm Lambda is required. While nobody is using the app, a due row may remain stored as reserved until the next relevant request reconciles it. It cannot be collected after grace or used to book expired food. Historical records are retained, not deleted. The first version returns the latest 200 pickups/conversations; older rows remain in PostgreSQL.

No online payment is taken, so this does not charge or refund anyone. Payments/no-show penalties need a separate policy before enabling payments.

## Customer/vendor chat

Open a listing → Message vendor, or Your pickups → Message vendor. Vendors use Incoming pickups → Message customer. The Messages tab keeps conversations, latest-message previews and history. Existing pickup conversations remain available after closing/expiry/moderation so pickup issues can still be discussed.

Only that conversation's customer and the listing's actual vendor can read/send messages; knowing its UUID does not grant access. Text is limited to 2,000 characters. Sends have client-generated IDs and database uniqueness to prevent duplicates on uncertain retries. History loads 50 messages per page with Load earlier messages. An account has one conversation per listing/customer pair.

This version refreshes an open conversation every ten seconds and the inbox every fifteen seconds, only while that screen is focused and the app is foregrounded. It uses the same authenticated API on Mac or Lambda, without a permanent WebSocket process. It does not include push notifications, attachments, typing indicators, read receipts, end-to-end encryption, or message moderation/reporting. Per-process send throttling is not a global distributed limit.

## Setup and troubleshooting

1. Preserve backend/.env and frontend/.env. Run `npm ci` in each directory after pulling.
2. Run `npm run migrate` and `npm run check:setup` from backend. Migration 004 adds presets/conversations/messages and the expired reservation status; existing users, listings and pickup history remain.
3. Run `npm start` in backend; keep it and the public tunnel running while the mobile app uses that tunnel's URL. The presence of template.yaml does not mean Lambda is deployed. Use docs/SERVERLESS.md for a deliberate AWS deployment.
4. Restart Expo from frontend with `npx expo start --go --clear`. SDK 58 Expo Go includes these picker/location modules. Rebuild a custom development client to include newly added native modules/configuration.
5. Check `/health`, `/ready`, and backend terminal logs. `npm run check:setup` checks schema readiness. See docs/QA.md for coverage and device checks still needed.

References: [SDK 58 date/time picker](https://docs.expo.dev/versions/v58.0.0/sdk/date-time-picker/), [SDK 58 Location](https://docs.expo.dev/versions/v58.0.0/sdk/location/), [Google Maps URLs](https://developers.google.com/maps/documentation/urls/get-started).
