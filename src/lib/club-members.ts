// AI Money Club member credentials, sessions and login rate limiting
// (issue #53, login spec). Per-member username + passcode issued by us via
// the admin route; records live in the PRIVATE Blob store and hold ONLY
// {username, passcodeHash, salt, tier, createdAt, revokedAt?} - never
// plaintext passcodes, never in logs, no emails required.
//
// Session = signed httpOnly cookie (30 days) carrying only username + expiry.
// The member record is re-read on every authenticated request, so a revoke
// kills the session on its next use. Chat UI never sees credentials.

import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { clubStoreGet, clubStoreList, clubStorePut } from './club-store.ts';

export type MemberTier = 'paid' | 'founder';

export type MemberRecord = {
  username: string;
  passcodeHash: string;
  salt: string;
  tier: MemberTier;
  createdAt: number;
  revokedAt?: number;
};

const MEMBER_PREFIX = 'club-members/';
export const SESSION_COOKIE = 'club_session';
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/** Login lockout: max 5 failed attempts per username per 10 minutes. */
export const LOGIN_MAX_FAILS = 5;
export const LOGIN_WINDOW_MS = 10 * 60 * 1000;

/** Per-member post rate limit: 1 message / 3 s (in-memory, per instance). */
export const POST_MIN_INTERVAL_MS = 3000;

const USERNAME_RE = /^[a-z0-9][a-z0-9_-]{2,23}$/;
// Human-readable passcode alphabet: no 0/O, 1/I/L ambiguity.
const PASSCODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export function normalizeUsername(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const u = raw.trim().toLowerCase();
  return USERNAME_RE.test(u) ? u : null;
}

/** Random 10-character passcode, shown to the owner exactly once. */
export function newPasscode(): string {
  const bytes = randomBytes(10);
  let out = '';
  for (let i = 0; i < 10; i++) out += PASSCODE_ALPHABET[bytes[i] % PASSCODE_ALPHABET.length];
  return out;
}

export function hashPasscode(passcode: string, salt: string): string {
  return scryptSync(passcode, salt, 64).toString('hex');
}

export function verifyPasscode(passcode: string, record: MemberRecord): boolean {
  let given: Buffer;
  try {
    given = Buffer.from(hashPasscode(passcode, record.salt), 'hex');
  } catch {
    return false;
  }
  const expected = Buffer.from(record.passcodeHash, 'hex');
  return given.length === expected.length && timingSafeEqual(given, expected);
}

async function memberPath(username: string): Promise<string> {
  return MEMBER_PREFIX + username + '.json';
}

/** Read a member record; null when it does not exist (or the store fails). */
export async function readMember(username: string): Promise<MemberRecord | null> {
  try {
    const text = await clubStoreGet(await memberPath(username));
    if (text === null) return null;
    const rec = JSON.parse(text) as MemberRecord;
    return rec && typeof rec.username === 'string' && typeof rec.passcodeHash === 'string'
      ? rec
      : null;
  } catch {
    return null;
  }
}

export async function writeMember(record: MemberRecord): Promise<void> {
  await clubStorePut(await memberPath(record.username), JSON.stringify(record));
}

/** All member records (small club - a handful of store reads is fine). */
export async function listMembers(): Promise<MemberRecord[]> {
  const keys = await clubStoreList(MEMBER_PREFIX);
  const records = await Promise.all(
    keys
      .filter((k) => k.startsWith(MEMBER_PREFIX) && k.endsWith('.json'))
      .map((k) => readMember(k.slice(MEMBER_PREFIX.length, -5))),
  );
  return records.filter((r): r is MemberRecord => r !== null);
}

// ------------------------------------------------------------ login limits
type FailWindow = { fails: number[] };
const failWindows = new Map<string, FailWindow>();

export function loginLockout(
  username: string,
  now = Date.now(),
): { locked: false } | { locked: true; retryAfterMs: number } {
  const w = failWindows.get(username);
  if (!w) return { locked: false };
  w.fails = w.fails.filter((t) => t > now - LOGIN_WINDOW_MS);
  if (w.fails.length >= LOGIN_MAX_FAILS) {
    return { locked: true, retryAfterMs: w.fails[0] + LOGIN_WINDOW_MS - now };
  }
  return { locked: false };
}

export function recordLoginFail(username: string, now = Date.now()): void {
  const w = failWindows.get(username) || { fails: [] };
  w.fails.push(now);
  failWindows.set(username, w);
}

export function clearLoginFails(username: string): void {
  failWindows.delete(username);
}

/** Test seam: wipe in-memory login state between cases. */
export function resetLoginStateForTests(): void {
  failWindows.clear();
  postBuckets.clear();
}

// ------------------------------------------------------------- login check
/**
 * One shared verification used by /api/club/login: rate limit, existence and
 * passcode are checked, but the caller gets only a GENERIC failure so wrong
 * username and wrong passcode are indistinguishable (no user enumeration).
 * The record is returned only on success.
 */
export async function checkLogin(
  rawUsername: unknown,
  rawPasscode: unknown,
  now = Date.now(),
): Promise<
  | { ok: true; record: MemberRecord }
  | { ok: false; status: 400 | 401 | 423; error: string; retryAfterMs?: number }
> {
  const username = normalizeUsername(rawUsername);
  const passcode = typeof rawPasscode === 'string' ? rawPasscode.trim() : '';
  if (!username || !passcode) return { ok: false, status: 400, error: 'Enter your username and passcode' };

  const lock = loginLockout(username, now);
  if (lock.locked) {
    return {
      ok: false,
      status: 423,
      error: 'Too many attempts. Try again in a few minutes.',
      retryAfterMs: lock.retryAfterMs,
    };
  }

  const record = await readMember(username);
  const passOk = !!record && !record.revokedAt && verifyPasscode(passcode, record);
  if (!passOk || !record) {
    recordLoginFail(username, now);
    await new Promise((r) => setTimeout(r, 400)); // slow down guessing
    return { ok: false, status: 401, error: 'Wrong username or passcode' };
  }

  clearLoginFails(username);
  return { ok: true, record };
}

// ---------------------------------------------------------------- sessions
/**
 * Session secret chain: CLUB_SESSION_SECRET preferred, then the existing
 * chat secret. Production without one is a hard config error (fail-closed,
 * loud log in the route) - dev falls back to a per-process random so local
 * flows work within one process.
 */
export function sessionSecret(): string {
  const s = (
    process.env.CLUB_SESSION_SECRET
    || process.env.JARVIS_CHAT_PASSWORD
    || ''
  ).trim();
  if (s) return s;
  if (process.env.NODE_ENV === 'production') return '';
  return randomBytes(32).toString('hex');
}

export function createSessionToken(username: string, now = Date.now(), secret = sessionSecret()): string | null {
  if (!secret) return null;
  const exp = now + SESSION_TTL_MS;
  const mac = createHmac('sha256', secret).update(`${username}:${exp}`).digest('hex');
  return `${username}.${exp}.${mac}`;
}

export function verifySessionToken(
  token: string | undefined | null,
  now = Date.now(),
  secret = sessionSecret(),
): { username: string } | null {
  if (!token || !secret) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [username, expRaw, mac] = parts;
  if (!normalizeUsername(username) || !/^[0-9]+$/.test(expRaw)) return null;
  const exp = Number(expRaw);
  if (!Number.isFinite(exp) || exp <= now) return null;
  const expected = createHmac('sha256', secret).update(`${username}:${exp}`).digest();
  let given: Buffer;
  try {
    given = Buffer.from(mac, 'hex');
  } catch {
    return null;
  }
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  return { username };
}

/** Parse the Cookie header and verify the club session, record included. */
export async function sessionFromCookieHeader(
  header: string | null,
  now = Date.now(),
): Promise<MemberRecord | null> {
  if (!header) return null;
  const match = header.split(';').map((p) => p.trim()).find((p) => p.startsWith(SESSION_COOKIE + '='));
  if (!match) return null;
  const parsed = verifySessionToken(decodeURIComponent(match.slice(SESSION_COOKIE.length + 1)), now);
  if (!parsed) return null;
  const record = await readMember(parsed.username);
  if (!record || record.revokedAt) return null;
  return record;
}

export function sessionCookieHeader(token: string): string {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${Math.floor(
    SESSION_TTL_MS / 1000,
  )}${secure}`;
}

export function clearSessionCookieHeader(): string {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${SESSION_COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${secure}`;
}

// ------------------------------------------------------------ admin route
/**
 * Admin token for /api/club/members (issue/revoke/reissue/list).
 * SIGNUPS_ADMIN_TOKEN in production - fail-closed when missing.
 * Local/dev fallback so the acceptance probe can issue credentials.
 */
export function adminToken(): string {
  const t = (process.env.SIGNUPS_ADMIN_TOKEN ?? '').trim();
  if (t) return t;
  return process.env.NODE_ENV === 'production' ? '' : 'dev-admin-token';
}

export function checkAdminToken(header: string | null): boolean {
  const expected = adminToken();
  if (!expected || !header) return false;
  const given = Buffer.from(header.trim());
  const want = Buffer.from(expected);
  return given.length === want.length && timingSafeEqual(given, want);
}

// --------------------------------------------------------- post rate limit
type PostBucket = { lastMs: number };
const postBuckets = new Map<string, PostBucket>();

/** 1 message / 3 s per member (best-effort per serverless instance). */
export function allowPost(key: string, now = Date.now()): { ok: true } | { ok: false; retryAfterMs: number } {
  const b = postBuckets.get(key);
  if (b && now - b.lastMs < POST_MIN_INTERVAL_MS) {
    return { ok: false, retryAfterMs: POST_MIN_INTERVAL_MS - (now - b.lastMs) };
  }
  postBuckets.set(key, { lastMs: now });
  return { ok: true };
}
