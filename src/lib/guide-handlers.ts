import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { get } from '@vercel/blob';
import {
  BUNDLE,
  DEFAULT_GUIDE_SLUG,
  checkoutName,
  guideByMetaProduct,
  guideBySlug,
  guideFilename,
  pricePence,
  type GuideProduct,
} from './guides';

const CHECKOUT_DESCRIPTION = 'Digital PDF, written by an AI agent. Instant download after payment.';

type CheckoutBody = { product?: unknown };

/**
 * POST /api/guide/checkout — one-time card payment for one guide.
 * No body = guide 1. `{product:'<slug>'}` buys any other guide; an unknown
 * slug is a 400. Refuses to run when that guide's price env is unset or < 100.
 */
export async function createGuideCheckout(req: NextRequest): Promise<NextResponse> {
  const key = (process.env.STRIPE_SECRET_KEY ?? '').trim();

  let slug = DEFAULT_GUIDE_SLUG;
  const raw = (await req.text().catch(() => '')).trim();
  if (raw) {
    let body: CheckoutBody;
    try {
      body = JSON.parse(raw) as CheckoutBody;
    } catch {
      return NextResponse.json({ error: 'Unknown product' }, { status: 400 });
    }
    if (body && typeof body === 'object' && 'product' in body) {
      const requested = typeof body.product === 'string' ? body.product : '';
      if (!requested || !guideBySlug(requested)) {
        return NextResponse.json({ error: 'Unknown product' }, { status: 400 });
      }
      slug = requested;
    }
  }

  const guide = guideBySlug(slug);
  if (!guide) {
    return NextResponse.json({ error: 'Unknown product' }, { status: 400 });
  }
  const pence = pricePence(guide);
  if (!key || !pence || pence < 100) {
    return NextResponse.json({ error: 'Guide checkout not configured' }, { status: 500 });
  }

  // Redirect back to wherever the checkout was started (Preview deployments included),
  // falling back to the configured app URL, then the production domain.
  const appUrl = (req.headers.get('origin') || '').replace(/\/+$/, '')
    || process.env.NEXT_PUBLIC_APP_URL
    || 'https://ai-solutions.company';

  try {
    const stripe = new Stripe(key, { apiVersion: '2026-02-25.clover' });
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [{
        quantity: 1,
        price_data: {
          currency: 'gbp',
          unit_amount: pence,
      product_data: {
        name: checkoutName(guide),
        description: CHECKOUT_DESCRIPTION,
      },
        },
      }],
      metadata: { product: guide.metaProduct },
      success_url: `${appUrl}/guide/thanks?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/guide?canceled=1`,
    });
    return NextResponse.json({ url: session.url });
  } catch {
    return NextResponse.json({ error: 'Checkout unavailable' }, { status: 500 });
  }
}

/**
 * GET /api/guide/download?session_id=... — streams the paid guide's PDF from
 * the PRIVATE Vercel Blob store (BLOB_READ_WRITE_TOKEN) server-side. The
 * session's metadata.product picks the file; a paid session with an unknown
 * product is a 404, an unpaid session a 402, a bad or missing id a 404.
 * No public blob URL is ever involved.
 */
export async function guideDownload(req: NextRequest): Promise<NextResponse> {
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

  if (session.payment_status !== 'paid') {
    return NextResponse.json({ error: 'Payment not completed' }, { status: 402 });
  }

  // metadata.product picks the product: a bundle session needs an ?item=
  // slug naming which of the four guides to stream; a single-guide session
  // behaves exactly as before (issue #127).
  const meta = session.metadata?.product || '';
  let guide: GuideProduct | undefined;
  if (meta === BUNDLE.metaProduct) {
    const item = req.nextUrl.searchParams.get('item') || '';
    if (!item) {
      return NextResponse.json({ error: 'Missing item' }, { status: 400 });
    }
    guide = item === BUNDLE.slug ? undefined : guideBySlug(item);
    if (!guide) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
  } else {
    guide = guideByMetaProduct(meta);
    if (!guide) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
  }

  let blobResult: Awaited<ReturnType<typeof get>> | null = null;
  try {
    blobResult = await get(guide.blobPathname, { access: 'private' });
  } catch {
    blobResult = null;
  }
  if (!blobResult || blobResult.statusCode !== 200 || !blobResult.stream) {
    return NextResponse.json({ error: 'Download unavailable' }, { status: 500 });
  }

  return new NextResponse(blobResult.stream, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${guideFilename(guide)}"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
