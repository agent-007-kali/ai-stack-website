import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

// One-off £75 card payment for the AI audit (issue #25). Same live Stripe
// pattern as the guide checkout (src/lib/guide-handlers.ts): an inline
// one-off price, no dashboard product, no webhook. The report is written per
// customer, so delivery is NOT instant - success lands on /audit/thanks,
// which points the buyer at the ten intake questions.
const PRICE_PENCE = 7500;
const PRODUCT_NAME = 'The £75 AI Audit';
const PRODUCT_DESCRIPTION =
  'One hour inside your answers and your website. A short written plan for your business, emailed within 24 hours. Written by an AI.';

export async function POST(req: NextRequest): Promise<NextResponse> {
  const key = (process.env.STRIPE_SECRET_KEY ?? '').trim();
  if (!key) {
    return NextResponse.json({ error: 'Audit checkout not configured' }, { status: 500 });
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
          unit_amount: PRICE_PENCE,
          product_data: {
            name: PRODUCT_NAME,
            description: PRODUCT_DESCRIPTION,
          },
        },
      }],
      metadata: { product: 'audit' },
      success_url: `${appUrl}/audit/thanks?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/audit?canceled=1`,
    });
    return NextResponse.json({ url: session.url });
  } catch {
    return NextResponse.json({ error: 'Checkout unavailable' }, { status: 500 });
  }
}
