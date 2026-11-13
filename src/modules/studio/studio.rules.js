import { badRequest } from '../../shared/errors/errors.js';

export const STUDIO_ROLES = Object.freeze(['none', 'branch_admin', 'super_admin']);

export function isStudioRole(value) {
  return STUDIO_ROLES.includes(value);
}

const unique = (ids) => [...new Set((ids ?? []).map(String).filter(Boolean))];

/**
 * The role and branches a studio account ends up with after a change.
 * Branch admins need a branch; every other role keeps none.
 */
export function planAccessChange({ actorId, target, change, superAdminCount }) {
  const nextRole = change.role ?? target.role;
  if (!isStudioRole(nextRole)) throw badRequest('Unknown role.');

  if (target.id === actorId && nextRole !== target.role) {
    throw badRequest("You can't change your own role.");
  }
  if (target.role === 'super_admin' && nextRole !== 'super_admin' && superAdminCount <= 1) {
    throw badRequest('There must be at least one super admin.');
  }

  const branchIds = nextRole === 'branch_admin' ? unique(change.branchIds ?? target.branchIds) : [];
  if (nextRole === 'branch_admin' && branchIds.length === 0) {
    throw badRequest('A branch admin needs at least one branch.');
  }

  return { role: nextRole, branchIds };
}

export function checkAccountDelete({ actorId, target, superAdminCount }) {
  if (target.id === actorId) throw badRequest("You can't delete your own account.");
  if (target.role === 'super_admin' && superAdminCount <= 1) {
    throw badRequest('There must be at least one super admin.');
  }
}

export function toAccount(authUser, access) {
  return {
    id: authUser.id,
    email: authUser.email ?? access?.email ?? '',
    role: isStudioRole(access?.role) ? access.role : 'none',
    branchIds: access?.branchIds ?? [],
    createdAt: authUser.created_at ?? null,
    lastSignInAt: authUser.last_sign_in_at ?? null,
  };
}
