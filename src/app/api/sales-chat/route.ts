import { NextRequest, NextResponse } from 'next/server';
import { validateSalesChatInput } from '@/lib/sales-chat/script';

// Inactive preview scaffold for the sales chat.
//
// This route is deliberately inert. It makes NO external provider call, reads NO
// API key, hits NO paid model, changes no account, env or service setting and
// adds no dependency. It does not reuse the stale /api/chat route.
//
// Until activation is separately approved, every valid request returns
// `{ fallback: true }` and the browser answers from the scripted engine.
//
// RATE LIMITING (DESIGN ONLY - not implemented, intentionally)
// ------------------------------------------------------------
// A per-instance in-memory counter is NOT an enforceable global spending cap on
// multi-instance hosting: instances do not share memory and scale-outs reset it.
// It is therefore not implemented. Any real limit must come from an
// owner-approved, globally enforced budget/cap design before paid calls are
// allowed. No KV/Upstash store is provisioned here.
//
// ACTIVATION BLOCKERS (owner decisions, none made here)
//   provider/payer, enforced budget/global cap, privacy notice/data processing,
//   secure key delivery, explicit activation approval.
//
// PRIVACY: the visitor body is validated and then discarded. It is never logged,
// stored or forwarded.

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

  const validated = validateSalesChatInput(body);
  if (!validated.ok) {
    return NextResponse.json(
      { fallback: true, active: false, error: validated.error },
      { status: 400 },
    );
  }

  // Valid shape, still inactive. No provider call, no persistence, no logging.
  return NextResponse.json(
    {
      fallback: true,
      active: false,
      reply: null,
      reason: 'inactive',
      note: 'Scripted demo only. No live provider is configured and no paid model is called.',
      blockers: [
        'provider/payer',
        'enforced budget/global cap',
        'privacy notice/data processing',
        'secure key delivery',
        'explicit activation approval',
      ],
    },
    { status: 200 },
  );
}
