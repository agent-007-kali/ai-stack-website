import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const base = 'http://127.0.0.1:3215';
const adminHeaders = {
  'content-type': 'application/json',
  'x-admin-token': 'e2e-admin-token-155',
};
const results = [];
const tokens = [];
const check = (name, ok, detail = '') => {
  results.push(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` - ${detail}` : ''}`);
  if (!ok) process.exitCode = 1;
};

async function post(url, body, headers = { 'content-type': 'application/json' }) {
  const res = await fetch(base + url, { method: 'POST', headers, body: JSON.stringify(body) });
  let data = null;
  try { data = await res.json(); } catch {}
  return { status: res.status, data };
}

async function login(username, passcode) {
  const r = await post('/api/club/login', { username, passcode });
  return r.status;
}

async function issue(username) {
  const r = await post('/api/club/members', { action: 'issue', username, tier: 'paid' }, adminHeaders);
  check(`issue ${username}`, r.status === 200 && r.data?.ok, `status=${r.status}`);
  return r.data.passcode;
}

async function setupLink(username) {
  const r = await post('/api/club/members', { action: 'setup-link', username }, adminHeaders);
  check(`setup-link ${username}`, r.status === 200 && r.data?.ok, `status=${r.status}`);
  const url = new URL(r.data.setupUrl);
  check(
    `setup-link ${username} uses club domain`,
    url.origin === 'https://ai-solutions.company' && url.pathname === '/club/set-passcode',
    `origin=${url.origin} path=${url.pathname}`,
  );
  const token = url.searchParams.get('t');
  tokens.push(token);
  return { u: url.searchParams.get('u'), t: token };
}

async function setPasscode(username, token, passcode) {
  return post('/api/club/set-passcode', { username, token, passcode });
}

// --- happy path: initial setup replaces the issued passcode, token burns ----
{
  const oldCode = await issue('e2e-155');
  const { u, t } = await setupLink('e2e-155');
  check('active login still works after setup-link is issued', (await login('e2e-155', oldCode)) === 200);

  const newCode = 'MyNewPasscode-155';
  const set = await setPasscode(u, t, newCode);
  check('set passcode succeeds', set.status === 200 && set.data?.ok === true, `status=${set.status}`);
  check('setup token is one-time (replay rejected)', (await setPasscode(u, t, 'AnotherPass-155')).status === 400);
  check('old passcode rejected after set', (await login('e2e-155', oldCode)) === 401);
  check('new passcode works after set', (await login('e2e-155', newCode)) === 200);
}

// --- invalid new passcode does not consume the link or lock the member ------
{
  const oldCode = await issue('e2e-155b');
  const { u, t } = await setupLink('e2e-155b');
  const bad = await setPasscode(u, t, 'short');
  check('too-short passcode rejected', bad.status === 400, `status=${bad.status}`);
  check('failed set leaves active login working', (await login('e2e-155b', oldCode)) === 200);
  const ok = await setPasscode(u, t, 'GoodPasscode-155b');
  check('link still usable after rejected passcode', ok.status === 200 && ok.data?.ok === true, `status=${ok.status}`);
}

// --- reissuing a link invalidates the older one -----------------------------
{
  const oldCode = await issue('e2e-155c');
  const a = await setupLink('e2e-155c');
  const b = await setupLink('e2e-155c');
  check('older setup link rejected after reissue', (await setPasscode(a.u, a.t, 'FirstLinkPass-155c')).status === 400);
  check('rejected older link did not change passcode', (await login('e2e-155c', oldCode)) === 200);
  const ok = await setPasscode(b.u, b.t, 'SecondLinkPass-155c');
  check('newest setup link succeeds', ok.status === 200 && ok.data?.ok === true, `status=${ok.status}`);
}

// --- expired link fails closed without changing the passcode ----------------
{
  const oldCode = await issue('e2e-155d');
  const { u, t } = await setupLink('e2e-155d');
  const file = path.join(process.cwd(), 'var/issue-155-store/club-members/e2e-155d.json');
  const rec = JSON.parse(await readFile(file, 'utf8'));
  rec.setupTokenExpiresAt = Date.now() - 1000;
  await writeFile(file, JSON.stringify(rec), 'utf8');
  check('expired setup link rejected', (await setPasscode(u, t, 'ExpiredLinkPass-155d')).status === 400);
  check('expired link leaves active login working', (await login('e2e-155d', oldCode)) === 200);
}

// --- bogus link is rejected -------------------------------------------------
check('bogus setup link rejected', (await setPasscode('e2e-155', 'not-a-real-token', 'BogusPasscode-155')).status === 400);

// --- token never reaches the server log -------------------------------------
const log = await readFile(path.join(process.cwd(), 'evidence/issue-155/server.log'), 'utf8');
const leaked = tokens.filter((t) => t && log.includes(t));
check('no setup token in server log', leaked.length === 0, `leaked=${leaked.length}`);

await writeFile(
  path.join(process.cwd(), 'evidence/issue-155/e2e-results.txt'),
  `AI Money Club set-passcode E2E (local production build)\n` +
    `Run: ${new Date().toISOString()}\n` +
    `Base: ${base}\n\n` +
    results.join('\n') +
    `\n\n${results.filter((r) => r.startsWith('PASS')).length}/${results.length} checks passed\n`,
  'utf8',
);
console.log(results.join('\n'));
console.log(`\n${results.filter((r) => r.startsWith('PASS')).length}/${results.length} checks passed`);
if (process.exitCode) process.exit(process.exitCode);
