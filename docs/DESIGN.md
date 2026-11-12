# Marketplace design direction

Keep FinalBatch's existing fern green (#1F4D3D), ember (#E85A34), sage (#F5F7F0), charcoal (#1C2620), and white. Ember is deepened for small light-theme text contrast. Dark appearance uses forest surfaces and pale green/peach accents; users can choose light, dark or system in Profile. Native system typography keeps the existing identity, with a clear 30/23/16/14/12 hierarchy and sentence-case headings.

Adapt the supplied Airbnb/DoorDash references through a rounded search field, category chips, horizontal photo shelves, section titles/subtitles, compact prices, and favourites. Preserve the stacked section structure, without inventing proximity, popularity, ratings, or verification. Actual sections are Ready for pickup, Before they're gone (closing soon), and Freshly listed. No seed data is loaded by the application and no stock photo is substituted for a vendor's actual listing photo.

Frequent press actions use immediate opacity feedback. Additional entrance, hover, parallax, and tab motion is unnecessary for this shopping flow. This also makes these new screens naturally suitable for reduced-motion settings. Existing onboarding/auth motion is outside this visual pass.

Shared components live in `src/components/MarketUI.js`; colors/preferences in `src/design/Theme.js`. Photos use a consistent aspect ratio and 22pt corners, text remains outside images, and primary touch targets are at least 44pt. Listing details, publication, reservations, contact and profile share the same tokens. Image failure is explicit instead of silently showing another product. Light/dark applies to the marketplace screens; existing authentication/onboarding retains its original appearance.

Design guidance applied: local frontend-design and emil-design-eng skills. No paid/private design material or copied Airbnb/DoorDash assets are included.

| Before | After | Why |
| --- | --- | --- |
| Emoji cards from a hardcoded catalog | Vendor-uploaded photos and database-backed cards | Show the actual item customers can reserve |
| Sample distance/popularity sections | Pickup-ready, closing-soon and newest shelves | Keep the reference layout without inventing facts |
| Static messages screen | Actual email/phone contact links | Provide a working way to contact the vendor |
| Fixed light marketplace colors | Shared light/dark/system tokens | Keep the brand consistent across marketplace screens |
