# FinalBatch: explanation for a project presentation

FinalBatch has three main parts: an Expo/React Native app, a Node.js/Express
backend, and a PostgreSQL database hosted on AWS RDS.

The phone sends requests to the backend. The backend validates them and reads
or writes the database. The phone never receives the RDS password or Google's
client secret.

## Signup and login

When someone signs up, the backend checks their name, email and password. It
uses bcrypt to turn the password into a salted hash and saves that hash in the
`users` table. The original password is not saved in the database. It also
creates a matching `consumers` record. These two writes are a transaction: either
both succeed, or neither is kept.

When someone logs in, Passport's local strategy looks up the account and uses
bcrypt to check the password against the stored hash. If it matches, the backend
issues a signed JWT, which acts as a temporary login pass. The native app stores
it with SecureStore and sends it with protected requests. The backend verifies
the signature, expiry and current database account before returning private data.

The JWT expires after seven days. Signing out clears the app's saved token.

## Administrator

Public signup creates ordinary consumer accounts. The owner's administrator
account is provisioned separately. Admin-only API routes require both the admin
role in the database and the designated owner email. A client cannot become an
admin by supplying a role during signup.

## Favourites

A listing heart saves its vendor's place in `saved_places`, associated with the
logged-in user's ID. The app reloads that user's saved places and displays them
on Explore and in Favourites. They persist in RDS across app restarts and logout.

## Google login

The backend uses Passport's `passport-google-oauth20` strategy. Google asks the
user to sign in on Google's own page, so FinalBatch does not receive their Google
password. After approval, Passport exchanges Google's code and reads the verified
Google identity. The backend finds or creates the matching account.

The backend then sends a short-lived, one-use code back to the app. The app must
prove it initiated the flow to exchange this code for a FinalBatch JWT. Passport
also validates OAuth state to protect the browser callback.

Existing password accounts are not silently linked to Google by email. The owner
account currently signs in with the administrator password.

## What was fixed

- The app's original login screen navigated home without authenticating through
  the API. It now uses real signup and login endpoints.
- The RDS endpoint is reachable, and the saved database password was verified.
- The connection originally selected the empty `postgres` database. The actual
  application tables were found in `finalbatch`, and the configuration was fixed.
- A migration made the existing schema compatible with names, Google identities,
  consumer/admin roles, saved places, temporary OAuth sessions and login codes.
- RDS connections verify the server certificate using AWS's CA bundle.
- Administrator login, customer signup/login and persistent favourites were
  verified against the actual app database. Disposable test accounts were removed.

## Current limits

The displayed listings and their distance/popularity labels are demo data served
by the API. Account and favourite persistence are real. Messaging is currently an
empty inbox; payments, ordering and real location ranking are not part of this work.

Google is implemented, but live Google sign-in is not yet verified end to end.
The live authorization request returns `redirect_uri_mismatch`, and its configured
callback is localhost. Phone testing needs a reachable HTTPS backend callback,
the exact callback registered in Google Cloud, and a FinalBatch development build
instead of Expo Go. Google's test-user configuration must also permit the account.

Sixteen backend tests passed. Google flow tests use a simulated Google token/profile
response with real Passport state handling and isolated PostgreSQL schemas; they
do not replace a real Google consent/sign-in test. Frontend lint, the project's
JavaScript typecheck command, and clean iOS/web development bundles passed.

A concise presentation statement:

> My app uses a three-part architecture: the mobile interface sends requests to
> an Express API, and the API stores data in PostgreSQL on AWS RDS. Users can
> create accounts, log in and save favourite places. Passwords are stored as
> hashes, and signed tokens identify logged-in users. Administrator access is
> restricted on the server. Passport handles authentication, including the
> implemented Google OAuth flow, whose external configuration is still being
> completed for phone testing.
