require('dotenv').config();
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const PgSession = require('connect-pg-simple')(session);
const pool = require('./db');
const passport = require('./config/passport');
const app = express();
if (process.env.NODE_ENV === 'production') app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(cors({ origin: (process.env.CORS_ORIGINS || 'http://localhost:8081').split(',').map(s => s.trim()) }));
app.use(express.json({ limit: '16kb' }));
app.use((req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
app.use(session({
  store: new PgSession({ pool }),
  secret: process.env.SESSION_SECRET || 'development-only-set-SESSION_SECRET',
  resave: false, saveUninitialized: false,
  cookie: { secure: process.env.NODE_ENV === 'production', httpOnly: true, sameSite: 'lax', maxAge: 10 * 60 * 1000 },
}));
app.use(passport.initialize());
app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.use('/auth', require('./routes/auth'));
app.get('/listings', (req, res) => res.json(require('./catalog').ALL_LISTINGS));
app.use('/favourites', require('./routes/favourites'));
app.use((req, res) => res.status(404).json({ error: 'Route not found.' }));
app.use((err, req, res, next) => {
  console.error('Request failed:', err.message);
  res.status(err.status === 400 ? 400 : 500).json({ error: err.status === 400 ? 'Invalid JSON request.' : 'Something went wrong. Please try again.' });
});
if (require.main === module) {
  if (!process.env.DATABASE_URL && (!process.env.PGHOST || !process.env.PGUSER || !process.env.PGDATABASE || !process.env.PGPASSWORD)) {
    throw new Error('Set PGPASSWORD and the PostgreSQL connection fields in backend/.env, or provide DATABASE_URL.');
  }
  for (const name of ['JWT_SECRET', 'SESSION_SECRET']) {
    if (!process.env[name] || process.env[name].length < 32) throw new Error(`Set ${name}; secrets must have at least 32 characters.`);
  }
  app.listen(process.env.PORT || 3001, () => console.log('FinalBatch API listening on port', process.env.PORT || 3001));
}
module.exports = app;
