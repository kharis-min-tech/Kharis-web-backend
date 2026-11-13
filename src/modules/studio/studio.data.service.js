import { badRequest, conflict, forbidden, HttpError, notfound } from '../../shared/errors/errors.js';
import {
  applyWhere,
  parseBranchId,
  parseConflict,
  parseKey,
  parseLimit,
  parseOrder,
  parseRow,
  parseStoragePaths,
  parseView,
  parseWhere,
  resourceFor,
} from './studio.data.rules.js';

const LEGACY_BUCKET = 'content';

/**
 * Supabase errors name tables, columns and policies, so only a safe message goes back.
 * Unknown errors are rethrown and end up as a 500.
 */
export function databaseError(error) {
  if (!error) return null;
  if (error instanceof HttpError) return error;
  switch (error.code) {
    case '42501':
      return forbidden("You don't have permission to do that.");
    case '23505':
      return conflict('Something with that value already exists.');
    case '23503':
      return conflict('This is still linked to other records.');
    case '23502':
      return badRequest('A required field is missing.');
    case '22P02':
    case '22007':
    case '22008':
    case '23514':
      return badRequest("One of the values isn't valid.");
    case 'PGRST116':
      return notfound('Not found');
    default:
      return error;
  }
}

async function run(query) {
  const { data, error, count } = await query;
  if (error) throw databaseError(error);
  return { data, count };
}

export const studioDataService = {
  async list(db, name, { where, order, limit, view } = {}) {
    const resource = resourceFor(name, 'list');
    const filters = parseWhere(resource, where);
    const sort = parseOrder(resource, order);
    let query = applyWhere(db.from(resource.table).select(parseView(resource, view)), filters);
    if (sort) query = query.order(sort.column, { ascending: sort.ascending });
    const { data } = await run(query.limit(parseLimit(limit)));
    return data ?? [];
  },

  async count(db, name, { where } = {}) {
    const resource = resourceFor(name, 'count');
    const filters = parseWhere(resource, where);
    const query = applyWhere(
      db.from(resource.table).select('*', { count: 'exact', head: true }),
      filters,
    );
    const { count } = await run(query);
    return count ?? 0;
  },

  async insert(db, name, row) {
    const resource = resourceFor(name, 'insert');
    const { data } = await run(db.from(resource.table).insert(parseRow(resource, row)).select().single());
    return data;
  },

  async upsert(db, name, row, { onConflict, returning = false } = {}) {
    const resource = resourceFor(name, 'upsert');
    const options = { onConflict: parseConflict(resource, onConflict) };
    const query = db.from(resource.table).upsert(parseRow(resource, row), options);
    if (!returning) {
      await run(query);
      return null;
    }
    const { data } = await run(query.select().single());
    return data;
  },

  async update(db, name, key, patch) {
    const resource = resourceFor(name, 'update');
    const values = parseRow(resource, patch);
    await run(db.from(resource.table).update(values).eq(resource.key, parseKey(resource, key)));
    return null;
  },

  async updateWhere(db, name, where, patch) {
    const resource = resourceFor(name, 'update');
    const filters = parseWhere(resource, where, { required: true });
    const values = parseRow(resource, patch);
    await run(applyWhere(db.from(resource.table).update(values), filters));
    return null;
  },

  async remove(db, name, key) {
    const resource = resourceFor(name, 'delete');
    await run(db.from(resource.table).delete().eq(resource.key, parseKey(resource, key)));
    return null;
  },

  async removeWhere(db, name, where) {
    const resource = resourceFor(name, 'delete');
    const filters = parseWhere(resource, where, { required: true });
    await run(applyWhere(db.from(resource.table).delete(), filters));
    return null;
  },

  /**
   * Hides a branch from the websites and app instead of deleting it. Deleting would cascade
   * to its venues, services, media and studio access, and unlink its events and messages.
   */
  async deactivateBranch(db, branchId) {
    const id = parseBranchId(branchId);
    const { data } = await run(
      db.from('branches').update({ is_active: false }).eq('id', id).select('id'),
    );
    if (!data?.length) throw notfound('Branch not found');
    return null;
  },

  /** Older uploads that still live in Supabase Storage. Storage policies decide who can remove. */
  async removeStoredFiles(db, paths) {
    const { error } = await db.storage.from(LEGACY_BUCKET).remove(parseStoragePaths(paths));
    if (error) throw new HttpError(502, "Those files couldn't be removed.");
    return null;
  },
};
