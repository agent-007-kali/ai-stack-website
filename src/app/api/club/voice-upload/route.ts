// POST /api/club/voice-upload - not for members, guarded by server-side secret
// (issue #163)

import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';

export const dynamic = 'force-dynamic';

const json = (data: unknown, status = 200) =>
  NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } });

// simple per-instance rate limit (max 1 request per 3 s)
let lastUploadAt = 0;
const MIN_INTERVAL_MS = 3000;

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

function getUploadSecret(): string {
  // FIRST look at how the existing admin secret for the club setup-link flow (#155 / admin setup-link) is guarded and REUSE that secret/env var if one exists
  // Existing admin secret: SIGNUPS_ADMIN_TOKEN (used by checkAdminToken / audit-intake / club members)
  const admin = (process.env.SIGNUPS_ADMIN_TOKEN ?? '').trim();
  if (admin) return admin;
  return (process.env.CLUB_VOICE_UPLOAD_KEY ?? '').trim();
}

export async function POST(req: NextRequest) {
  const now = Date.now();
  if (now - lastUploadAt < MIN_INTERVAL_MS) {
    return json({ error: 'rate limited' }, 429);
  }

  // Query ?mid=<digits message id>
  const mid = req.nextUrl.searchParams.get('mid') || '';
  if (!/^[0-9]{6,20}$/.test(mid)) {
    return json({ error: 'bad request' }, 400);
  }

  // Guard with server-side secret in Authorization: Bearer header
  const auth = req.headers.get('authorization') || '';
  const expected = getUploadSecret();
  if (!expected) {
    return json({ error: 'not configured' }, 500);
  }
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  if (!timingSafeEqual(token, expected)) {
    return json({ error: 'unauthorized' }, 401);
  }

  const contentType = req.headers.get('content-type') || '';
  if (contentType !== 'audio/mpeg') {
    return json({ error: 'bad request' }, 400);
  }

  const buf = await req.arrayBuffer();
  if (buf.byteLength === 0 || buf.byteLength > 400 * 1024) {
    return json({ error: 'bad request' }, 400);
  }

  lastUploadAt = now;

  try {
    await put(`club-voice/${mid}.mp3`, Buffer.from(buf), {
      access: 'private',
      contentType: 'audio/mpeg',
      allowOverwrite: true,
    });
    return json({ ok: true });
  } catch (e) {
    console.error('[club-voice-upload]', e);
    return json({ error: 'upload failed' }, 500);
  }
}
