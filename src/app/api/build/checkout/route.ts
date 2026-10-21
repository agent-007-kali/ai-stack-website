import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

// One-off card payment for a done-for-you build tier (issue #31). Same live
// Stripe pattern as /api/audit-checkout and /api/guide/checkout: inline
// one-off price from env, no dashboard product, no webhook. The label env
// keeps the /build page from offering Buy before the price exists, and this
// handler still refuses to run when the pence env is unset.
const TIERS = {
  setup: {
    priceEnv: 'BUILD_SETUP_PRICE_PENCE',
    name: 'Setup - one AI win built for you',
    description:
      'One AI win built end-to-end in 5 working days, with a handover video. Built by Jarvis, checked by a human.',
  },
  build: {
    priceEnv: 'BUILD_PRICE_PENCE',
    name: 'Build - three AI wins built for you',
    description:
      'Three AI wins built and 30 days of tweaks after launch. The £75 audit price is credited against this tier. Built by Jarvis, checked by a human.',
  },
} as const;

type TierKey = keyof typeof TIERS;

export async function POST(req: NextRequest): Promise<NextResponse> {
  const key = (process.env.STRIPE_SECRET_KEY ?? '').trim();

  let tier: TierKey = 'setup';
  const raw = (await req.text().catch(() => '')).trim();
  if (raw) {
    let body: { tier?: unknown };
    try {
      body = JSON.parse(raw) as { tier?: unknown };
    } catch {
      return NextResponse.json({ error: 'Unknown tier' }, { status: 400 });
    }
    if (body && typeof body === 'object' && 'tier' in body) {
      const requested = typeof body.tier === 'string' ? body.tier : '';
      if (requested !== 'setup' && requested !== 'build') {
        return NextResponse.json({ error: 'Unknown tier' }, { status: 400 });
      }
      tier = requested;
    }
  }

  const cfg = TIERS[tier];
  const pence = parseInt(process.env[cfg.priceEnv] ?? '', 10);
  if (!key || !Number.isFinite(pence) || pence < 100) {
    return NextResponse.json({ error: 'Build checkout not configured' }, { status: 500 });
  }

  // Redirect back to wherever checkout was started (Preview deployments
  // included), falling back to the configured app URL, then production.
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
            name: cfg.name,
            description: cfg.description,
          },
        },
      }],
      metadata: { product: `build-${tier}` },
      success_url: `${appUrl}/build?success=1`,
      cancel_url: `${appUrl}/build?canceled=1`,
    });
    return NextResponse.json({ url: session.url });
  } catch {
    return NextResponse.json({ error: 'Checkout unavailable' }, { status: 500 });
  }
}
