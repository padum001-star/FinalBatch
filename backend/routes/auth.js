const router = require('express').Router();
const bcrypt = require('bcryptjs');
const crypto = require('node:crypto');
const { rateLimit } = require('express-rate-limit');
const passport = require('../config/passport');
const pool = require('../db');
const { publicUser, tokenFor, createConsumer } = require('../accounts');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const reply = (res, user) => res.json({ token: tokenFor(user), user: publicUser(user) });
router.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 60, standardHeaders: 'draft-8', legacyHeaders: false }));
function credentials(req, res, next) {
  const { email, password } = req.body || {};
  if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || email.length > 255 ||
      typeof password !== 'string' || !password || Buffer.byteLength(password) > 72) {
    return res.status(400).json({ error: 'Enter a valid email and password (maximum 72 bytes).' });
  }
  req.body.email = email.trim().toLowerCase(); next();
}
router.post('/signup', credentials, async (req, res, next) => {
  const { name, email, password } = req.body;
  if (typeof name !== 'string' || !name.trim() || name.trim().length > 150 || password.length < 8) {
    return res.status(400).json({ error: 'Enter your name (up to 150 characters) and a password of at least 8 characters.' });
  }
  // The owner account can only be created using the provisioning command.
  if (email === (process.env.ADMIN_EMAIL || '').trim().toLowerCase()) return res.status(403).json({ error: 'This email is reserved. Use administrator login.' });
  try {
    const user = await createConsumer({ email, name: name.trim(), passwordHash: await bcrypt.hash(password, 12) });
    res.status(201); reply(res, user);
  } catch (error) {
    if (error.code === '23505') return res.status(409).json({ error: 'An account with that email already exists.' });
    next(error);
  }
});
function login(admin) {
  return (req, res, next) => passport.authenticate('local', { session: false }, (error, user) => {
    if (error) return next(error);
    if (!user || (admin && (user.role !== 'admin' || user.email.toLowerCase() !== (process.env.ADMIN_EMAIL || '').trim().toLowerCase()))) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }
    reply(res, user);
  })(req, res, next);
}
router.post('/login', credentials, login(false));
router.post('/admin/login', credentials, login(true));
router.get('/me', requireAuth, (req, res) => res.json(publicUser(req.user)));
router.get('/admin/me', requireAuth, requireAdmin, (req, res) => res.json(publicUser(req.user)));
router.get('/providers', (req, res) => res.json({ google: Boolean(passport._strategy('google')) }));
router.get('/google', (req, res, next) => {
  if (!passport._strategy('google')) return res.status(503).json({ error: 'Google login is not configured on the server.' });
  const { challenge } = req.query;
  if (typeof challenge !== 'string' || !/^[a-f0-9]{64}$/.test(challenge)) return res.status(400).json({ error: 'Invalid login challenge.' });
  req.session.challenge = challenge;
  passport.authenticate('google', { scope: ['profile', 'email'], session: false })(req, res, next);
});
router.get('/google/callback', (req, res, next) => {
  if (!passport._strategy('google')) return res.status(503).json({ error: 'Google login is not configured.' });
  const redirect = process.env.APP_AUTH_REDIRECT || 'finalbatch://auth';
  passport.authenticate('google', { session: false }, async (error, user) => {
    res.set('Cache-Control', 'no-store');
    if (error || !user || !req.session.challenge) return res.redirect(`${redirect}?error=google_login_failed`);
    try {
      const code = crypto.randomBytes(32).toString('hex');
      await pool.query('DELETE FROM oauth_codes WHERE expires_at < now()');
      await pool.query(`INSERT INTO oauth_codes (code_hash,user_id,challenge,expires_at) VALUES ($1,$2,$3,now()+interval '2 minutes')`, [hash(code), user.user_id, req.session.challenge]);
      req.session.destroy(() => res.redirect(`${redirect}?code=${code}`));
    } catch (err) { next(err); }
  })(req, res, next);
});
router.post('/exchange', async (req, res, next) => {
  const { code, verifier } = req.body || {};
  if (typeof code !== 'string' || !/^[a-f0-9]{64}$/.test(code) || typeof verifier !== 'string' || !/^[a-f0-9]{64}$/.test(verifier)) {
    return res.status(400).json({ error: 'Invalid login code.' });
  }
  try {
    const { rows: [grant] } = await pool.query('DELETE FROM oauth_codes WHERE code_hash=$1 AND challenge=$2 AND expires_at>now() RETURNING user_id', [hash(code), hash(verifier)]);
    if (!grant) return res.status(401).json({ error: 'Login code expired or already used. Try again.' });
    const { rows: [user] } = await pool.query('SELECT * FROM users WHERE user_id=$1', [grant.user_id]);
    res.set('Cache-Control', 'no-store'); reply(res, user);
  } catch (error) { next(error); }
});
module.exports = router;
