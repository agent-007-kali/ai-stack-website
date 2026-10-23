// POST /api/club/set-passcode - email-based passcode setup/reset (issue #139)
// Public, rate-limited. One generic failure for all cases (no enumeration/oracle).
// Failed attempts do NOT burn the token; success burns it (one-time use).

import { NextRequest, NextResponse } from 'next/server';
import {
  hashPasscode,
  isValidChosenPasscode,
  normalizeUsername,
  readMember,
  verifySetupToken,
  writeMember,
} from '@/lib/club-members';
import { randomBytes } from 'node:crypto';
import { rateAllowed } from '@/lib/sample';

export const dynamic = 'force-dynamic';

const json = (data: unknown, status = 200) =>
  NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } });

const GENERIC_ERR = { error: 'Invalid or expired setup link' };

export async function POST(req: NextRequest) {
  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown';
  if (!rateAllowed(ip)) {
    return json(GENERIC_ERR, 400);
  }

  let body: { username?: unknown; token?: unknown; passcode?: unknown };
  try {
    body = await req.json();
  } catch {
    return json(GENERIC_ERR, 400);
  }

  const username = normalizeUsername(body.username);
  const token = typeof body.token === 'string' ? body.token : '';
  const passcode = typeof body.passcode === 'string' ? body.passcode : '';

  if (!username || !token || !passcode) {
    return json(GENERIC_ERR, 400);
  }

  const record = await readMember(username);
  if (!record) {
    return json(GENERIC_ERR, 400);
  }
  if (!record.setupTokenHash || typeof record.setupTokenExpiresAt !== 'number') {
    return json(GENERIC_ERR, 400);
  }
  if (Date.now() > record.setupTokenExpiresAt) {
    return json(GENERIC_ERR, 400);
  }
  if (!verifySetupToken(token, record)) {
    return json(GENERIC_ERR, 400);
  }
  if (!isValidChosenPasscode(passcode)) {
    return json(GENERIC_ERR, 400);
  }

  const salt = randomBytes(16).toString('hex');
  await writeMember({
    ...record,
    salt,
    passcodeHash: hashPasscode(passcode, salt),
    setupTokenHash: undefined,
    setupTokenExpiresAt: undefined,
  });

  return json({ ok: true, username });
}
