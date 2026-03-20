import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { features } from '@/lib/features';

export async function POST(request: NextRequest) {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  
  if (!stripeKey) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 });
  }

  try {
    const stripe = new Stripe(stripeKey, {
      apiVersion: '2026-02-25.clover'
    });

    const body = await request.json();
    const { items, email } = body;

    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'No items in cart' }, { status: 400 });
    }

    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 });
    }

    const lineItems = items.map((item: { featureId: string }) => {
      const feature = features.find(f => f.id === item.featureId);
      if (!feature) return null;
      return {
        price_data: {
          currency: 'usd',
          recurring: { interval: 'month' },
          product_data: {
            name: feature.name,
            description: feature.description,
          },
          unit_amount: feature.price * 100,
        },
        quantity: 1,
      };
    }).filter(Boolean);

    if (lineItems.length === 0) {
      return NextResponse.json({ error: 'No valid items' }, { status: 400 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://ai-solutions.company';

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'subscription',
      customer_email: email,
      success_url: `${appUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}?canceled=true`,
    });

    return NextResponse.json({ url: session.url, sessionId: session.id });

  } catch (error: any) {
    return NextResponse.json({ 
      error: error.message || 'Checkout failed' 
    }, { status: 500 });
  }
}
