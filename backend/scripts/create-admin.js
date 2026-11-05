require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool = require('../db');
(async () => {
  try {
    const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
    const password = process.env.ADMIN_PASSWORD;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !password || password.length < 8 || Buffer.byteLength(password) > 72) {
      throw new Error('Set ADMIN_EMAIL and ADMIN_PASSWORD of at least 8 characters (maximum 72 bytes) before provisioning.');
    }
    const hash = await bcrypt.hash(password, 12);
    await pool.query(`INSERT INTO users (email, full_name, password_hash, role)
      VALUES ($1, 'Administrator', $2, 'admin')
      ON CONFLICT (lower(email)) DO UPDATE SET password_hash=$2, role='admin'`, [email, hash]);
    console.log('Designated administrator provisioned. Remove ADMIN_PASSWORD from the environment.');
  } catch (error) { console.error(error.message); process.exitCode = 1; }
  finally { await pool.end(); }
})();
