const jwt = require('jsonwebtoken');
const pool = require('../db');
async function requireAuth(req, res, next) {
  const token = /^Bearer (\S+)$/.exec(req.headers.authorization || '')?.[1];
  if (!token) return res.status(401).json({ error: 'Please log in.' });
  let decoded;
  try { decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'], audience: 'finalbatch', issuer: 'finalbatch-api' }); }
  catch { return res.status(401).json({ error: 'Session expired. Please log in again.' }); }
  try {
    const { rows: [user] } = await pool.query('SELECT user_id, email, full_name, role FROM users WHERE user_id=$1', [decoded.id]);
    if (!user) return res.status(401).json({ error: 'Account no longer exists.' });
    req.user = user;
    next();
  } catch (error) { next(error); }
}
function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin' || req.user.email.toLowerCase() !== (process.env.ADMIN_EMAIL || '').trim().toLowerCase()) {
    return res.status(403).json({ error: 'Administrator access required.' });
  }
  next();
}
module.exports = { requireAuth, requireAdmin };
