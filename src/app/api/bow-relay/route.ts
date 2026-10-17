// src/app/api/bow-relay/route.ts
// Live relay for Bow Chat (/try) and the Bow Sales chat (/sales). The browser
// only talks to this route; the route talks to a private GitHub issue thread
// per session (see src/lib/bow-relay/relay.ts). No AI/provider key is involved.
//
// The route never returns an issue number, repo detail or token/upstream error
// to the client - only generic states.

import { NextRequest, NextResponse } from 'next/server';
import {
  RELAY_LIMITS,
  RelayConfigError,
  RelayUpstreamError,
  checkRateLimit,
  isRelayChannel,
  isRelaySessionId,
  postVisitorMessage,
  readThread,
} from '@/lib/bow-relay/relay';

export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'no-store' } as const;

function unavailable() {
  return NextResponse.json({ ok: false, error: 'relay_unavailable' }, { status: 503, headers: NO_STORE });
}

function badRequest(error: string) {
  return NextResponse.json({ ok: false, error }, { status: 400, headers: NO_STORE });
}

function sessionKey(channel: string, sessionId: string) {
  return `${channel}:${sessionId}`;
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badRequest('invalid');
  }

  const { channel, sessionId, text } = (body ?? {}) as {
    channel?: unknown;
    sessionId?: unknown;
    text?: unknown;
  };

  if (!isRelayChannel(channel) || !isRelaySessionId(sessionId)) return badRequest('invalid');
  const message = typeof text === 'string' ? text.trim() : '';
  if (!message) return badRequest('empty');
  if (message.length > RELAY_LIMITS.maxMessageChars) return badRequest('too_long');

  const limit = checkRateLimit(sessionKey(channel, sessionId));
  if (!limit.ok) {
    return NextResponse.json(
      { ok: false, error: 'rate_limited', retryAfter: Math.ceil(limit.retryAfter / 1000) },
      { status: 429, headers: NO_STORE },
    );
  }

  try {
    await postVisitorMessage(channel, sessionId, message);
    const messages = await readThread(channel, sessionId);
    return NextResponse.json({ ok: true, messages }, { headers: NO_STORE });
  } catch (err) {
    if (err instanceof RelayConfigError) return unavailable();
    if (err instanceof RelayUpstreamError) return unavailable();
    return unavailable();
  }
}

export async function GET(req: NextRequest) {
  const channel = req.nextUrl.searchParams.get('channel');
  const sessionId = req.nextUrl.searchParams.get('sessionId');
  if (!isRelayChannel(channel) || !isRelaySessionId(sessionId)) return badRequest('invalid');

  try {
    const messages = await readThread(channel, sessionId);
    return NextResponse.json({ ok: true, messages }, { headers: NO_STORE });
  } catch {
    return unavailable();
  }
}
