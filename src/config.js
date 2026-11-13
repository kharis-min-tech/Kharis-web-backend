// Every environment variable the API reads, in one place. Secrets are read
// here and nowhere else, so nothing below can accidentally echo them.

const env = process.env;

const list = (value) => (value ?? '').split(',').map((s) => s.trim()).filter(Boolean);

export const config = {
  port: env.PORT || 4000,
  corsOrigins: list(env.CORS_ORIGINS),

  supabase: {
    url: env.SUPABASE_URL,
    key: env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY,
    hasServiceRole: Boolean(env.SUPABASE_SERVICE_ROLE_KEY),
    // Public (publishable) key. Studio data routes use it with the editor's token so RLS applies.
    anonKey: env.SUPABASE_ANON_KEY || null,
    workspace: env.SUPABASE_WORKSPACE || null,
  },

  studio: {
    // Invite and password reset emails link back to {url}/set-password.
    url: (env.STUDIO_URL || '').replace(/\/+$/, '') || null,
  },
};
