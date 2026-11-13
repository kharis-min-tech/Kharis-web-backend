import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  contactRecord,
  honeypotTripped,
  quizRecord,
  visitorRecord,
} from '../src/modules/forms/fields.js';

test('contact, visit and quiz rows match the website inserts', () => {
  const branches = [{ id: 'b1', name: 'KP2 London', workspace: 'kp2' }];
  const contact = contactRecord({
    name: 'Ada Lovelace',
    email: 'ada@example.com',
    topic: 'Prayer',
    branch: 'KP2 London',
    message: 'Please pray with us.',
    site: 'Main site',
  }, branches);

  assert.equal(contact.ok, true);
  assert.equal(contact.row.workspace, 'kp2');
  assert.equal(contact.row.branch_id, 'b1');
  assert.match(contact.row.message, /^From: Main site/);
  assert.equal(contact.row.status, 'new');

  const visit = visitorRecord({
    name: 'Ada',
    email: 'ada@example.com',
    branch: 'London',
    gathering: 'Sunday 10am',
    children: true,
    consent: true,
    site: 'KP2',
  });
  assert.equal(visit.ok, true);
  assert.match(visit.row.message, /Bringing children/);
  assert.equal(visitorRecord({ name: 'Ada', email: 'ada@example.com', consent: false }).ok, false);

  const quiz = quizRecord({
    branch: 'KP2 London',
    lang: 'en',
    departments: ['Choir', 'Ushering'],
    site: 'KP2',
  }, branches);
  assert.equal(quiz.ok, true);
  assert.equal(quiz.row.workspace, 'kp2');
  assert.equal(quiz.row.department_1, 'Choir');
  assert.equal(quiz.row.department_2, 'Ushering');
  assert.equal(quiz.row.department_3, null);
  assert.equal(honeypotTripped({ company: 'acme' }), true);
});
