require('dotenv').config();
const fs = require('node:fs');
const path = require('node:path');
const pool = require('../db');
(async () => {
  try {
    await pool.query(fs.readFileSync(path.join(__dirname, '../../database/migrations/001_auth_and_favourites.sql'), 'utf8'));
    console.log('Auth and favourites migration applied.');
  } catch (error) { console.error(error.message); process.exitCode = 1; }
  finally { await pool.end(); }
})();
