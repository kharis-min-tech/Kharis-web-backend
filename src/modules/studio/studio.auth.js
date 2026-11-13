import { config } from '../../config.js';
import { supabaseAs } from '../../config/supabase.js';
import { forbidden, HttpError, unauthorized } from '../../shared/errors/errors.js';
import { studioRepository } from './studio.repository.js';

function bearer(req) {
  const match = /^Bearer (.+)$/.exec(req.get('authorization') ?? '');
  return match?.[1]?.trim() || null;
}

/**
 * Checks a Content Studio (Supabase Auth) access token and attaches
 *   req.studio = { id, email, role, branchIds }
 * Studio accounts are separate from the app's users table and its JWTs.
 */
export const requireStudioUser = async (req, res, next) => {
  try {
    if (!config.supabase.hasServiceRole) {
      throw new HttpError(503, 'Account management needs SUPABASE_SERVICE_ROLE_KEY on the API.');
    }
    const token = bearer(req);
    if (!token) throw unauthorized();
    const user = await studioRepository.userFromToken(token);
    if (!user) throw unauthorized('Invalid or expired token');
    const access = await studioRepository.findAccess(user.id);
    req.studio = {
      id: user.id,
      email: user.email ?? access.email ?? '',
      role: access.role,
      branchIds: access.branchIds,
    };
    req.studioToken = token;
    next();
  } catch (error) {
    next(error);
  }
};

/** Use after requireStudioUser. */
export const requireSuperAdmin = (req, res, next) =>
  next(req.studio?.role === 'super_admin' ? undefined : forbidden('Only super admins can do this'));

/**
 * Use after requireStudioUser. Branch and super admins only. Attaches req.db, a Supabase
 * client acting as the caller, so Row Level Security decides which rows they can touch.
 */
export const requireStudioEditor = (req, res, next) => {
  if (req.studio?.role !== 'branch_admin' && req.studio?.role !== 'super_admin') {
    return next(forbidden('Your account is waiting for access.'));
  }
  const db = supabaseAs(req.studioToken);
  if (!db) return next(new HttpError(503, 'Studio data needs SUPABASE_ANON_KEY on the API.'));
  req.db = db;
  return next();
};
