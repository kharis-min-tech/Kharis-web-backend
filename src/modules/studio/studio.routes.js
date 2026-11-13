import { Router } from 'express';
import {
  deleteUser,
  getMe,
  inviteUser,
  listUsers,
  resetPassword,
  updateUser,
} from './studio.controller.js';
import { requireStudioUser, requireSuperAdmin } from './studio.auth.js';
import { inviteSchema, updateSchema } from './studio.schema.js';
import studioDataRoutes from './studio.data.routes.js';

const router = Router();

function validate(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body ?? {});
    if (error) {
      return res.status(400).json({ status: false, message: error.details[0].message, data: null });
    }
    req.body = value;
    next();
  };
}

function validId(req, res, next) {
  if (/^[0-9a-f-]{36}$/i.test(req.params.id)) return next();
  return res.status(400).json({ status: false, message: 'Invalid account id', data: null });
}

router.use(requireStudioUser);

/**
 * @swagger
 * /v1/studio/me:
 *   get:
 *     summary: The signed-in Content Studio account
 *     description: Send the Supabase Auth access token as a bearer token.
 *     tags:
 *       - Studio
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: "{ id, email, role, branchIds }"
 *       401:
 *         description: Missing or expired token
 */
router.get('/me', getMe);

/**
 * @swagger
 * /v1/studio/users:
 *   get:
 *     summary: List Content Studio accounts
 *     tags:
 *       - Studio
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: "[{ id, email, role, branchIds, createdAt, lastSignInAt }]"
 *       403:
 *         description: Super admins only
 *   post:
 *     summary: Invite an account by email and set its role
 *     tags:
 *       - Studio
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, role]
 *             properties:
 *               email:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [none, branch_admin, super_admin]
 *               branchIds:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Invite sent
 *       400:
 *         description: Validation failed
 *       409:
 *         description: That email already has an account
 */
router.get('/users', requireSuperAdmin, listUsers);
router.post('/users', requireSuperAdmin, validate(inviteSchema), inviteUser);

/**
 * @swagger
 * /v1/studio/users/{id}:
 *   patch:
 *     summary: Change an account's role or branches
 *     tags:
 *       - Studio
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [none, branch_admin, super_admin]
 *               branchIds:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Access updated
 *       400:
 *         description: Not allowed, for example changing your own role
 *   delete:
 *     summary: Delete an account
 *     tags:
 *       - Studio
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Account deleted
 */
router.patch('/users/:id', requireSuperAdmin, validId, validate(updateSchema), updateUser);
router.delete('/users/:id', requireSuperAdmin, validId, deleteUser);

/**
 * @swagger
 * /v1/studio/users/{id}/password-reset:
 *   post:
 *     summary: Email the account a password reset link
 *     tags:
 *       - Studio
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Password reset email sent
 */
router.post('/users/:id/password-reset', requireSuperAdmin, validId, resetPassword);

// Last, so accounts without a role can still reach /me above.
router.use(studioDataRoutes);

export default router;
