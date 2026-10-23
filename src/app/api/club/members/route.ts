// POST /api/club/members - admin credential management for the AI Money
// Club (issue #53). Gated by the SIGNUPS_ADMIN_TOKEN env var compared in
// constant time. Actions:
//   issue   {tier, username?}  -> creates a member, returns {username, passcode} ONCE
//   reissue {username}         -> rotates the passcode, returns it ONCE
//   revoke  {username}         -> marks the record revoked (sessions die on next use)
//   list                        -> safe projection, never hashes/salts/passcodes
// Plaintext passcodes appear ONLY in the issue/reissue response body.

import { NextRequest, NextResponse } from 'next/server';
import {
  checkAdminToken,
  listMembers,
  newPasscode,
  normalizeUsername,
  hashPasscode,
  readMember,
  writeMember,
  newSetupToken,
  hashSetupToken,
  type MemberTier,
} from '@/lib/club-members';
import { randomBytes } from 'node:crypto';

export const dynamic = 'force-dynamic';

const json = (data: unknown, status = 200) =>
  NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } });

function newUsername(): string {
  const bytes = randomBytes(6);
  const alphabet = 'abcdefghijkmnpqrstuvwxyz23456789';
  let suffix = '';
  for (let i = 0; i < bytes.length; i++) suffix += alphabet[bytes[i] % alphabet.length];
  return 'member-' + suffix;
}

export async function POST(req: NextRequest) {
  if (!checkAdminToken(req.headers.get('x-admin-token'))) {
    return json({ error: 'unauthorized' }, 401);
  }

  let body: { action?: string; username?: unknown; tier?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Bad request' }, 400);
  }

  if (body.action === 'list') {
    const members = await listMembers();
    return json({
      members: members
        .map((m) => ({
          username: m.username,
          tier: m.tier,
          createdAt: m.createdAt,
          revokedAt: m.revokedAt ?? null,
        }))
        .sort((a, b) => a.createdAt - b.createdAt),
    });
  }

  if (body.action === 'issue') {
    const tier: MemberTier = body.tier === 'founder' ? 'founder' : 'paid';
    let username = body.username === undefined ? newUsername() : normalizeUsername(body.username);
    if (body.username !== undefined && !username) {
      return json({ error: 'Username must be 3-24 chars: a-z, 0-9, - or _' }, 400);
    }
    while (username && (await readMember(username))) username = newUsername();
    if (!username) return json({ error: 'Could not make a username' }, 500);

    const salt = randomBytes(16).toString('hex');
    const passcode = newPasscode();
    await writeMember({
      username,
      salt,
      passcodeHash: hashPasscode(passcode, salt),
      tier,
      createdAt: Date.now(),
    });
    return json({ ok: true, username, passcode, tier });
  }

  if (body.action === 'reissue' || body.action === 'revoke') {
    const username = normalizeUsername(body.username);
    if (!username) return json({ error: 'Unknown username' }, 400);
    const record = await readMember(username);
    if (!record) return json({ error: 'No such member' }, 404);

    if (body.action === 'revoke') {
      await writeMember({ ...record, revokedAt: Date.now() });
      return json({ ok: true, username, revoked: true });
    }

    const salt = randomBytes(16).toString('hex');
    const passcode = newPasscode();
    await writeMember({ ...record, salt, passcodeHash: hashPasscode(passcode, salt) });
    return json({ ok: true, username, passcode });
  }

  if (body.action === 'setup-link') {
    const username = normalizeUsername(body.username);
    if (!username) return json({ error: 'Unknown username' }, 400);
    const record = await readMember(username);
    if (!record) return json({ error: 'No such member' }, 404);
    if (record.revokedAt) return json({ error: 'Member revoked' }, 400);

    const token = newSetupToken();
    const expiresAt = Date.now() + 24 * 60 * 60 * 1000;
    const setupTokenHash = hashSetupToken(token, record.salt);
    await writeMember({
      ...record,
      setupTokenHash,
      setupTokenExpiresAt: expiresAt,
    });

    const setupUrl = `https://ai-solutions.company/club/set-passcode?u=${encodeURIComponent(username)}&t=${encodeURIComponent(token)}`;
    return json({ ok: true, username, setupUrl, expiresAt });
  }

  return json({ error: 'Unknown action' }, 400);
}
