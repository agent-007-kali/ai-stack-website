// POST /api/club/login - paid-member login for the AI Money Club chat
// (issue #53). Username + passcode checked against the private Blob store
// with a 5-fails/10-min lockout; success sets a signed, httpOnly 30-day
// session cookie. Failures are GENERIC (no user enumeration). GET returns
// the current session; POST {action:'logout'} clears it.

import { NextRequest, NextResponse } from 'next/server';
import {
  checkLogin,
  clearSessionCookieHeader,
  createSessionToken,
  sessionCookieHeader,
  sessionFromCookieHeader,
} from '@/lib/club-members';

export const dynamic = 'force-dynamic';

const json = (data: unknown, status = 200) =>
  NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } });

export async function GET(req: NextRequest) {
  const record = await sessionFromCookieHeader(req.headers.get('cookie'));
  if (!record) return json({ ok: false });
  return json({ ok: true, username: record.username, tier: record.tier });
}

export async function POST(req: NextRequest) {
  let body: { action?: string; username?: unknown; passcode?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Bad request' }, 400);
  }

  if (body.action === 'logout') {
    return new NextResponse(JSON.stringify({ ok: true }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
        'Set-Cookie': clearSessionCookieHeader(),
      },
    });
  }

  const result = await checkLogin(body.username, body.passcode);
  if (!result.ok) {
    return json({ error: result.error }, result.status);
  }

  const token = createSessionToken(result.record.username);
  if (!token) {
    console.error('[club] SESSION NOT CONFIGURED - set CLUB_SESSION_SECRET (or JARVIS_CHAT_PASSWORD) before launch.');
    return json({ error: 'Login not configured' }, 500);
  }

  return new NextResponse(
    JSON.stringify({ ok: true, username: result.record.username, tier: result.record.tier }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
        'Set-Cookie': sessionCookieHeader(token),
      },
    },
  );
}
