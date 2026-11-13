import { formRepository } from './form.repository.js';
import { contactRecord, honeypotTripped, quizRecord, visitorRecord } from './fields.js';
import { badRequest } from '../../shared/errors/errors.js';
import { CONTACT_MESSAGES, QUIZ_RESULTS, VISITORS } from '../../shared/utils/table.js';

async function save(table, built) {
  if (!built.ok) throw badRequest(built.error);
  const saved = await formRepository.insert(table, built.row);
  return { id: saved.id };
}

export const formService = {
  async contact(body) {
    if (honeypotTripped(body)) return { id: null };
    const branches = await formRepository.branches();
    return save(CONTACT_MESSAGES, contactRecord(body, branches));
  },

  async visit(body) {
    if (honeypotTripped(body)) return { id: null };
    return save(VISITORS, visitorRecord(body));
  },

  async quiz(body) {
    if (honeypotTripped(body)) return { id: null };
    const branches = await formRepository.branches();
    return save(QUIZ_RESULTS, quizRecord(body, branches));
  },
};
