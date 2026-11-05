const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const bcrypt = require('bcryptjs');
const pool = require('../db');
const { createConsumer } = require('../accounts');
passport.use(new LocalStrategy({ usernameField: 'email' }, async (email, password, done) => {
  try {
    const { rows: [user] } = await pool.query('SELECT * FROM users WHERE lower(email)=$1', [email.trim().toLowerCase()]);
    if (!user?.password_hash || !await bcrypt.compare(password, user.password_hash)) return done(null, false);
    done(null, user);
  } catch (error) { done(error); }
}));
// Email/password login remains available when Google credentials are not configured.
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_CALLBACK_URL) {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL,
    state: true,
  }, async (_access, _refresh, profile, done) => {
    try {
      const email = profile.emails?.[0]?.value?.trim().toLowerCase();
      if (!email || profile._json?.email_verified !== true) return done(null, false);
      if (email === (process.env.ADMIN_EMAIL || '').trim().toLowerCase()) return done(null, false);
      let { rows: [user] } = await pool.query('SELECT * FROM users WHERE google_id=$1', [profile.id]);
      if (!user) {
        const existing = await pool.query('SELECT user_id FROM users WHERE lower(email)=$1', [email]);
        // Account linking requires an authenticated flow; never silently link by email.
        if (existing.rowCount) return done(null, false, { message: 'Use your existing password to sign in.' });
        try { user = await createConsumer({ email, name: profile.displayName || email.split('@')[0], googleId: profile.id }); }
        catch (error) {
          if (error.code !== '23505') throw error;
          ({ rows: [user] } = await pool.query('SELECT * FROM users WHERE google_id=$1', [profile.id]));
          if (!user) return done(null, false);
        }
      }
      done(null, user);
    } catch (error) { done(error); }
  }));
}
module.exports = passport;
