const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

test('Passport Google flow with simulated provider and real isolated PostgreSQL schema', { skip: !process.env.TEST_DATABASE_URL }, async t => {
  const schema = `oauth_test_${crypto.randomBytes(8).toString('hex')}`;
  Object.assign(process.env, {
    DATABASE_URL: process.env.TEST_DATABASE_URL,
    PGOPTIONS: `-c search_path=${schema},public`,
    JWT_SECRET: crypto.randomBytes(32).toString('hex'),
    SESSION_SECRET: crypto.randomBytes(32).toString('hex'),
    GOOGLE_CLIENT_ID: 'test-client.apps.googleusercontent.com',
    GOOGLE_CLIENT_SECRET: 'test-secret',
    GOOGLE_CALLBACK_URL: 'http://localhost/auth/google/callback',
    APP_AUTH_REDIRECT: 'finalbatch://auth',
    ADMIN_EMAIL: 'owner@example.test',
    NODE_ENV: 'test',
  });
  const pool = require('../db');
  let server;
  try {
    await pool.query(`CREATE SCHEMA ${schema}`);
    await pool.query(fs.readFileSync(path.join(__dirname, '../../database/food_rescue_schema.sql'), 'utf8'));
    await pool.query(fs.readFileSync(path.join(__dirname, '../../database/migrations/001_auth_and_favourites.sql'), 'utf8'));
    const app = require('../server');
    const strategy = require('../config/passport')._strategy('google');
    let exchanges = 0;
    let profile = { id: 'google-test-identity', displayName: 'Google Test', emails: [{ value: 'google@example.test' }], _json: { email_verified: true } };
    // Only Google's external token/profile responses are simulated. Passport's
    // state handling, strategy callback, database writes, redirects and JWTs run normally.
    strategy._oauth2.getOAuthAccessToken = (_code, _params, done) => { exchanges++; done(null, 'test-access-token', null, {}); };
    strategy.userProfile = (_token, done) => done(null, profile);
    server = app.listen(0, '127.0.0.1');
    await new Promise(resolve => server.once('listening', resolve));
    const base = `http://127.0.0.1:${server.address().port}`;
    const verifier = crypto.randomBytes(32).toString('hex');
    const challenge = crypto.createHash('sha256').update(verifier).digest('hex');
    async function start() {
      const response = await fetch(`${base}/auth/google?challenge=${challenge}`, { redirect: 'manual' });
      assert.equal(response.status, 302);
      const location = new URL(response.headers.get('location'));
      assert.equal(location.hostname, 'accounts.google.com');
      assert.equal(location.searchParams.get('redirect_uri'), process.env.GOOGLE_CALLBACK_URL);
      assert.ok(location.searchParams.get('scope').includes('email'));
      const cookie = response.headers.get('set-cookie').split(';')[0];
      return { state: location.searchParams.get('state'), cookie };
    }
    async function callback(flow, state = flow.state) {
      return fetch(`${base}/auth/google/callback?code=provider-test-code&state=${encodeURIComponent(state)}`, { headers: { Cookie: flow.cookie }, redirect: 'manual' });
    }
    let appCode;
    await t.test('verified Google identity creates a consumer and redirects a code, not a JWT', async () => {
      const response = await callback(await start());
      assert.equal(response.status, 302);
      const location = new URL(response.headers.get('location'));
      assert.equal(location.protocol, 'finalbatch:');
      assert.equal(location.searchParams.has('token'), false);
      appCode = location.searchParams.get('code');
      assert.match(appCode, /^[a-f0-9]{64}$/);
      const { rows: [user] } = await pool.query('SELECT user_id, role, password_hash, google_id FROM users WHERE google_id=$1', [profile.id]);
      assert.equal(user.role, 'consumer');
      assert.equal(user.password_hash, null);
      assert.equal((await pool.query('SELECT 1 FROM consumers WHERE user_id=$1', [user.user_id])).rowCount, 1);
    });
    await t.test('app proof exchanges the callback code once for an authenticated session', async () => {
      const exchange = () => fetch(`${base}/auth/exchange`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: appCode, verifier }) });
      const response = await exchange();
      assert.equal(response.status, 200);
      const result = await response.json();
      assert.equal(result.user.email, 'google@example.test');
      assert.equal((await fetch(`${base}/auth/me`, { headers: { Authorization: `Bearer ${result.token}` } })).status, 200);
      assert.equal((await exchange()).status, 401);
    });
    await t.test('returning Google login reuses the account', async () => {
      const response = await callback(await start());
      assert.ok(new URL(response.headers.get('location')).searchParams.get('code'));
      assert.equal((await pool.query('SELECT 1 FROM users WHERE google_id=$1', [profile.id])).rowCount, 1);
    });
    await t.test('invalid OAuth state fails before contacting the token endpoint', async () => {
      const before = exchanges;
      const response = await callback(await start(), 'incorrect-state');
      assert.equal(new URL(response.headers.get('location')).searchParams.get('error'), 'google_login_failed');
      assert.equal(exchanges, before);
    });
    await t.test('unverified emails cannot create accounts', async () => {
      profile = { ...profile, id: 'unverified-google', emails: [{ value: 'unverified@example.test' }], _json: { email_verified: false } };
      const response = await callback(await start());
      assert.equal(new URL(response.headers.get('location')).searchParams.get('error'), 'google_login_failed');
      assert.equal((await pool.query('SELECT 1 FROM users WHERE google_id=$1', [profile.id])).rowCount, 0);
    });
    await t.test('owner email cannot bypass admin provisioning through Google signup', async () => {
      profile = { ...profile, id: 'owner-google', emails: [{ value: process.env.ADMIN_EMAIL }], _json: { email_verified: true } };
      const response = await callback(await start());
      assert.equal(new URL(response.headers.get('location')).searchParams.get('error'), 'google_login_failed');
      assert.equal((await pool.query('SELECT 1 FROM users WHERE google_id=$1', [profile.id])).rowCount, 0);
    });
  } finally {
    if (server) await new Promise(resolve => server.close(resolve));
    await pool.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
    await pool.end();
  }
});
