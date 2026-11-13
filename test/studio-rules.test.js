import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkAccountDelete, planAccessChange, toAccount } from '../src/modules/studio/studio.rules.js';
import { inviteSchema, updateSchema } from '../src/modules/studio/studio.schema.js';
const BRANCH = '3f1c2a7e-8b4d-4c1e-9a2b-1d2e3f4a5b6c';
const OTHER = '9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d';

test('branch admins keep their branches; other roles keep none', () => {
  const target = { id: 'u2', role: 'none', branchIds: [] };
  assert.deepEqual(
    planAccessChange({ actorId: 'u1', target, change: { role: 'branch_admin', branchIds: [BRANCH, BRANCH] }, superAdminCount: 1 }),
    { role: 'branch_admin', branchIds: [BRANCH] },
  );
  assert.deepEqual(
    planAccessChange({
      actorId: 'u1',
      target: { id: 'u2', role: 'branch_admin', branchIds: [BRANCH] },
      change: { role: 'super_admin' },
      superAdminCount: 1,
    }),
    { role: 'super_admin', branchIds: [] },
  );
  assert.deepEqual(
    planAccessChange({
      actorId: 'u1',
      target: { id: 'u2', role: 'branch_admin', branchIds: [BRANCH] },
      change: { branchIds: [OTHER] },
      superAdminCount: 1,
    }),
    { role: 'branch_admin', branchIds: [OTHER] },
  );
});

test('refuses your own role, the last super admin and a branch admin with no branch', () => {
  assert.throws(
    () => planAccessChange({ actorId: 'u1', target: { id: 'u1', role: 'super_admin', branchIds: [] }, change: { role: 'none' }, superAdminCount: 3 }),
    /your own role/,
  );
  assert.throws(
    () => planAccessChange({ actorId: 'u1', target: { id: 'u2', role: 'super_admin', branchIds: [] }, change: { role: 'none' }, superAdminCount: 1 }),
    /at least one super admin/,
  );
  assert.throws(
    () => planAccessChange({ actorId: 'u1', target: { id: 'u2', role: 'none', branchIds: [] }, change: { role: 'branch_admin', branchIds: [] }, superAdminCount: 1 }),
    /at least one branch/,
  );
  assert.throws(
    () => checkAccountDelete({ actorId: 'u1', target: { id: 'u1', role: 'super_admin' }, superAdminCount: 2 }),
    /your own account/,
  );
  assert.throws(
    () => checkAccountDelete({ actorId: 'u1', target: { id: 'u2', role: 'super_admin' }, superAdminCount: 1 }),
    /at least one super admin/,
  );
  assert.doesNotThrow(() => checkAccountDelete({ actorId: 'u1', target: { id: 'u2', role: 'branch_admin' }, superAdminCount: 1 }));
});

test('accounts default to no access and use the Supabase Auth dates', () => {
  assert.deepEqual(
    toAccount({ id: 'u3', email: 'a@kharis.org', created_at: '2026-11-01T00:00:00Z', last_sign_in_at: null }, undefined),
    { id: 'u3', email: 'a@kharis.org', role: 'none', branchIds: [], createdAt: '2026-11-01T00:00:00Z', lastSignInAt: null },
  );
});
test('request bodies are checked', () => {
  assert.equal(inviteSchema.validate({ email: 'pastor@kharis.org', role: 'branch_admin', branchIds: [BRANCH] }).error, undefined);
  assert.ok(inviteSchema.validate({ email: 'not-an-email', role: 'branch_admin' }).error);
  assert.ok(inviteSchema.validate({ email: 'pastor@kharis.org', role: 'owner' }).error);
  assert.ok(updateSchema.validate({}).error);
  assert.ok(updateSchema.validate({ branchIds: ['london'] }).error);
});
