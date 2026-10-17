// src/app/api/bow-relay/route.ts
// Live relay for Bow Chat (/try) and the Bow Sales chat (/sales). The browser
// only talks to this route.
//
// Answer chain (owner update on #81):
//   1. Groq-first tier (src/lib/bow-relay/groq.ts): instant OpenAI-compatible
//      reply, plus the holding line + team forward for price/payment/custom
//      promise questions. GROQ_API_KEY comes from the server env only and is
//      never logged, returned or sent to the client.
//   2. GitHub-issue relay per session (see src/lib/bow-relay/relay.ts) when the
//      Groq tier skips - missing key, rate limit, budget or upstream error.
//   3. The client keeps its labelled scripted demo behind that.
//
// The route never returns an issue number, repo detail, tier reason or
// token/upstream error to the client - only generic states.

import { NextRequest, NextResponse } from 'next/server';
import { answerWithGroq } from '@/lib/bow-relay/groq';
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

function clientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  const first = forwarded?.split(',')[0]?.trim();
  return first || req.headers.get('x-real-ip')?.trim() || 'unknown';
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
    // Tier 1: Groq-first. Answers synchronously (and covers the holding line
    // for price/payment/custom-promise questions). Any skip - no key, per-IP
    // limit, daily budget or upstream error - falls through silently.
    const groq = await answerWithGroq(channel, sessionId, message, clientIp(req));
    if (groq.tier === 'answer') {
      return NextResponse.json(
        {
          ok: true,
          messages: [{ from: 'advisor', text: groq.reply, ts: Date.now() }],
          mode: groq.source,
        },
        { headers: NO_STORE },
      );
    }

    // Tier 2: private GitHub-issue relay (as specced in #81). The visitor's
    // message is posted to the session thread and advisor replies are polled.
    await postVisitorMessage(channel, sessionId, message);
    const messages = await readThread(channel, sessionId);
    return NextResponse.json({ ok: true, messages, mode: 'relay' }, { headers: NO_STORE });
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
