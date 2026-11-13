import { config } from '../../config.js';
import { badRequest, conflict, notfound } from '../../shared/errors/errors.js';
import { studioRepository } from './studio.repository.js';
import { checkAccountDelete, planAccessChange, toAccount } from './studio.rules.js';

function setPasswordUrl() {
  return config.studio.url ? `${config.studio.url}/set-password` : undefined;
}

async function checkBranches(branchIds) {
  const found = new Set(await studioRepository.existingBranchIds(branchIds));
  if (branchIds.some((id) => !found.has(id))) throw badRequest('One of those branches does not exist.');
}

async function loadAccount(userId) {
  const authUser = await studioRepository.findAuthUser(userId);
  if (!authUser) throw notfound('Account not found');
  const access = await studioRepository.findAccess(userId);
  return toAccount(authUser, access);
}

export const studioService = {
  async me(studio) {
    return { id: studio.id, email: studio.email, role: studio.role, branchIds: studio.branchIds };
  },

  async listUsers() {
    const [authUsers, access] = await Promise.all([
      studioRepository.listAuthUsers(),
      studioRepository.listAccess(),
    ]);
    return authUsers
      .map((user) => toAccount(user, access.get(user.id)))
      .sort((a, b) => a.email.localeCompare(b.email));
  },

  async invite(actor, { email, role, branchIds }) {
    const address = email.trim().toLowerCase();
    if (await studioRepository.findAccountByEmail(address)) {
      throw conflict('That email already has an account.');
    }
    const plan = planAccessChange({
      actorId: actor.id,
      target: { id: null, role: 'none', branchIds: [] },
      change: { role, branchIds },
      superAdminCount: Infinity,
    });
    await checkBranches(plan.branchIds);

    let user;
    try {
      user = await studioRepository.invite(address, setPasswordUrl());
    } catch (error) {
      if (error?.status === 422) throw conflict('That email already has an account.');
      throw error;
    }
    await studioRepository.saveAccess(user.id, address, plan);
    return loadAccount(user.id);
  },

  async update(actor, userId, change) {
    const target = await loadAccount(userId);
    const plan = planAccessChange({
      actorId: actor.id,
      target,
      change,
      superAdminCount: await studioRepository.countSuperAdmins(),
    });
    await checkBranches(plan.branchIds);
    await studioRepository.saveAccess(userId, target.email, plan);
    return loadAccount(userId);
  },

  async remove(actor, userId) {
    const target = await loadAccount(userId);
    checkAccountDelete({
      actorId: actor.id,
      target,
      superAdminCount: await studioRepository.countSuperAdmins(),
    });
    await studioRepository.deleteAuthUser(userId);
    return null;
  },

  async sendPasswordReset(userId) {
    const target = await loadAccount(userId);
    if (!target.email) throw badRequest('This account has no email address.');
    await studioRepository.sendPasswordReset(target.email, setPasswordUrl());
    return null;
  },
};
