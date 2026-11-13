import { badRequest, notfound } from '../../shared/errors/errors.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_LIMIT = 1000;
const MAX_IN = 500;

/**
 * Tables Content Studio may use, the fields it may write, and what it may filter
 * and sort by. Row Level Security still decides which rows each account can touch.
 *   ops: list, count, insert, upsert, update, delete
 *   key: primary key used by /:resource/:id (default id)
 */
export const RESOURCES = {
  events: {
    table: 'events',
    ops: ['list', 'count', 'upsert', 'update', 'delete'],
    columns: [
      'id', 'title', 'description', 'location', 'branch_id', 'branch_name', 'start_time',
      'end_time', 'category', 'recurrence', 'recurrence_days', 'recurrence_until', 'sites',
      'is_featured', 'image_url', 'workspace',
    ],
    filters: ['id', 'workspace', 'branch_id'],
    orders: ['start_time'],
  },
  sermons: {
    table: 'sermons',
    ops: ['list', 'count', 'upsert', 'update', 'delete'],
    columns: [
      'id', 'title', 'speaker', 'date', 'series', 'description', 'video_url', 'audio_url',
      'thumbnail', 'published',
    ],
    filters: ['id'],
    orders: ['date'],
  },
  news: {
    table: 'news',
    ops: ['list', 'count', 'upsert', 'update', 'delete'],
    columns: ['id', 'workspace', 'title', 'body', 'image', 'published'],
    filters: ['id', 'workspace'],
    orders: ['created_at'],
  },
  testimonies: {
    table: 'testimonies',
    ops: ['list', 'count', 'upsert', 'update', 'delete'],
    columns: [
      'id', 'name', 'branch_name', 'category', 'short_description', 'description', 'image_url',
      'is_anonymous', 'workspace', 'is_featured', 'is_featured_giving', 'is_published',
    ],
    filters: ['id', 'workspace'],
    orders: ['name'],
  },
  visitors: {
    table: 'visitors',
    ops: ['list', 'count', 'upsert', 'update', 'delete'],
    columns: ['id', 'name', 'email', 'phone', 'branch_name', 'message'],
    filters: ['id'],
    orders: ['created_at'],
  },
  daily_entries: {
    table: 'daily_entries',
    ops: ['list', 'count', 'upsert', 'update', 'delete'],
    columns: ['id', 'workspace', 'kind', 'date', 'title', 'body', 'reference'],
    filters: ['id', 'workspace', 'kind'],
    orders: ['date'],
  },
  daily_messages: {
    table: 'daily_messages',
    ops: ['list', 'count', 'upsert', 'update', 'delete'],
    columns: ['id', 'date', 'day', 'workspace', 'sermon_id', 'sermon_title', 'note'],
    filters: ['id'],
    orders: ['date'],
    conflicts: ['date'],
  },
  app_config: {
    table: 'app_config',
    key: 'key',
    ops: ['list', 'count', 'upsert'],
    columns: ['key', 'value'],
    filters: ['key'],
    orders: [],
  },
  featured_videos: {
    table: 'featured_videos',
    ops: ['list', 'count', 'upsert', 'update', 'delete'],
    columns: ['id', 'workspace', 'title', 'video_url', 'published'],
    filters: ['id', 'workspace'],
    orders: [],
  },
  contact_messages: {
    table: 'contact_messages',
    ops: ['list', 'count', 'update', 'delete'],
    columns: ['status'],
    filters: ['id', 'workspace', 'status'],
    orders: ['created_at'],
  },
  newsletter_subscribers: {
    table: 'newsletter_subscribers',
    ops: ['list', 'count', 'delete'],
    columns: [],
    filters: ['id', 'source'],
    orders: ['created_at'],
  },
  branches: {
    table: 'branches',
    ops: ['list', 'count', 'insert', 'update'],
    columns: [
      'name', 'slug', 'subtitle', 'short_description', 'description', 'hero_image_url',
      'pastor_name', 'pastor_role', 'pastor_image_url', 'pastor_bio', 'contact_email',
      'contact_phone', 'instagram', 'giving_link', 'sort_order', 'is_active', 'workspace',
    ],
    filters: ['id', 'slug'],
    orders: ['sort_order', 'name'],
    views: { full: '*, venues(*), services(*)', options: 'id, name, is_active' },
  },
  venues: {
    table: 'venues',
    ops: ['list', 'insert', 'update', 'delete'],
    columns: [
      'branch_id', 'name', 'address_line1', 'address_line2', 'city', 'postcode', 'country',
      'latitude', 'longitude', 'parking_info', 'public_transport_info', 'is_active',
    ],
    filters: ['id', 'branch_id'],
    orders: [],
  },
  services: {
    table: 'services',
    ops: ['list', 'insert', 'update', 'delete'],
    columns: [
      'branch_id', 'name', 'type', 'day', 'start_time', 'description', 'sort_order', 'is_active',
      'venue_id',
    ],
    filters: ['id', 'branch_id'],
    orders: ['sort_order'],
  },
  media: {
    table: 'media',
    ops: ['list', 'count', 'insert', 'update', 'delete'],
    columns: [
      'owner_type', 'owner_id', 'branch_id', 'storage_path', 'url', 'folder', 'sort_order',
    ],
    filters: ['id', 'owner_type', 'owner_id', 'branch_id', 'branch'],
    orders: ['sort_order'],
  },
};

export function resourceFor(name, op) {
  const resource = Object.hasOwn(RESOURCES, name) ? RESOURCES[name] : null;
  if (!resource) throw notfound('Unknown studio resource');
  if (op && !resource.ops.includes(op)) throw badRequest(`Studio can't ${op} ${name}`);
  return { name, key: 'id', views: {}, conflicts: [], ...resource };
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isScalar(value) {
  return ['string', 'number', 'boolean'].includes(typeof value);
}

/**
 * Turns { column: value } into filters. A value can be a string, number or boolean
 * (equals), null (is null) or an array (in). `branch` on media matches branch_id or owner_id.
 */
export function parseWhere(resource, where, { required = false } = {}) {
  if (where == null) where = {};
  if (!isPlainObject(where)) throw badRequest('where must be an object');
  const filters = Object.entries(where).map(([column, value]) => {
    if (!resource.filters.includes(column)) throw badRequest(`Can't filter ${resource.name} by ${column}`);
    if (column === 'branch') {
      if (typeof value !== 'string' || !UUID.test(value)) throw badRequest('branch must be a branch id');
      return { column, op: 'branch', value };
    }
    if (value === null) return { column, op: 'is', value: null };
    if (Array.isArray(value)) {
      if (value.length > MAX_IN || !value.every(isScalar)) {
        throw badRequest(`${column} must be a list of up to ${MAX_IN} values`);
      }
      return { column, op: 'in', value };
    }
    if (!isScalar(value)) throw badRequest(`${column} must be text, a number, true/false or null`);
    return { column, op: 'eq', value };
  });
  if (required && !filters.length) throw badRequest('Add at least one filter');
  return filters;
}

export function parseOrder(resource, order) {
  if (order == null || order === '') return null;
  if (typeof order !== 'string') throw badRequest('order must be a column name');
  const descending = order.startsWith('-');
  const column = descending ? order.slice(1) : order;
  if (!resource.orders.includes(column)) throw badRequest(`Can't sort ${resource.name} by ${column}`);
  return { column, ascending: !descending };
}

export function parseLimit(limit) {
  if (limit == null) return MAX_LIMIT;
  const value = Number(limit);
  if (!Number.isInteger(value) || value < 1) throw badRequest('limit must be a whole number above 0');
  return Math.min(value, MAX_LIMIT);
}

export function parseView(resource, view) {
  if (view == null || view === '') return '*';
  if (!Object.hasOwn(resource.views, view)) throw badRequest(`Unknown ${resource.name} view`);
  return resource.views[view];
}

/** Only the resource's writable fields; anything else is rejected so mistakes surface. */
export function parseRow(resource, row) {
  if (!isPlainObject(row)) throw badRequest('row must be an object');
  const unknown = Object.keys(row).filter((column) => !resource.columns.includes(column));
  if (unknown.length) throw badRequest(`Unknown ${resource.name} field: ${unknown.join(', ')}`);
  if (!Object.keys(row).length) throw badRequest('row is empty');
  return row;
}

export function parseConflict(resource, onConflict) {
  if (onConflict == null || onConflict === '') return undefined;
  if (!resource.conflicts.includes(onConflict)) throw badRequest(`Can't upsert ${resource.name} on ${onConflict}`);
  return onConflict;
}

export function parseKey(resource, value) {
  const key = String(value ?? '').trim();
  if (!key || key.length > 200) throw badRequest(`Invalid ${resource.key}`);
  if (resource.key === 'id' && !UUID.test(key)) throw badRequest('Invalid id');
  return key;
}

export function parseBranchId(value) {
  if (typeof value !== 'string' || !UUID.test(value)) throw badRequest('Invalid branch id');
  return value;
}

/** Paths in the legacy Supabase Storage bucket (older uploads). */
export function parseStoragePaths(paths) {
  if (!Array.isArray(paths) || !paths.length || paths.length > 50) {
    throw badRequest('paths must be a list of 1 to 50 file paths');
  }
  return paths.map((path) => {
    const value = typeof path === 'string' ? path.trim() : '';
    if (!value || value.length > 500 || value.includes('..') || value.startsWith('/')) {
      throw badRequest('Invalid file path');
    }
    return value;
  });
}

/** Applies parsed filters to a Supabase query. */
export function applyWhere(query, filters) {
  let next = query;
  for (const filter of filters) {
    if (filter.op === 'eq') next = next.eq(filter.column, filter.value);
    else if (filter.op === 'in') next = next.in(filter.column, filter.value);
    else if (filter.op === 'is') next = next.is(filter.column, null);
    else if (filter.op === 'branch') {
      next = next.or(`branch_id.eq.${filter.value},owner_id.eq.${filter.value}`);
    }
  }
  return next;
}
