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
