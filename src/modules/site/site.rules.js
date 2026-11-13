import { badRequest } from '../../shared/errors/errors.js';

export const SITE_MEDIA_TYPES = ['branch-gallery', 'branch-video', 'department-video'];

/** "a,b" or ["a","b"] -> known media types; empty means all of them. */
export function mediaTypes(value) {
  const wanted = (Array.isArray(value) ? value.join(',') : String(value ?? ''))
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  if (!wanted.length) return SITE_MEDIA_TYPES;
  const unknown = wanted.filter((item) => !SITE_MEDIA_TYPES.includes(item));
  if (unknown.length) throw badRequest(`ownerType must be one of ${SITE_MEDIA_TYPES.join(', ')}`);
  return wanted;
}
