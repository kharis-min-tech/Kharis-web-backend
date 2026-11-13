import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  applyWhere,
  parseLimit,
  parseOrder,
  parseRow,
  parseStoragePaths,
  parseView,
  parseWhere,
  resourceFor,
} from '../src/modules/studio/studio.data.rules.js';
import { databaseError } from '../src/modules/studio/studio.data.service.js';
import { mediaTypes } from '../src/modules/site/site.rules.js';

const BRANCH = '3f1c2a7e-8b4d-4c1e-9a2b-1d2e3f4a5b6c';

test('only listed studio tables and operations are allowed', () => {
  assert.equal(resourceFor('events', 'upsert').table, 'events');
  assert.equal(resourceFor('app_config').key, 'key');
  assert.throws(() => resourceFor('studio_users'), /Unknown studio resource/);
  assert.throws(() => resourceFor('toString'), /Unknown studio resource/);
  assert.throws(() => resourceFor('newsletter_subscribers', 'upsert'), /can't upsert/);
  assert.throws(() => resourceFor('branches', 'delete'), /can't delete/);
});

test('filters become eq, in, is null and the media branch match', () => {
  const media = resourceFor('media');
  assert.deepEqual(parseWhere(media, { owner_type: 'branch-gallery', branch_id: null }), [
    { column: 'owner_type', op: 'eq', value: 'branch-gallery' },
    { column: 'branch_id', op: 'is', value: null },
  ]);
  assert.deepEqual(parseWhere(resourceFor('events'), { branch_id: [BRANCH] }), [
    { column: 'branch_id', op: 'in', value: [BRANCH] },
  ]);
  assert.deepEqual(parseWhere(media, { branch: BRANCH }), [
    { column: 'branch', op: 'branch', value: BRANCH },
  ]);
  assert.throws(() => parseWhere(media, { branch: 'x),id.neq.0' }), /branch id/);
  assert.throws(() => parseWhere(media, { password: 'x' }), /Can't filter/);
  assert.throws(() => parseWhere(media, { url: { nested: true } }), /Can't filter/);
  assert.throws(() => parseWhere(media, { owner_id: { nested: true } }), /must be text/);
  assert.throws(() => parseWhere(media, {}, { required: true }), /at least one filter/);
});

test('applyWhere maps each filter onto the Supabase query', () => {
  const calls = [];
  const query = new Proxy({}, {
    get: (_target, method) => (...args) => {
      calls.push([method, ...args]);
      return query;
    },
  });
  applyWhere(query, parseWhere(resourceFor('media'), {
    owner_type: 'branch-video',
    owner_id: [BRANCH],
    branch_id: null,
    branch: BRANCH,
  }));
  assert.deepEqual(calls, [
    ['eq', 'owner_type', 'branch-video'],
    ['in', 'owner_id', [BRANCH]],
    ['is', 'branch_id', null],
    ['or', `branch_id.eq.${BRANCH},owner_id.eq.${BRANCH}`],
  ]);
});

test('rows only carry writable fields', () => {
  const events = resourceFor('events');
  assert.deepEqual(parseRow(events, { title: 'Prayer night' }), { title: 'Prayer night' });
  assert.throws(() => parseRow(events, { title: 'x', created_by: 'me' }), /Unknown events field: created_by/);
  assert.throws(() => parseRow(resourceFor('contact_messages'), { message: 'edited' }), /Unknown/);
  assert.throws(() => parseRow(events, {}), /empty/);
  assert.throws(() => parseRow(events, []), /must be an object/);
});

test('order, limit, view and storage paths are checked', () => {
  const branches = resourceFor('branches');
  assert.deepEqual(parseOrder(branches, '-sort_order'), { column: 'sort_order', ascending: false });
  assert.equal(parseOrder(branches, undefined), null);
  assert.throws(() => parseOrder(branches, 'contact_email'), /Can't sort/);
  assert.equal(parseLimit(undefined), 1000);
  assert.equal(parseLimit(5000), 1000);
  assert.throws(() => parseLimit(0), /whole number/);
  assert.equal(parseView(branches, 'options'), 'id, name, is_active');
  assert.equal(parseView(resourceFor('events')), '*');
  assert.throws(() => parseView(branches, '*, studio_users(*)'), /Unknown branches view/);
  assert.deepEqual(parseStoragePaths(['branches/a.jpg']), ['branches/a.jpg']);
  assert.throws(() => parseStoragePaths(['../secret']), /Invalid file path/);
  assert.throws(() => parseStoragePaths([]), /1 to 50/);
});

test('database errors become safe messages', () => {
  assert.equal(databaseError({ code: '42501', message: 'policy x on table y' }).status, 403);
  assert.equal(databaseError({ code: '23505', message: 'branches_slug_key' }).status, 409);
  assert.equal(databaseError({ code: '22P02' }).status, 400);
  const unknown = { code: 'XX000', message: 'boom' };
  assert.equal(databaseError(unknown), unknown);
});

test('site media types are limited to public ones', () => {
  assert.deepEqual(mediaTypes('branch-gallery, branch-video'), ['branch-gallery', 'branch-video']);
  assert.deepEqual(mediaTypes(undefined), ['branch-gallery', 'branch-video', 'department-video']);
  assert.throws(() => mediaTypes('branch-venue'), /ownerType/);
});
