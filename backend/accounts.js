const pool = require('./db');
const jwt = require('jsonwebtoken');
const publicUser = u => ({ id: u.user_id, email: u.email, name: u.full_name, role: u.role });
const tokenFor = u => jwt.sign({ id: u.user_id }, process.env.JWT_SECRET, { expiresIn: '7d', audience: 'finalbatch', issuer: 'finalbatch-api' });
async function createConsumer({ email, name, passwordHash = null, googleId = null }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: [user] } = await client.query(`INSERT INTO users (email, full_name, password_hash, google_id, role)
      VALUES ($1,$2,$3,$4,'consumer') RETURNING *`, [email, name, passwordHash, googleId]);
    await client.query('INSERT INTO consumers (user_id, full_name, email) VALUES ($1,$2,$3)', [user.user_id, name, email]);
    await client.query('COMMIT');
    return user;
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}
module.exports = { publicUser, tokenFor, createConsumer };
