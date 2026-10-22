import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

// One-time payment for the Prompt Pack. Price comes from env so it is not hard-coded.
// PROMPT_PACK_PRICE_PENCE e.g. "900" for GBP 9.00. Refuses to run if unset.
export async function POST(req: NextRequest) {
  const key = (process.env.STRIPE_SECRET_KEY ?? '').trim();
  const pence = parseInt(process.env.PROMPT_PACK_PRICE_PENCE || '', 10);
  if (!key || !pence || pence < 100) {
    return NextResponse.json({ error: 'Prompt Pack checkout not configured' }, { status: 500 });
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
            name: 'The AI Prompt Pack for Small Business (PDF)',
            description: 'Digital PDF, written by an AI agent. Instant download after payment.',
          },
        },
      }],
      metadata: { product: 'prompt-pack-small-business' },
      success_url: `${appUrl}/prompt-pack/thanks?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/prompt-pack?canceled=1`,
    });
    return NextResponse.json({ url: session.url });
  } catch (error) {
    return NextResponse.json({ error: 'Checkout unavailable' }, { status: 500 });
  }
}
