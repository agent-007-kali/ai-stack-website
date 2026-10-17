import { NextRequest, NextResponse } from 'next/server';
import { validateOrderRequest } from '@/lib/leads/schema';
import { generateReference, storeOrder, toOrderRecord } from '@/lib/leads/storage';
import { sendOrderNotification } from '@/lib/leads/notify';

// POST /api/leads - log a product order or enquiry from the /sales chat.
//
// Supersedes the stalled #46 preview lead route. Validates input, appends the
// order to a server-side JSON log, and returns a reference number the agent
// shows the visitor. The email send (to tradersbooking@gmail.com) is stubbed in
// src/lib/leads/notify.ts and can be wired in later without changing this
// contract.
//
// There is NO GET handler: the order log is not publicly readable.
//
// The schema rejects any card / payment fields, so payment is never collected
// here.

export const dynamic = 'force-dynamic';

const MAX_BODY_BYTES = 10 * 1024;

export async function POST(req: NextRequest) {
  const contentType = req.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    return NextResponse.json({ ok: false, error: 'invalid-content-type' }, { status: 415 });
  }

  const contentLength = req.headers.get('content-length');
  if (contentLength && Number.parseInt(contentLength, 10) > MAX_BODY_BYTES) {
    return NextResponse.json({ ok: false, error: 'payload-too-large' }, { status: 413 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid-json' }, { status: 400 });
  }

  const validated = validateOrderRequest(body);
  if (!validated.ok) {
    return NextResponse.json({ ok: false, error: validated.error }, { status: 400 });
  }

  const reference = generateReference();
  const record = toOrderRecord(validated.value, reference);

  let persisted = false;
  try {
    const stored = await storeOrder(record);
    persisted = stored.persisted;
  } catch {
    persisted = false;
  }

  // Inert today (no email service configured). Never blocks the order.
  let notified: { sent: boolean; reason: string } = { sent: false, reason: 'skipped' };
  try {
    notified = await sendOrderNotification(record);
  } catch {
    /* notifications must never fail an order */
  }

  // Do not echo free-text fields back; return only what the agent needs.
  return NextResponse.json(
    {
      ok: true,
      reference,
      product: record.product,
      createdAt: record.createdAt,
      persisted,
      notified,
    },
    { status: 200 },
  );
}
