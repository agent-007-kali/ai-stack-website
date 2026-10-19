import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { get } from '@vercel/blob';

const GUIDE_BLOB_PATHNAME = 'guide/Hire-Your-First-AI-Employee.pdf';

// Serves the paid guide PDF only if Stripe confirms this exact Checkout Session is paid
// and belongs to the guide product. The PDF lives in a PRIVATE Vercel Blob store
// (BLOB_READ_WRITE_TOKEN / OIDC) and is streamed server-side — it is never in this
// repo and there is no public blob URL involved.
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('session_id') || '';
  const key = (process.env.STRIPE_SECRET_KEY ?? '').trim();
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
  let blobResult: Awaited<ReturnType<typeof get>> | null = null;
  try {
    blobResult = await get(GUIDE_BLOB_PATHNAME, { access: 'private' });
  } catch {
    blobResult = null;
  }
  if (!blobResult || blobResult.statusCode !== 200 || !blobResult.stream) {
    return NextResponse.json({ error: 'Download unavailable' }, { status: 500 });
  }
  return new NextResponse(blobResult.stream, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="Hire-Your-First-AI-Employee.pdf"',
      'Cache-Control': 'private, no-store',
    },
  });
}
