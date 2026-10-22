import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { get } from '@vercel/blob';

const PROMPT_PACK_BLOB_PATHNAME = 'prompt-pack/The-AI-Prompt-Pack-for-Small-Business.pdf';

// Serves the paid Prompt Pack PDF only if Stripe confirms this exact Checkout Session is paid
// and belongs to the Prompt Pack product (a guide session cannot download the pack).
// The PDF lives in a PRIVATE Vercel Blob store
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
  if (session.payment_status !== 'paid' || session.metadata?.product !== 'prompt-pack-small-business') {
    return NextResponse.json({ error: 'Payment not completed' }, { status: 402 });
  }
  let blobResult: Awaited<ReturnType<typeof get>> | null = null;
  try {
    blobResult = await get(PROMPT_PACK_BLOB_PATHNAME, { access: 'private' });
  } catch {
    blobResult = null;
  }
  if (!blobResult || blobResult.statusCode !== 200 || !blobResult.stream) {
    return NextResponse.json({ error: 'Download unavailable' }, { status: 500 });
  }
  return new NextResponse(blobResult.stream, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="The-AI-Prompt-Pack-for-Small-Business.pdf"',
      'Cache-Control': 'private, no-store',
    },
  });
}
