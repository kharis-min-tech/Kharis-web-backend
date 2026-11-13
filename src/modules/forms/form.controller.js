import { formService } from './form.service.js';
import { successResponse } from '../../shared/middleware/response.js';

const respond = (message) => async (req, res, next, action) => {
  try {
    const saved = await formService[action](req.body);
    return res.status(201).json(successResponse(message, saved));
  } catch (error) {
    next(error);
  }
};

export const createContact = (req, res, next) =>
  respond('Message received')(req, res, next, 'contact');

export const createVisit = (req, res, next) =>
  respond('Visit received')(req, res, next, 'visit');

export const createQuiz = (req, res, next) =>
  respond('Quiz result received')(req, res, next, 'quiz');
