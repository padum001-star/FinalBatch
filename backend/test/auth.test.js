const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

test('database-backed authentication and favourites', { skip: !process.env.TEST_DATABASE_URL }, async t => {
  // Every run has a separate schema, even on a shared test database.
  const schema = `test_${crypto.randomBytes(8).toString('hex')}`;
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
  process.env.JWT_SECRET = crypto.randomBytes(32).toString('hex');
  process.env.SESSION_SECRET = crypto.randomBytes(32).toString('hex');
  process.env.ADMIN_EMAIL = 'owner@example.com';
  process.env.GOOGLE_CLIENT_ID = '';
  process.env.GOOGLE_CLIENT_SECRET = '';
  process.env.PGOPTIONS = `-c search_path=${schema},public`;
  const pool = require('../db');
  await pool.query(`CREATE SCHEMA ${schema}`);
  const app = require('../server');
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const request = async (route, method = 'GET', body, token) => {
    const response = await fetch(base + route, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
    return { status: response.status, data: response.status === 204 ? null : await response.json() };
  };
  try {
    await pool.query(fs.readFileSync(path.join(__dirname, '../../database/food_rescue_schema.sql'), 'utf8'));
    const migration = fs.readFileSync(path.join(__dirname, '../../database/migrations/001_auth_and_favourites.sql'), 'utf8');
    await pool.query(migration);
    await pool.query(migration);
    let first, second;
    await t.test('signup persists normalized account, consumer, and password hash', async () => {
      first = await request('/auth/signup', 'POST', { email: '  Person@Example.com ', name: 'Person', password: 'Good-password-42', role: 'admin' });
      assert.equal(first.status, 201);
      assert.equal(first.data.user.role, 'consumer');
      assert.equal(first.data.user.email, 'person@example.com');
      assert.equal((await pool.query('SELECT * FROM consumers WHERE user_id=$1', [first.data.user.id])).rowCount, 1);
      const stored = (await pool.query('SELECT password_hash FROM users WHERE user_id=$1', [first.data.user.id])).rows[0];
      assert.notEqual(stored.password_hash, 'Good-password-42');
      assert.ok(await require('bcryptjs').compare('Good-password-42', stored.password_hash));
    });
    await t.test('rejects duplicate, malformed, weak, and reserved-owner signup', async () => {
      assert.equal((await request('/auth/signup', 'POST', { email: 'PERSON@example.com', name: 'Other', password: 'Good-password-42' })).status, 409);
      assert.equal((await request('/auth/signup', 'POST', { email: [], password: {} })).status, 400);
      assert.equal((await request('/auth/signup', 'POST', { email: 'weak@example.com', name: 'Weak', password: '123' })).status, 400);
      assert.equal((await request('/auth/signup', 'POST', { email: 'owner@example.com', name: 'Owner', password: 'Good-password-42' })).status, 403);
    });
    await t.test('login and protected profile require valid database account', async () => {
      assert.equal((await request('/auth/login', 'POST', { email: 'PERSON@example.com', password: 'Good-password-42' })).status, 200);
      assert.equal((await request('/auth/login', 'POST', { email: 'person@example.com', password: 'incorrect' })).status, 401);
      assert.equal((await request('/auth/me')).status, 401);
      assert.equal((await request('/auth/me', 'GET', null, 'tampered')).status, 401);
      assert.equal((await request('/auth/me', 'GET', null, first.data.token)).data.name, 'Person');
    });
    await t.test('favourites persist, are idempotent, and stay private to each user', async () => {
      second = await request('/auth/signup', 'POST', { email: 'second@example.com', name: 'Second', password: 'Good-password-42' });
      assert.equal((await request('/favourites')).status, 401);
      assert.equal((await request('/favourites/c1', 'PUT', null, first.data.token)).status, 204);
      assert.equal((await request('/favourites/c1', 'PUT', null, first.data.token)).status, 204);
      assert.deepEqual((await request('/favourites', 'GET', null, first.data.token)).data.placeIds, ['Bread & Butter Bakery']);
      assert.deepEqual((await request('/favourites', 'GET', null, second.data.token)).data.placeIds, []);
      assert.equal((await request('/favourites/unknown', 'PUT', null, first.data.token)).status, 404);
      assert.equal((await request('/favourites/c1', 'DELETE', null, first.data.token)).status, 204);
      assert.deepEqual((await request('/favourites', 'GET', null, first.data.token)).data.placeIds, []);
    });
    await t.test('admin needs both designated email and database role', async () => {
      assert.equal((await request('/auth/admin/login', 'POST', { email: 'person@example.com', password: 'Good-password-42' })).status, 401);
      assert.equal((await request('/auth/admin/me', 'GET', null, first.data.token)).status, 403);
      const hash = await require('bcryptjs').hash('Owner-password-42', 12);
      await pool.query("INSERT INTO users (email, full_name, password_hash, role) VALUES ('owner@example.com','Owner',$1,'admin')", [hash]);
      const owner = await request('/auth/admin/login', 'POST', { email: 'OWNER@example.com', password: 'Owner-password-42' });
      assert.equal(owner.status, 200);
      assert.equal((await request('/auth/admin/me', 'GET', null, owner.data.token)).status, 200);
      await pool.query("UPDATE users SET role='consumer' WHERE email='owner@example.com'");
      assert.equal((await request('/auth/admin/me', 'GET', null, owner.data.token)).status, 403);
    });
    await t.test('OAuth exchange requires proof, rejects expiry, and consumes codes once', async () => {
      const digest = value => crypto.createHash('sha256').update(value).digest('hex');
      const code = crypto.randomBytes(32).toString('hex');
      const verifier = crypto.randomBytes(32).toString('hex');
      await pool.query("INSERT INTO oauth_codes VALUES ($1,$2,$3,now()+interval '2 minutes')", [digest(code), first.data.user.id, digest(verifier)]);
      assert.equal((await request('/auth/exchange', 'POST', { code, verifier: '0'.repeat(64) })).status, 401);
      assert.equal((await request('/auth/exchange', 'POST', { code, verifier })).status, 200);
      assert.equal((await request('/auth/exchange', 'POST', { code, verifier })).status, 401);
      await pool.query("INSERT INTO oauth_codes VALUES ($1,$2,$3,now()-interval '1 second')", [digest(code), first.data.user.id, digest(verifier)]);
      assert.equal((await request('/auth/exchange', 'POST', { code, verifier })).status, 401);
      assert.equal((await request('/auth/google?challenge=' + digest(verifier))).status, 503);
    });
    await t.test('failed consumer insertion rolls back user creation', async () => {
      await pool.query("INSERT INTO consumers (email, full_name) VALUES ('collision@example.com','Existing')");
      await request('/auth/signup', 'POST', { email: 'collision@example.com', name: 'Collision', password: 'Good-password-42' });
      assert.equal((await pool.query("SELECT * FROM users WHERE email='collision@example.com'")).rowCount, 0);
    });
    await t.test('catalog exposes the existing demo cards', async () => {
      const catalog = await request('/listings');
      assert.equal(catalog.status, 200);
      assert.equal(catalog.data.length, 8);
    });
  } finally {
    await new Promise(resolve => server.close(resolve));
    await pool.query(`DROP SCHEMA ${schema} CASCADE`);
    await pool.end();
  }
});
