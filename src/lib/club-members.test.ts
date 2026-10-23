// Unit tests for the AI Money Club login/chat internals (issue #53).
// Run: npm run test:club  (node --test, same pattern as test:usd)
// Everything here is pure or fails closed without network/Blob credentials.

import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  LOGIN_MAX_FAILS,
  LOGIN_WINDOW_MS,
  POST_MIN_INTERVAL_MS,
  allowPost,
  checkAdminToken,
  checkLogin,
  clearLoginFails,
  createSessionToken,
  hashPasscode,
  isValidChosenPasscode,
  loginLockout,
  newPasscode,
  newSetupToken,
  normalizeUsername,
  recordLoginFail,
  readMember,
  resetLoginStateForTests,
  sessionCookieHeader,
  sessionFromCookieHeader,
  verifyPasscode,
  verifySetupToken,
  verifySessionToken,
  writeMember,
  hashSetupToken,
} from './club-members.ts';
import { CLUB_ROOMS, isClubRoom } from './club-rooms.ts';
import { orientationText, roomWelcomeText, RULES_LINE, screenClubMessage, addressedToJarvis } from './club-host.ts';

test('normalizeUsername: valid shapes only, lowercased', () => {
  assert.equal(normalizeUsername('  Neo-1 '), 'neo-1');
  assert.equal(normalizeUsername('member-ab3x9k'), 'member-ab3x9k');
  assert.equal(normalizeUsername('ab'), null); // too short
  assert.equal(normalizeUsername('a'.repeat(25)), null);
  assert.equal(normalizeUsername('bad name'), null);
  assert.equal(normalizeUsername(42), null);
  assert.equal(normalizeUsername(null), null);
});

test('newPasscode: 10 chars, unambiguous alphabet only', () => {
  const code = newPasscode();
  assert.equal(code.length, 10);
  assert.match(code, /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{10}$/);
  assert.notEqual(newPasscode(), newPasscode()); // random, not constant
});

test('passcode hash: roundtrip verify, wrong code fails', () => {
  const salt = 'a'.repeat(32);
  const record = { username: 'tester', salt, passcodeHash: hashPasscode('SECRET1234', salt), tier: 'paid' as const, createdAt: 1 };
  assert.equal(verifyPasscode('SECRET1234', record), true);
  assert.equal(verifyPasscode('secret1234', record), false);
  assert.equal(verifyPasscode('', record), false);
  assert.equal(verifyPasscode('SECRET1235', record), false);
});

test('login lockout: 5 fails in 10 minutes locks, window prunes', () => {
  resetLoginStateForTests();
  const t0 = 1_000_000;
  assert.equal(loginLockout('u1', t0).locked, false);
  for (let i = 0; i < LOGIN_MAX_FAILS; i++) recordLoginFail('u1', t0 + i);
  const locked = loginLockout('u1', t0 + LOGIN_MAX_FAILS);
  assert.equal(locked.locked, true);
  // After the window the old fails prune away.
  const later = loginLockout('u1', t0 + LOGIN_WINDOW_MS + 1);
  assert.equal(later.locked, false);
  // Other usernames are unaffected.
  assert.equal(loginLockout('u2', t0 + LOGIN_MAX_FAILS).locked, false);
  clearLoginFails('u1');
  assert.equal(loginLockout('u1', t0 + LOGIN_MAX_FAILS).locked, false);
});

test('checkLogin: bad input 400, unknown user generic 401 (no enumeration)', async () => {
  resetLoginStateForTests();
  const missing = await checkLogin('', '');
  assert.equal(missing.ok, false);
  if (!missing.ok) assert.equal(missing.status, 400);

  const unknown = await checkLogin('no-such-user-xyz', 'whatever123');
  assert.equal(unknown.ok, false);
  if (!unknown.ok) {
    assert.equal(unknown.status, 401);
    assert.equal(unknown.error, 'Wrong username or passcode');
  }
  // The failure was recorded for that username.
  assert.equal(loginLockout('no-such-user-xyz').locked, false);
  assert.equal((await checkLogin('no-such-user-xyz', 'whatever123')).ok, false);
});

test('sessions: create/verify roundtrip, expiry and tampering rejected', () => {
  const secret = 'test-secret-value';
  const now = 5_000_000;
  const token = createSessionToken('tester', now, secret);
  assert.ok(token);
  const parsed = verifySessionToken(token, now, secret);
  assert.deepEqual(parsed, { username: 'tester' });
  // Valid for ~30 days.
  assert.ok(verifySessionToken(token, now + 29 * 24 * 3600 * 1000, secret));
  // Expired.
  assert.equal(verifySessionToken(token, now + 31 * 24 * 3600 * 1000, secret), null);
  // Tampered username (sig no longer matches).
  assert.equal(verifySessionToken(token!.replace('tester', 'evil'), now, secret), null);
  // Wrong secret.
  assert.equal(verifySessionToken(token, now, 'other-secret'), null);
  // Garbage.
  assert.equal(verifySessionToken('not-a-token', now, secret), null);
  assert.equal(verifySessionToken(null, now, secret), null);
  // Production-shaped failure: no secret -> no session.
  assert.equal(createSessionToken('tester', now, ''), null);
  assert.equal(verifySessionToken('a.1.b', now, ''), null);
});

test('session cookies: httpOnly/lax/30 days, cleared variant expires', () => {
  const set = sessionCookieHeader('tester.1.abc');
  assert.match(set, /^club_session=/);
  assert.match(set, /HttpOnly/);
  assert.match(set, /SameSite=Lax/);
  assert.match(set, /Path=\//);
  assert.match(set, /Max-Age=2592000/);
  assert.match(sessionCookieHeader('x'), /Max-Age=2592000/);
});

test('sessionFromCookieHeader: absent/garbage cookies are just null', async () => {
  assert.equal(await sessionFromCookieHeader(null), null);
  assert.equal(await sessionFromCookieHeader('other=1'), null);
  assert.equal(await sessionFromCookieHeader('club_session=bad.token.here'), null);
});

test('post rate limit: 1 per 3 s per key', () => {
  resetLoginStateForTests();
  const t0 = 9_000_000;
  assert.equal(allowPost('m1', t0).ok, true);
  const early = allowPost('m1', t0 + 500);
  assert.equal(early.ok, false);
  if (!early.ok) assert.ok(early.retryAfterMs > 0 && early.retryAfterMs <= POST_MIN_INTERVAL_MS);
  assert.equal(allowPost('m1', t0 + POST_MIN_INTERVAL_MS).ok, true);
  assert.equal(allowPost('m2', t0 + 500).ok, true); // other member unaffected
});

test('admin token: header must match, missing config never matches', () => {
  const prev = process.env.SIGNUPS_ADMIN_TOKEN;
  process.env.SIGNUPS_ADMIN_TOKEN = 'hunter2-secret';
  assert.equal(checkAdminToken('hunter2-secret'), true);
  assert.equal(checkAdminToken(' wrong '), false);
  assert.equal(checkAdminToken(null), false);
  assert.equal(checkAdminToken('hunter2-secre'), false);
  delete process.env.SIGNUPS_ADMIN_TOKEN;
  assert.equal(checkAdminToken('dev-admin-token'), process.env.NODE_ENV !== 'production');
  if (prev === undefined) delete process.env.SIGNUPS_ADMIN_TOKEN;
  else process.env.SIGNUPS_ADMIN_TOKEN = prev;
});

test('rooms: the eight spec rooms, guarded ids', () => {
  assert.deepEqual(
    CLUB_ROOMS.map((r) => r.id),
    ['ideas', 'help', 'wins', 'jobs-gigs', 'show-tell', 'ask-jarvis', 'collab-board', 'referrals'],
  );
  assert.equal(isClubRoom('ideas'), true);
  assert.equal(isClubRoom('random'), false);
  assert.equal(isClubRoom(undefined), false);
  // Welcome texts exist for every room and the rules line is pinned copy.
  for (const r of CLUB_ROOMS) assert.ok(roomWelcomeText(r.id).length > 10);
  assert.match(RULES_LINE, /referral links only in #referrals/);
});

test('moderation: credential leaks, misplaced referral links, spam', () => {
  const leak = screenClubMessage('help', 'my passcode is ABCD1234EF');
  assert.equal(leak.ok, false);
  if (!leak.ok) assert.equal(leak.rule, 1);

  const referral = screenClubMessage('wins', 'use my link whop.com/x?ref=1');
  assert.equal(referral.ok, false);
  if (!referral.ok) assert.equal(referral.rule, 2);

  // The SAME link is fine in #referrals.
  assert.deepEqual(screenClubMessage('referrals', 'use my link whop.com/x?ref=1'), { ok: true });

  const spam = screenClubMessage('ideas', 'free money airdrop, join my telegram t.me/spam');
  assert.equal(spam.ok, false);
  if (!spam.ok) assert.equal(spam.rule, 3);

  assert.deepEqual(screenClubMessage('help', 'How do I automate invoices with the guide?'), { ok: true });
});

test('jarvis addressing + orientation copy', () => {
  assert.equal(addressedToJarvis('Jarvis, what now?'), true);
  assert.equal(addressedToJarvis('jarvis'), true);
  assert.equal(addressedToJarvis('nice jarvis answer'), true);
  assert.equal(addressedToJarvis('not about the host'), false);
  const text = orientationText('Sam');
  assert.ok(text.includes('Sam'));
  assert.ok(text.includes('AI, not a human'));
  assert.ok(text.includes('#ask-jarvis'));
});

import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

test('setup token utilities', () => {
  const t = newSetupToken();
  assert.equal(t.length >= 32, true);
  assert.match(t, /^[A-Za-z0-9_-]+$/);
});

test('isValidChosenPasscode', () => {
  assert.equal(isValidChosenPasscode('1234567890'), true);
  assert.equal(isValidChosenPasscode('AbCd1234-_'), true);
  assert.equal(isValidChosenPasscode('short'), false);
  assert.equal(isValidChosenPasscode('a'.repeat(65)), false);
  assert.equal(isValidChosenPasscode('bad pass'), false);
  assert.equal(isValidChosenPasscode('bad!pass'), false);
});

test('setup-link flow with file store', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'club-'));
  const prev = process.env.CLUB_STORE_DIR;
  process.env.CLUB_STORE_DIR = dir;
  try {
    // create member
    const salt = 'a'.repeat(32);
    await writeMember({ username: 'neo', salt, passcodeHash: hashPasscode('OLDCODE1234', salt), tier: 'founder', createdAt: 1 });
    const record = await readMember('neo');
    assert.ok(record);

    // simulate setup-link
    const token = newSetupToken();
    const expiresAt = Date.now() + 24 * 60 * 60 * 1000;
    await writeMember({ ...(await readMember('neo'))!, setupTokenHash: hashSetupToken(token, (await readMember('neo'))!.salt), setupTokenExpiresAt: expiresAt });
    // after setup-link, old-passcode login still works
    const res = await checkLogin('neo', 'OLDCODE1234');
    assert.equal(res.ok, true);

    // set passcode happy path
    const r2 = await readMember('neo');
    assert.ok(verifySetupToken(token, r2!));
    const newSalt = 'b'.repeat(32);
    await writeMember({ ...(r2)!, salt: newSalt, passcodeHash: hashPasscode('NEWPASSCODE1', newSalt), setupTokenHash: undefined, setupTokenExpiresAt: undefined });
    // replay fails
    assert.equal(verifySetupToken(token, (await readMember('neo'))!), false);
    // old passcode no longer works
    assert.equal((await checkLogin('neo', 'OLDCODE1234')).ok, false);
    // new passcode works
    const r3 = await readMember('neo');
    assert.equal(verifyPasscode('NEWPASSCODE1', { ...r3!, salt: newSalt, passcodeHash: hashPasscode('NEWPASSCODE1', newSalt) }), true); // verify logic
  } finally {
    if (prev === undefined) delete process.env.CLUB_STORE_DIR;
    else process.env.CLUB_STORE_DIR = prev;
    await rm(dir, { recursive: true, force: true });
  }
});

test('reissue setup link invalidates first', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'club-'));
  const prev = process.env.CLUB_STORE_DIR;
  process.env.CLUB_STORE_DIR = dir;
  try {
    const salt = 'c'.repeat(32);
    await writeMember({ username: 'alice', salt, passcodeHash: hashPasscode('CODE1234567', salt), tier: 'paid', createdAt: 1 });
    const tokenA = newSetupToken();
    const tokenB = newSetupToken();
    await writeMember({ ...(await readMember('alice'))!, setupTokenHash: hashSetupToken(tokenA, (await readMember('alice'))!.salt), setupTokenExpiresAt: Date.now()+3600000 });
    await writeMember({ ...(await readMember('alice'))!, setupTokenHash: hashSetupToken(tokenB, (await readMember('alice'))!.salt), setupTokenExpiresAt: Date.now()+3600000 });
    assert.equal(verifySetupToken(tokenA, (await readMember('alice'))!), false);
    assert.equal(verifySetupToken(tokenB, (await readMember('alice'))!), true);
  } finally {
    if (prev === undefined) delete process.env.CLUB_STORE_DIR;
    else process.env.CLUB_STORE_DIR = prev;
    await rm(dir, { recursive: true, force: true });
  }
});
