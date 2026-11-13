import { Router } from 'express';
import {
  countRows,
  deactivateBranch,
  deleteRow,
  deleteRows,
  insertRow,
  queryRows,
  removeStoredFiles,
  updateRow,
  updateRows,
  upsertRow,
} from './studio.data.controller.js';
import { requireStudioEditor, requireSuperAdmin } from './studio.auth.js';

// Mounted after requireStudioUser. Every query runs as the signed-in user, so RLS applies.
const router = Router();

router.use(requireStudioEditor);

/**
 * @swagger
 * /v1/studio/data/{resource}/query:
 *   post:
 *     summary: List Content Studio rows
 *     description: |
 *       Resources: events, sermons, news, testimonies, visitors, daily_entries, daily_messages,
 *       app_config, featured_videos, contact_messages, newsletter_subscribers, branches, venues,
 *       services, media. Runs with the caller's Supabase token, so Row Level Security applies.
 *     tags:
 *       - Studio data
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: resource
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               where:
 *                 type: object
 *                 description: "{ column: value }. Arrays mean any of; null means empty."
 *               order:
 *                 type: string
 *                 description: Column name, prefix with - for newest first
 *               limit:
 *                 type: integer
 *               view:
 *                 type: string
 *                 description: "branches only: full (with venues and services) or options (id, name)"
 *     responses:
 *       200:
 *         description: Rows
 */
router.post('/data/:resource/query', queryRows);

/**
 * @swagger
 * /v1/studio/data/{resource}/count:
 *   post:
 *     summary: Count Content Studio rows
 *     tags:
 *       - Studio data
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: resource
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: "{ count }"
 */
router.post('/data/:resource/count', countRows);

/**
 * @swagger
 * /v1/studio/data/{resource}/delete:
 *   post:
 *     summary: Delete every row matching a filter
 *     tags:
 *       - Studio data
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: resource
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [where]
 *             properties:
 *               where:
 *                 type: object
 *     responses:
 *       200:
 *         description: Deleted
 */
router.post('/data/:resource/delete', deleteRows);

/**
 * @swagger
 * /v1/studio/data/{resource}:
 *   post:
 *     summary: Insert a row and return it
 *     tags:
 *       - Studio data
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: resource
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
 *               row:
 *                 type: object
 *     responses:
 *       201:
 *         description: The saved row
 *   put:
 *     summary: Insert or update a row (upsert)
 *     tags:
 *       - Studio data
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: resource
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
 *               row:
 *                 type: object
 *               onConflict:
 *                 type: string
 *               returning:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Saved; the row when returning is true
 *   patch:
 *     summary: Update every row matching a filter
 *     tags:
 *       - Studio data
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: resource
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [where, patch]
 *             properties:
 *               where:
 *                 type: object
 *               patch:
 *                 type: object
 *     responses:
 *       200:
 *         description: Saved
 */
router.post('/data/:resource', insertRow);
router.put('/data/:resource', upsertRow);
router.patch('/data/:resource', updateRows);

/**
 * @swagger
 * /v1/studio/data/{resource}/{key}:
 *   patch:
 *     summary: Update one row
 *     tags:
 *       - Studio data
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: resource
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: key
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
 *               patch:
 *                 type: object
 *     responses:
 *       200:
 *         description: Saved
 *   delete:
 *     summary: Delete one row
 *     tags:
 *       - Studio data
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: resource
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: key
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Deleted
 */
router.patch('/data/:resource/:key', updateRow);
router.delete('/data/:resource/:key', deleteRow);

/**
 * @swagger
 * /v1/studio/branches/{id}/deactivate:
 *   post:
 *     summary: Hide a branch (is_active false). Its venues, services and media are kept.
 *     description: Super admins only. Branches are never deleted, so linked rows are not lost.
 *     tags:
 *       - Studio data
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
 *         description: Branch deactivated
 */
router.post('/branches/:id/deactivate', requireSuperAdmin, deactivateBranch);

/**
 * @swagger
 * /v1/studio/storage/remove:
 *   post:
 *     summary: Remove older uploads from the Supabase Storage content bucket
 *     tags:
 *       - Studio data
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               paths:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Files removed
 */
router.post('/storage/remove', removeStoredFiles);

export default router;
