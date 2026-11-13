import { Router } from 'express';
import { createContact, createQuiz, createVisit } from './form.controller.js';
import { contactSchema, quizSchema, visitorSchema } from './form.schema.js';
import { honeypotTripped } from './fields.js';
import { successResponse } from '../../shared/middleware/response.js';

const router = Router();

function validate(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }
    req.body = value;
    next();
  };
}

function ignoreBots(req, res, next) {
  if (honeypotTripped(req.body)) {
    return res.status(201).json(successResponse('Received', { id: null }));
  }
  next();
}

/**
 * @swagger
 * /api/contact:
 *   post:
 *     summary: Save a contact message
 *     description: Writes the same contact_messages row the Kharis and KP2 sites save. Email notification stays on the sites.
 *     tags:
 *       - Forms
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, message]
 *             properties:
 *               name:
 *                 type: string
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               email:
 *                 type: string
 *               phone:
 *                 type: string
 *               topic:
 *                 type: string
 *               branch:
 *                 type: string
 *               branchId:
 *                 type: string
 *               message:
 *                 type: string
 *               site:
 *                 type: string
 *                 enum: [Main site, KP2]
 *     responses:
 *       201:
 *         description: Message received
 *       400:
 *         description: Validation failed
 */
router.post('/contact', ignoreBots, validate(contactSchema), createContact);

/**
 * @swagger
 * /api/visitors:
 *   post:
 *     summary: Save a plan-your-visit request
 *     tags:
 *       - Forms
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, consent]
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               phone:
 *                 type: string
 *               branch:
 *                 type: string
 *               gathering:
 *                 type: string
 *               children:
 *                 type: boolean
 *               consent:
 *                 type: boolean
 *               site:
 *                 type: string
 *                 enum: [Main site, KP2]
 *     responses:
 *       201:
 *         description: Visit received
 *       400:
 *         description: Validation failed
 */
router.post('/visitors', ignoreBots, validate(visitorSchema), createVisit);

/**
 * @swagger
 * /api/quiz:
 *   post:
 *     summary: Save an anonymous department quiz result
 *     tags:
 *       - Forms
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [branch, departments]
 *             properties:
 *               branch:
 *                 type: string
 *               lang:
 *                 type: string
 *               departments:
 *                 type: array
 *                 items:
 *                   type: string
 *               site:
 *                 type: string
 *                 enum: [Main site, KP2]
 *     responses:
 *       201:
 *         description: Quiz result received
 *       400:
 *         description: Validation failed
 */
router.post('/quiz', ignoreBots, validate(quizSchema), createQuiz);

export default router;
