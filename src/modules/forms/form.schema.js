import Joi from 'joi';
import { CONTACT_TOPICS, FORM_SITES } from './fields.js';

const site = () => Joi.string().valid(...FORM_SITES).default('Main site');

export const contactSchema = Joi.object({
  firstName: Joi.string().allow('', null),
  lastName: Joi.string().allow('', null),
  first: Joi.string().allow('', null),
  last: Joi.string().allow('', null),
  name: Joi.string().allow('', null),
  email: Joi.string().max(254).required(),
  phone: Joi.string().allow('', null),
  topic: Joi.string().valid(...CONTACT_TOPICS, '').allow(null),
  branch: Joi.string().allow('', null),
  branchId: Joi.string().allow('', null),
  message: Joi.string().max(12000).required(),
  site: site(),
  chatTicket: Joi.string().allow('', null),
  chatTranscript: Joi.string().allow('', null),
  company: Joi.string().allow('', null),
}).unknown(true);

export const visitorSchema = Joi.object({
  name: Joi.string().max(120).required(),
  email: Joi.string().max(254).required(),
  phone: Joi.string().allow('', null),
  branch: Joi.string().allow('', null),
  gathering: Joi.string().allow('', null),
  children: Joi.boolean().default(false),
  consent: Joi.boolean().required(),
  site: site(),
  company: Joi.string().allow('', null),
}).unknown(true);

export const quizSchema = Joi.object({
  branch: Joi.string().max(120).required(),
  branchId: Joi.string().allow('', null),
  lang: Joi.string().max(8).allow('', null),
  language: Joi.string().max(8).allow('', null),
  departments: Joi.array().items(Joi.string().max(120)).min(1).max(3).required(),
  site: site(),
  company: Joi.string().allow('', null),
}).unknown(true);
