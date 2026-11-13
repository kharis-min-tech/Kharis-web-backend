import { supabase } from '../../config/supabase.js';
import { BRANCHES, STUDIO_BRANCH_ACCESS, STUDIO_USERS } from '../../shared/utils/table.js';

const AUTH_PAGE_SIZE = 1000;

function unwrap({ data, error }) {
  if (error) throw error;
  return data;
}

export const studioRepository = {
  async userFromToken(token) {
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user) return null;
    return data.user;
  },

  async findAccess(userId) {
    const [row, access] = await Promise.all([
      supabase.from(STUDIO_USERS).select('user_id, email, role').eq('user_id', userId).maybeSingle(),
      supabase.from(STUDIO_BRANCH_ACCESS).select('branch_id').eq('user_id', userId),
    ]);
    const user = unwrap(row);
    const branchIds = unwrap(access).map((item) => String(item.branch_id));
    return { email: user?.email ?? null, role: user?.role ?? 'none', branchIds };
  },

  /** Every studio row, keyed by user id, with its branch ids. */
  async listAccess() {
    const [users, access] = await Promise.all([
      supabase.from(STUDIO_USERS).select('user_id, email, role').then(unwrap),
      supabase.from(STUDIO_BRANCH_ACCESS).select('user_id, branch_id').then(unwrap),
    ]);
    const byUser = new Map(
      users.map((row) => [row.user_id, { email: row.email, role: row.role, branchIds: [] }]),
    );
    for (const row of access) {
      byUser.get(row.user_id)?.branchIds.push(String(row.branch_id));
    }
    return byUser;
  },

  async listAuthUsers() {
    const users = [];
    for (let page = 1; ; page += 1) {
      const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: AUTH_PAGE_SIZE });
      if (error) throw error;
      users.push(...data.users);
      if (data.users.length < AUTH_PAGE_SIZE) return users;
    }
  },

  async findAuthUser(userId) {
    const { data, error } = await supabase.auth.admin.getUserById(userId);
    if (error) {
      if (error.status === 404) return null;
      throw error;
    }
    return data?.user ?? null;
  },

  async findAccountByEmail(email) {
    const rows = unwrap(
      await supabase.from(STUDIO_USERS).select('user_id').eq('email', email).limit(1),
    );
    return rows[0] ?? null;
  },

  async countSuperAdmins() {
    const { count, error } = await supabase
      .from(STUDIO_USERS)
      .select('user_id', { count: 'exact', head: true })
      .eq('role', 'super_admin');
    if (error) throw error;
    return count ?? 0;
  },

  async existingBranchIds(ids) {
    if (!ids.length) return [];
    const rows = unwrap(await supabase.from(BRANCHES).select('id').in('id', ids));
    return rows.map((row) => String(row.id));
  },

  async invite(email, redirectTo) {
    const { data, error } = await supabase.auth.admin.inviteUserByEmail(
      email,
      redirectTo ? { redirectTo } : undefined,
    );
    if (error) throw error;
    return data.user;
  },

  async sendPasswordReset(email, redirectTo) {
    const { error } = await supabase.auth.resetPasswordForEmail(
      email,
      redirectTo ? { redirectTo } : undefined,
    );
    if (error) throw error;
  },

  async deleteAuthUser(userId) {
    const { error } = await supabase.auth.admin.deleteUser(userId);
    if (error) throw error;
  },

  async saveAccess(userId, email, { role, branchIds }) {
    unwrap(
      await supabase
        .from(STUDIO_USERS)
        .upsert({ user_id: userId, email, role }, { onConflict: 'user_id' }),
    );
    unwrap(await supabase.from(STUDIO_BRANCH_ACCESS).delete().eq('user_id', userId));
    if (branchIds.length) {
      unwrap(
        await supabase
          .from(STUDIO_BRANCH_ACCESS)
          .insert(branchIds.map((branchId) => ({ user_id: userId, branch_id: branchId }))),
      );
    }
  },
};
