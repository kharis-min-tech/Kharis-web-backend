import { studioDataService } from './studio.data.service.js';
import { successResponse } from '../../shared/middleware/response.js';

const reply = (message, action, status = 200) => async (req, res, next) => {
  try {
    const data = await action(req);
    return res.status(status).json(successResponse(message, data));
  } catch (error) {
    next(error);
  }
};

const body = (req) => req.body ?? {};

export const queryRows = reply('Rows retrieved', (req) =>
  studioDataService.list(req.db, req.params.resource, body(req)));

export const countRows = reply('Rows counted', async (req) => ({
  count: await studioDataService.count(req.db, req.params.resource, body(req)),
}));

export const insertRow = reply('Saved', (req) =>
  studioDataService.insert(req.db, req.params.resource, body(req).row), 201);

export const upsertRow = reply('Saved', (req) => {
  const { row, onConflict, returning } = body(req);
  return studioDataService.upsert(req.db, req.params.resource, row, {
    onConflict,
    returning: returning === true,
  });
});

export const updateRow = reply('Saved', (req) =>
  studioDataService.update(req.db, req.params.resource, req.params.key, body(req).patch));

export const updateRows = reply('Saved', (req) =>
  studioDataService.updateWhere(req.db, req.params.resource, body(req).where, body(req).patch));

export const deleteRow = reply('Deleted', (req) =>
  studioDataService.remove(req.db, req.params.resource, req.params.key));

export const deleteRows = reply('Deleted', (req) =>
  studioDataService.removeWhere(req.db, req.params.resource, body(req).where));

export const deactivateBranch = reply('Branch deactivated', (req) =>
  studioDataService.deactivateBranch(req.db, req.params.id));

export const removeStoredFiles = reply('Files removed', (req) =>
  studioDataService.removeStoredFiles(req.db, body(req).paths));
