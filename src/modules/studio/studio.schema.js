import Joi from 'joi';
import { STUDIO_ROLES } from './studio.rules.js';

const branchIds = Joi.array().items(Joi.string().guid()).max(100);

export const inviteSchema = Joi.object({
  email: Joi.string().trim().email().max(254).required(),
  role: Joi.string().valid(...STUDIO_ROLES).required(),
  branchIds: branchIds.default([]),
});

export const updateSchema = Joi.object({
  role: Joi.string().valid(...STUDIO_ROLES),
  branchIds,
}).or('role', 'branchIds');
