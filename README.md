# FinalBatch

A food-rescue mobile app that connects vendors with surplus food to nearby consumers.

## Repository Structure

```
FinalBatch/
├── database/          # PostgreSQL schema, seed data, and verification queries
├── backend/           # AWS Lambda functions (Node.js) — REST API over AWS RDS
└── frontend/          # React Native (Expo) mobile app
```

## Database (`database/`)

Three SQL files for the PostgreSQL database hosted on AWS RDS:

- `food_rescue_schema.sql` — Table definitions (vendors, consumers, listings, orders, etc.)
- `food_rescue_seed_data.sql` — Sample/dummy data for development and testing
- `food_rescue_verification_queries.sql` — Queries used to verify the data is correct

## Backend (`backend/`)

AWS Lambda functions that expose a REST API via API Gateway, connected to the RDS database.

- `getListings.js` — `GET /listings` — returns active food listings
- `createOrder.js` — `POST /orders` — creates an order and decrements inventory

**Environment variables required on Lambda:**
- `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`

To install dependencies:
```bash
cd backend
npm install
```

## Frontend (`frontend/`)

React Native app built with Expo.

```bash
cd frontend
npm install
npx expo start
```

Scan the QR code with the Expo Go app on your phone to run it.

## Authentication API and mobile app

The Express API (`backend/server.js`) now handles Passport local and Google sign-in,
PostgreSQL accounts, JWT-protected profiles, and saved favourite places. The legacy
Lambda handlers above are separate; deploy the Express API to use these new routes.
The Explore page uses the eight demo listings served by `/listings`. Distance and
popularity are sample data. Saving a heart saves that vendor's place for the signed-in
account; it appears on Explore and in **Favourites**, and survives signing out or
restarting the app. Messages currently shows an empty inbox; messaging is not implemented.

### Database and server

1. Install backend dependencies with `npm install` in `backend`.
2. Copy `backend/.env.example` to `backend/.env` if you do not already have it.
   Set `DATABASE_URL` or the separate `PGHOST`, `PGPORT`, `PGDATABASE`,
   `PGUSER`, and `PGPASSWORD` fields. For RDS, set `PGSSLROOTCERT` to the
   downloaded AWS certificate bundle path relative to `backend`. Set separate random `JWT_SECRET` and `SESSION_SECRET`
   (at least 32 characters each; `openssl rand -hex 32` generates one).
3. For a new database, apply `database/food_rescue_schema.sql` first. For both
   new and existing databases, run `npm run migrate` in `backend`. The migration
   preserves existing users/listings, permits passwordless Google users, adds user
   names and Google identities, and creates sessions, login codes and saved places.
   A casing collision between existing account emails stops the migration for review.
4. Set `ADMIN_EMAIL` to your email, and an `ADMIN_PASSWORD` of at least 8
   characters (maximum 72 bytes). Run `npm run create-admin`, then remove
   `ADMIN_PASSWORD` from the environment. This command explicitly provisions or
   updates that one owner's account; public signup always creates consumers and
   reserves the owner email. Keep `ADMIN_EMAIL` set to enforce owner-only access.
5. Run `npm start`. Use HTTPS in production and set `NODE_ENV=production` and
   `CORS_ORIGINS` to your web app origin(s), comma-separated. Production assumes
   one trusted reverse proxy. Sessions are stored in PostgreSQL. Rate limits are
   per server process; use shared rate limiting if deploying multiple replicas.

### Fixing Google login

The old frontend sent a Google web client directly to a custom mobile redirect.
The new flow starts at the API, uses Passport's Google OAuth strategy, validates
OAuth state in a PostgreSQL-backed session, then redirects a one-use, two-minute
code to the app. The app must supply its original challenge verifier to exchange
that code for a login token; the token is not placed in a redirect URL.

In Google Cloud Console:

1. Create an OAuth client of type **Web application**. Put its client ID and
   secret in the backend's `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.
2. Add the **exact** `GOOGLE_CALLBACK_URL` under **Authorized redirect URIs**,
   e.g. `https://api.your-domain.com/auth/google/callback`. Google's redirect goes
   to the backend, not `finalbatch://auth`. The configured URL must match in
   scheme, host, port and path. For local web testing, localhost is supported.
3. Configure the consent screen. While the Google app is in testing, add your
   Google account as a test user. Use the error details from Google if it still
   rejects a request; Passport cannot override Google Cloud configuration errors.
4. Set `APP_AUTH_REDIRECT=finalbatch://auth` for a native build, or your exact web
   auth URL, e.g. `http://localhost:8081/auth`, for a web deployment. This is a
   server-controlled destination. Use separate API environments for native and
   web if you need both simultaneously.

Existing password accounts must use their password. Google does not silently
link an existing account by matching its email. Admin access is provisioned using
the password command above and the **Administrator login** option on the login
screen. `/auth/admin/me` checks the current database role and designated email.

### Frontend

Copy `frontend/.env.example` to `frontend/.env` and set `EXPO_PUBLIC_API_URL` to
that Express API. A physical phone needs your computer's LAN IP (or deployed HTTPS
API URL); `localhost` on a phone refers to the phone itself.

Run `npm install` then `npx expo start` in `frontend`. Navigation now uses Expo
Router with **Explore**, **Favourites**, **Messages**, and **Profile** tabs. Native
Google sign-in needs a development/production build that registers the
`finalbatch` scheme; Expo Go is not sufficient for this custom callback. Email
login can be tested in Expo Go. Native tokens use SecureStore; web tokens use
sessionStorage and are cleared when the tab session ends. Sign out clears the
local token; issued JWTs expire after seven days.

### Checks

- Frontend: `npm run lint`, `npm run typecheck`, `npx expo export --platform web`.
  The project is JavaScript; the TypeScript command validates project configuration
  and parses included files, rather than providing full JavaScript type coverage.
- Backend: set `TEST_DATABASE_URL` to a **test PostgreSQL database** and run
  `npm test`. Tests use a fresh temporary schema and remove it afterwards. They
  cover actual database signup/login, hash storage, duplicate input, transactional
  rollback, owner permissions, private persistent favourites, and one-use code
  exchange. Without `TEST_DATABASE_URL`, integration tests are skipped.
