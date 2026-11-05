// db.js
// PostgreSQL connection pool using the `pg` library.
// Reads the connection string from the DATABASE_URL environment variable.

const { Pool } = require('pg');
const fs = require('node:fs');
const path = require('node:path');
require('dotenv').config();

// Create a connection pool — this is more efficient than a single client
// because it reuses connections across requests.
const pool = new Pool({
  ...(process.env.DATABASE_URL ? { connectionString: process.env.DATABASE_URL } : {
    host: process.env.PGHOST,
    port: Number(process.env.PGPORT || 5432),
    database: process.env.PGDATABASE,
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    ...(process.env.PGSSLROOTCERT ? {
      ssl: {
        rejectUnauthorized: true,
        ca: fs.readFileSync(path.resolve(__dirname, process.env.PGSSLROOTCERT), 'utf8'),
      },
    } : {}),
  }),
  connectionTimeoutMillis: 10000,
});

// Log a message whenever a new client is created (helpful for debugging)
pool.on('connect', () => {
  console.log('📦 Connected to PostgreSQL database');
});

// Log any unexpected pool errors
pool.on('error', (err) => {
  console.error('Unexpected database pool error:', err);
  process.exit(-1);
});

module.exports = pool;
