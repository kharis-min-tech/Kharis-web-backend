import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';

// Config is read when the app is imported, so set it first. Nothing here reaches
// Supabase: port 9 refuses connections and sign-in is stubbed below.
process.env.SUPABASE_URL = 'http://127.0.0.1:9';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role';
process.env.SUPABASE_ANON_KEY = 'test-anon';
process.env.CORS_ORIGINS = 'http://localhost:3002';

const { app } = await import('../src/app.js');
const { studioRepository } = await import('../src/modules/studio/studio.repository.js');

const WAITING = { id: 'u-none', email: 'new@kharis.org' };
studioRepository.userFromToken = async (token) => (token === 'waiting' ? WAITING : null);
studioRepository.findAccess = async () => ({ role: 'none', branchIds: [], email: WAITING.email });

let server;
let base;

before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(() => server.close());

async function call(method, path, { token, body, headers = {} } = {}) {
  const res = await fetch(base + path, {
    method,
    headers: {
      ...(body !== undefined ? { 'content-type': 'application/json' } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
  });
  const text = await res.text();
  return { status: res.status, headers: res.headers, json: text ? JSON.parse(text) : null };
}

const ID = '3f1c2a7e-8b4d-4c1e-9a2b-1d2e3f4a5b6c';

test('health check', async () => {
  const res = await call('GET', '/health');
  assert.equal(res.status, 200);
  assert.deepEqual(res.json, { status: 'ok' });
});

test('studio routes need a valid Supabase token', async () => {
  for (const token of [undefined, 'expired']) {
    const res = await call('GET', '/v1/studio/me', { token });
    assert.equal(res.status, 401);
    assert.equal(res.json.status, false);
    assert.equal(typeof res.json.message, 'string');
  }
});

test('an account without a role can read /me and nothing else', async () => {
  const me = await call('GET', '/v1/studio/me', { token: 'waiting' });
  assert.equal(me.status, 200);
  assert.equal(me.json.status, true);
  assert.deepEqual(
    { id: me.json.data.id, email: me.json.data.email, role: me.json.data.role, branchIds: me.json.data.branchIds },
    { id: WAITING.id, email: WAITING.email, role: 'none', branchIds: [] },
  );

  const superAdminOnly = [
    ['GET', '/v1/studio/users'],
    ['POST', '/v1/studio/users', { email: 'a@kharis.org', role: 'branch_admin', branchIds: [ID] }],
    ['PATCH', `/v1/studio/users/${ID}`, { role: 'none' }],
    ['DELETE', `/v1/studio/users/${ID}`],
    ['POST', `/v1/studio/users/${ID}/password-reset`],
  ];
  for (const [method, path, body] of superAdminOnly) {
    const res = await call(method, path, { token: 'waiting', body });
    assert.equal(res.status, 403, `${method} ${path}`);
    assert.match(res.json.message, /super admins/);
  }

  const editorOnly = [
    ['POST', '/v1/studio/data/events/query', { where: {} }],
    ['POST', '/v1/studio/data/events/count', { where: {} }],
    ['POST', '/v1/studio/data/events/delete', { where: { id: ID } }],
    ['POST', '/v1/studio/data/events', { row: { title: 'x' } }],
    ['PUT', '/v1/studio/data/events', { row: { title: 'x' } }],
    ['PATCH', '/v1/studio/data/events', { where: { id: ID }, patch: { title: 'x' } }],
    ['PATCH', `/v1/studio/data/events/${ID}`, { patch: { title: 'x' } }],
    ['DELETE', `/v1/studio/data/events/${ID}`],
    ['POST', `/v1/studio/branches/${ID}/deactivate`],
    ['POST', '/v1/studio/storage/remove', { paths: ['branches/a.jpg'] }],
  ];
  for (const [method, path, body] of editorOnly) {
    const res = await call(method, path, { token: 'waiting', body });
    assert.equal(res.status, 403, `${method} ${path}`);
    assert.equal(res.json.message, 'Your account is waiting for access.');
  }
});

test('site routes check their input before reading', async () => {
  const media = await call('GET', '/v1/site/media?ownerType=branch-venue');
  assert.equal(media.status, 400);
  assert.match(media.json.message, /ownerType/);

  const branch = await call('GET', '/v1/site/branches/not%20a%20slug');
  assert.equal(branch.status, 404);
  assert.equal(branch.json.message, 'Branch not found');
});

test('forms validate, and the honeypot is accepted silently', async () => {
  for (const path of ['/api/contact', '/api/visitors', '/api/quiz']) {
    const invalid = await call('POST', path, { body: {} });
    assert.equal(invalid.status, 400, path);
    assert.equal(typeof invalid.json.message, 'string');

    const bot = await call('POST', path, { body: { company: 'Acme Ltd' } });
    assert.equal(bot.status, 201, path);
    assert.deepEqual(bot.json.data, { id: null });
  }

  const malformed = await call('POST', '/api/contact', { body: '{"email":' });
  assert.equal(malformed.status, 400);
  assert.equal(malformed.json.message, 'Invalid JSON body');
});

test('unknown routes return 404 and CORS allows only the configured origins', async () => {
  const missing = await call('GET', '/getEvents');
  assert.equal(missing.status, 404);
  assert.deepEqual(missing.json, { error: 'Not found' });

  const allowed = await call('OPTIONS', '/v1/studio/me', {
    headers: { origin: 'http://localhost:3002', 'access-control-request-method': 'GET' },
  });
  assert.equal(allowed.headers.get('access-control-allow-origin'), 'http://localhost:3002');

  const blocked = await call('OPTIONS', '/v1/studio/me', {
    headers: { origin: 'https://evil.example', 'access-control-request-method': 'GET' },
  });
  assert.equal(blocked.headers.get('access-control-allow-origin'), null);
});
