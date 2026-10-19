import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { readFile } from 'fs/promises';
import path from 'path';

// Serves the PDF only if Stripe confirms this exact Checkout Session is paid
// and belongs to the guide product. The PDF lives outside /public so it has no public URL.
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('session_id') || '';
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || !id.startsWith('cs_')) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  const stripe = new Stripe(key, { apiVersion: '2026-02-25.clover' });
  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.retrieve(id);
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  if (session.payment_status !== 'paid' || session.metadata?.product !== 'guide-hire-first-ai-employee') {
    return NextResponse.json({ error: 'Payment not completed' }, { status: 402 });
  }
  const file = await readFile(path.join(process.cwd(), 'private', 'Hire-Your-First-AI-Employee.pdf'));
  return new NextResponse(new Uint8Array(file), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="Hire-Your-First-AI-Employee.pdf"',
      'Cache-Control': 'private, no-store',
    },
  });
}
