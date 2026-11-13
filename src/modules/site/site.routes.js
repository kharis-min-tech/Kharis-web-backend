import { Router } from 'express';
import { handle } from '../../config/http.js';
import { notfound } from '../../shared/errors/errors.js';
import { successResponse } from '../../shared/middleware/response.js';
import { siteRepository } from './site.repository.js';
import { mediaTypes } from './site.rules.js';

// The websites cache pages for 60 seconds, so the API matches that.
const SITE_CACHE_CONTROL = 'public, max-age=60';
const SLUG = /^[a-z0-9-]{1,120}$/i;

const router = Router();

function send(res, message, data) {
  res.set('Cache-Control', SITE_CACHE_CONTROL);
  return res.json(successResponse(message, data));
}

/**
 * @swagger
 * /v1/site/branches:
 *   get:
 *     summary: Active branches with venues and services (raw rows) for the websites
 *     tags:
 *       - Site
 *     responses:
 *       200:
 *         description: Branch rows
 */
router.get('/branches', handle(async (req, res) =>
  send(res, 'Branches retrieved', await siteRepository.branches())));

/**
 * @swagger
 * /v1/site/branches/{slug}:
 *   get:
 *     summary: One active branch with venues and services
 *     tags:
 *       - Site
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Branch row
 *       404:
 *         description: Branch not found
 */
router.get('/branches/:slug', handle(async (req, res) => {
  if (!SLUG.test(req.params.slug)) throw notfound('Branch not found');
  const branch = await siteRepository.branchBySlug(req.params.slug);
  if (!branch) throw notfound('Branch not found');
  return send(res, 'Branch retrieved', branch);
}));

/**
 * @swagger
 * /v1/site/media:
 *   get:
 *     summary: Branch galleries, branch videos and department videos
 *     tags:
 *       - Site
 *     parameters:
 *       - in: query
 *         name: ownerType
 *         description: Comma separated. branch-gallery, branch-video, department-video
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Media rows
 */
router.get('/media', handle(async (req, res) =>
  send(res, 'Media retrieved', await siteRepository.media(mediaTypes(req.query.ownerType)))));

/**
 * @swagger
 * /v1/site/testimonies:
 *   get:
 *     summary: Published testimonies for every workspace
 *     tags:
 *       - Site
 *     responses:
 *       200:
 *         description: Testimony rows
 */
router.get('/testimonies', handle(async (req, res) =>
  send(res, 'Testimonies retrieved', await siteRepository.testimonies())));

/**
 * @swagger
 * /v1/site/events:
 *   get:
 *     summary: Every event, oldest first, so the sites can expand weekly events
 *     tags:
 *       - Site
 *     responses:
 *       200:
 *         description: Event rows
 */
router.get('/events', handle(async (req, res) =>
  send(res, 'Events retrieved', await siteRepository.events())));

export default router;
