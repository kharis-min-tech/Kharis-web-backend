export const API_CACHE_CONTROL = 'public, max-age=300';

/** Wraps an async handler so thrown errors reach the Express error handler. */
export const handle = (fn) => (req, res, next) => fn(req, res).catch(next);

/** Throws on a Supabase error so routes can just destructure `data`. */
export function unwrap({ data, error }) {
  if (error) throw error;
  return data;
}

export function clampLimit(value, fallback, max) {
  return Math.min(parseInt(value, 10) || fallback, max);
}
