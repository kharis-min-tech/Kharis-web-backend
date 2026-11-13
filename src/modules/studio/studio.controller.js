import { studioService } from './studio.service.js';
import { successResponse } from '../../shared/middleware/response.js';

export const getMe = async (req, res, next) => {
  try {
    const me = await studioService.me(req.studio);
    return res.status(200).json(successResponse('Studio account retrieved', me));
  } catch (error) {
    next(error);
  }
};

export const listUsers = async (req, res, next) => {
  try {
    const users = await studioService.listUsers();
    return res.status(200).json(successResponse('Studio accounts retrieved', users));
  } catch (error) {
    next(error);
  }
};

export const inviteUser = async (req, res, next) => {
  try {
    const user = await studioService.invite(req.studio, req.body);
    return res.status(201).json(successResponse('Invite sent', user));
  } catch (error) {
    next(error);
  }
};

export const updateUser = async (req, res, next) => {
  try {
    const user = await studioService.update(req.studio, req.params.id, req.body);
    return res.status(200).json(successResponse('Access updated', user));
  } catch (error) {
    next(error);
  }
};

export const deleteUser = async (req, res, next) => {
  try {
    await studioService.remove(req.studio, req.params.id);
    return res.status(200).json(successResponse('Account deleted', null));
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (req, res, next) => {
  try {
    await studioService.sendPasswordReset(req.params.id);
    return res.status(200).json(successResponse('Password reset email sent', null));
  } catch (error) {
    next(error);
  }
};
