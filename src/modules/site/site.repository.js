import { supabase } from '../../config/supabase.js';
import { BRANCHES, MEDIA, TESTIMONIES } from '../../shared/utils/table.js';

const MEDIA_FIELDS = 'id, branch_id, owner_id, owner_type, folder, url, sort_order';

const TESTIMONY_FIELDS = [
  'name',
  'branch_name',
  'category',
  'short_description',
  'description',
  'image_url',
  'is_anonymous',
  'workspace',
  'is_featured',
  'is_featured_giving',
].join(', ');

const EVENT_FIELDS = [
  'id',
  'title',
  'description',
  'location',
  'branch_id',
  'branch_name',
  'start_time',
  'end_time',
  'recurrence',
  'recurrence_days',
  'recurrence_until',
  'is_featured',
  'image_url',
  'category',
  'sites',
  'workspace',
].join(', ');

function unwrap({ data, error }) {
  if (error) throw error;
  return data;
}

/** Active branches with only their active venues and services. */
function activeBranches() {
  return supabase
    .from(BRANCHES)
    .select('*, venues(*), services(*)')
    .eq('is_active', true)
    .eq('venues.is_active', true)
    .eq('services.is_active', true);
}

/** Raw rows, in the same shape the websites read from Supabase. Only public rows. */
export const siteRepository = {
  async branches() {
    return unwrap(await activeBranches().order('sort_order', { ascending: true })) ?? [];
  },

  async branchBySlug(slug) {
    return unwrap(await activeBranches().eq('slug', slug).maybeSingle());
  },

  async media(ownerTypes) {
    return unwrap(
      await supabase
        .from(MEDIA)
        .select(MEDIA_FIELDS)
        .in('owner_type', ownerTypes)
        .order('sort_order', { ascending: true }),
    ) ?? [];
  },

  async testimonies() {
    const rows = unwrap(
      await supabase
        .from(TESTIMONIES)
        .select(TESTIMONY_FIELDS)
        .or('is_published.is.null,is_published.eq.true'),
    ) ?? [];
    return rows.map((row) => (row.is_anonymous ? { ...row, name: 'Anonymous' } : row));
  },

  async events() {
    return unwrap(
      await supabase.from('events').select(EVENT_FIELDS).order('start_time', { ascending: true }),
    ) ?? [];
  },
};
