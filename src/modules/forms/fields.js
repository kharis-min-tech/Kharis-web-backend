const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TICKET = /^GR-\d{8}-[A-Z0-9]{4}$/;

export const CONTACT_TOPICS = [
  'Sunday visit',
  'Prayer',
  'Giving',
  'Pastoral',
  'General',
  'Chat follow-up',
  'Baptism',
];

export const FORM_SITES = ['Main site', 'KP2'];

export function cleanText(value, max) {
  return String(value ?? '').trim().slice(0, max);
}

export function honeypotTripped(body) {
  return cleanText(body?.company, 200).length > 0;
}

export function isKp2Branch(branch) {
  if (!branch) return false;
  if (branch.workspace === 'kp2') return true;
  if (branch.workspace === 'kharis') return false;
  return /^KP2\b/i.test(String(branch.name ?? '').trim());
}

function withSiteLine(message, site) {
  const line = `From: ${site}`;
  if (new RegExp(`^From:\\s*${site}\\s*$`, 'im').test(message)) return message;
  return `${line}\n\n${message}`;
}

function splitName(body) {
  const parts = cleanText(body.name, 120).split(/\s+/).filter(Boolean);
  let first = cleanText(body.firstName ?? body.first, 120);
  let last = cleanText(body.lastName ?? body.last, 120);
  if (!first && parts[0]) first = parts[0];
  if (!last && parts.length === 1) last = parts[0] ?? '';
  if (!last && parts.length > 1) last = parts.slice(1).join(' ');
  return { first, last };
}

function matchBranch(branches, branchId, branchName) {
  const byId = UUID.test(String(branchId ?? ''))
    ? branches.find((branch) => branch.id === branchId)
    : undefined;
  const wanted = cleanText(branchName, 120).toLowerCase();
  return byId ?? (wanted
    ? branches.find((branch) => String(branch.name ?? '').trim().toLowerCase() === wanted)
    : undefined);
}

export function contactRecord(body, branches = []) {
  const site = FORM_SITES.includes(body.site) ? body.site : 'Main site';
  const { first, last } = splitName(body);
  const email = cleanText(body.email, 254);
  const phone = cleanText(body.phone, 40);
  const topic = cleanText(body.topic || 'General', 40);
  const branchName = cleanText(body.branch, 120);
  let message = cleanText(body.message, 12000);
  const ticket = cleanText(body.chatTicket, 64).toUpperCase();
  const transcript = cleanText(body.chatTranscript, 6000);

  if (!first || !last) return { ok: false, error: 'Please enter your name.' };
  if (!EMAIL.test(email)) return { ok: false, error: 'Please enter a valid email.' };
  if (message.length < 8) {
    return { ok: false, error: 'Please add a short message so we know how to help.' };
  }
  if (!CONTACT_TOPICS.includes(topic)) return { ok: false, error: 'Please choose a topic.' };

  if (TICKET.test(ticket) && !message.includes('--- Grace chat handoff ---')) {
    const staffBlock = [
      '--- Grace chat handoff ---',
      `Ticket: ${ticket}`,
      transcript ? `Transcript:\n${transcript}` : null,
      '--- end handoff ---',
    ].filter(Boolean).join('\n');
    message = `${message}\n\n${staffBlock}`.trim();
  }
  message = withSiteLine(message, site);

  const match = matchBranch(branches, body.branchId, branchName);
  const workspace = site === 'KP2' || isKp2Branch(match) ? 'kp2' : 'kharis';

  return {
    ok: true,
    notifyName: match?.name ?? branchName,
    row: {
      first_name: first,
      last_name: last,
      email,
      phone: phone || null,
      topic,
      branch_id: match?.id ?? null,
      branch_name: match?.name ?? (branchName || null),
      message,
      workspace,
      status: 'new',
    },
  };
}

export function visitorRecord(body) {
  const site = FORM_SITES.includes(body.site) ? body.site : 'Main site';
  const name = cleanText(body.name, 120);
  const email = cleanText(body.email, 254);
  const phone = cleanText(body.phone, 40);
  const branch = cleanText(body.branch, 120);
  const gathering = cleanText(body.gathering, 160) || 'Next Sunday';
  const children = body.children === true;
  const place = branch || site;

  if (!name) return { ok: false, error: 'Please enter your name.' };
  if (!EMAIL.test(email)) return { ok: false, error: 'Please enter a valid email.' };
  if (body.consent !== true) {
    return { ok: false, error: 'Please confirm the branch can contact you about this visit.' };
  }

  const message = [
    'May contact: yes',
    `Site: ${site}`,
    `Plan your visit for ${place}.`,
    `Gathering: ${gathering}.`,
    children ? 'Bringing children (ages 0-12).' : 'No children noted.',
  ].join('\n');

  return {
    ok: true,
    notifyName: place,
    row: {
      name,
      email,
      phone: phone || null,
      branch_name: place,
      message,
    },
  };
}

export function quizRecord(body, branches = []) {
  const site = FORM_SITES.includes(body.site) ? body.site : 'Main site';
  const branchName = cleanText(body.branch, 120);
  const language = cleanText(body.lang || body.language || 'en', 8) || 'en';
  const departments = Array.isArray(body.departments)
    ? body.departments.slice(0, 3).map((item) => cleanText(item, 120)).filter(Boolean)
    : [];

  if (!branchName) return { ok: false, error: 'Please choose a branch.' };
  if (!/^[a-z]{2,8}$/i.test(language)) return { ok: false, error: 'Unknown language.' };
  if (!departments.length) return { ok: false, error: 'No departments matched.' };

  const match = matchBranch(branches, body.branchId, branchName);

  return {
    ok: true,
    row: {
      branch_id: match?.id ?? null,
      branch_name: match?.name ?? branchName,
      language,
      department_1: departments[0] ?? null,
      department_2: departments[1] ?? null,
      department_3: departments[2] ?? null,
      site,
      workspace: site === 'KP2' ? 'kp2' : 'kharis',
    },
  };
}
