# Campus Swap

A marketplace connecting local businesses with nearby shoppers: businesses post surplus or
near-expiry inventory (bakery, produce, prepared food, etc.) at a discounted price, and shoppers
browse, reserve, and pick it up in person.

- **Frontend**: Expo (React Native + TypeScript), file-based routing via `expo-router`, runs on
  iOS, Android, and web.
- **Backend**: [Supabase](https://supabase.com) — Postgres database, auth, row-level security, and
  file storage. There is no separate server to run; the app talks to Supabase directly.
- **Checkout model**: reserve in-app, pay in person at pickup. There is no payment processor
  integration in this version.

## 1. Create a Supabase project

1. Create a free project at [supabase.com](https://supabase.com).
2. In the Supabase dashboard, open **SQL Editor → New query**, paste the contents of
   [`supabase/schema.sql`](supabase/schema.sql), and run it. This creates all tables, row-level
   security policies, the reservation functions, and the `listing-images` storage bucket.
3. Open **Project settings → API** and copy the **Project URL** and **anon public** key.
4. (Optional but recommended for testing) Under **Authentication → Providers → Email**, turn off
   **Confirm email** so newly created accounts can sign in immediately. If you leave it on, new
   users will see a "check your email" message and need to confirm before their first sign-in.

## 2. Configure the app

```bash
cp .env.example .env
```

Fill in `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` with the values from step 1.

## 3. Run it

```bash
npm install
npm run start   # then press i / a / w, or scan the QR code with Expo Go
```

## How the app is organized

```
supabase/schema.sql        Database schema, RLS policies, storage bucket (run once in Supabase)
src/lib/supabase.ts        Supabase client
src/lib/api/               Typed query functions (listings, reservations, profiles)
src/context/auth-context.tsx  Session + profile state, sign in/up/out
src/app/(auth)/            Sign in / sign up
src/app/(tabs)/            Browse, My listings, Orders, Reservations, Profile
                            (which tabs appear depends on whether you're a shopper or a business)
src/app/listing/[id].tsx   Listing detail + reserve flow
src/app/listing/new.tsx    Business: create a listing (photos, price, quantity, expiry)
```

### Roles

Signing up asks whether you're **shopping** or **running a business**. That choice sets the
`role` column on your `profiles` row (via signup metadata, read by a Postgres trigger — see
`handle_new_user()` in the schema) and determines which tabs and actions you see:

- **Business**: post listings, manage them (archive/reactivate), and view/advance incoming
  reservations (pending → ready → completed, or cancel).
- **Shopper**: browse and filter listings, reserve a quantity, and manage/cancel their own
  reservations.

### Reservation flow

All reservation writes go through two Postgres functions (`create_reservation`,
`update_reservation_status`) rather than plain table writes, so that a listing's available
quantity is always adjusted atomically — no overselling under concurrent reservations, and
cancelling restores stock. See the comments in `supabase/schema.sql` for details.

## Known limitations / natural next steps

- **No real payments** — reservations are pay-in-person by design (see checkout model above).
  Adding Stripe Connect would be the natural next step for real transactions.
- **Expiry is set as "hours from now"** at listing-creation time rather than a full date/time
  picker, to avoid an extra native dependency. `@react-native-community/datetimepicker` would be
  the natural upgrade.
- **No distance-based sorting** — listings show the business's address as text; there's no GPS
  distance calculation or map view yet.
- **Listings can't be edited after creation**, only archived/reactivated. Editing would reuse most
  of `src/app/listing/new.tsx`.
