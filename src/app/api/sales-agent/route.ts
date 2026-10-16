import { NextRequest, NextResponse } from 'next/server';
import { validateAgentInput } from '@/lib/sales-agent/engine';
import { providerStatus, requestProviderReply } from '@/lib/sales-agent/provider';

// Inactive, fail-closed scaffold for the /sales agent chat.
//
// This route makes NO external provider call, reads NO API key for a paid call,
// hits NO paid model, changes no account, env or service setting and adds no
// dependency. Until activation is separately approved, every valid request
// returns `{ fallback: true }` and the browser answers from the deterministic
// engine in src/lib/sales-agent/engine.ts.
//
// Order capture does NOT depend on this route: the order flow is deterministic
// and posts straight to /api/leads, so orders work even in fallback mode.
//
// PRIVACY: the visitor body is validated and then discarded. It is never
// logged, stored or forwarded here.

export const dynamic = 'force-dynamic';

const MAX_BODY_BYTES = 8 * 1024;

export async function POST(req: NextRequest) {
  const contentType = req.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    return NextResponse.json(
      { fallback: true, active: false, error: 'invalid-content-type' },
      { status: 415 },
    );
  }

  const contentLength = req.headers.get('content-length');
  if (contentLength && Number.parseInt(contentLength, 10) > MAX_BODY_BYTES) {
    return NextResponse.json(
      { fallback: true, active: false, error: 'payload-too-large' },
      { status: 413 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { fallback: true, active: false, error: 'invalid-json' },
      { status: 400 },
    );
  }

  const validated = validateAgentInput(body);
  if (!validated.ok) {
    return NextResponse.json(
      { fallback: true, active: false, error: validated.error },
      { status: 400 },
    );
  }

  const provider = await requestProviderReply(validated.value.message);

  // Valid shape. The provider is fail-closed, so this is always a fallback in
  // the current build. No provider call, no persistence, no logging.
  const status = providerStatus();
  return NextResponse.json(
    {
      fallback: true,
      active: false,
      reply: provider.mode === 'live' ? provider.reply : null,
      reason: provider.mode === 'fallback' ? provider.reason : 'inactive',
      budget: {
        configuredCents: status.budgetCents,
        spentCents: status.spentCents,
        paidCallsAllowed: status.paidCallsAllowed,
      },
      note: 'Scripted demo only. No live provider is configured and no paid model is called.',
    },
    { status: 200 },
  );
}
