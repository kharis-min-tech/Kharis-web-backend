import { createClient } from '@supabase/supabase-js';
import { config } from '../config.js';

const { url: SUPABASE_URL, key: SUPABASE_KEY } = config.supabase;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ANON_KEY) in .env');
}

// Server-only client. The service role key bypasses Row Level Security, so it
// must never be shipped to the app; the anon key works if RLS allows public reads.
export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_KEY,
  { auth: { persistSession: false } },
);

/**
 * A client that acts as the signed-in Content Studio user. It uses the public key
 * plus their access token, so Row Level Security decides what they can read and write.
 * Returns null when SUPABASE_ANON_KEY is not set; never falls back to the service role.
 */
export function supabaseAs(accessToken) {
  if (!config.supabase.anonKey) return null;
  return createClient(SUPABASE_URL, config.supabase.anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}

// Rows are shared between the website and the app; this picks the app's rows.
// Leave unset to return every workspace.
export const WORKSPACE = config.supabase.workspace;

export function forWorkspace(query) {
  return WORKSPACE ? query.eq('workspace', WORKSPACE) : query;
}
