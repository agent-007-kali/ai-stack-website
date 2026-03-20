import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { features } from '@/lib/features';

interface CheckoutRequest {
  items: { featureId: string }[];
  email: string;
  successUrl?: string;
  cancelUrl?: string;
}

export async function POST(request: NextRequest) {
  try {
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    
    if (!stripeKey) {
      return NextResponse.json({ 
        error: 'Stripe not configured',
        debug: {
          hasEnv: !!process.env.STRIPE_SECRET_KEY,
          envKeys: Object.keys(process.env).filter(k => k.includes('STRIPE') || k.includes('stripe'))
        }
      }, { status: 500 });
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: '2026-02-25.clover'
    });

    const body: CheckoutRequest = await request.json();
    const { items, email, successUrl, cancelUrl } = body;

    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'No items in cart' }, { status: 400 });
    }

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
    
    for (const item of items) {
      const feature = features.find(f => f.id === item.featureId);
      if (feature) {
        lineItems.push({
          price_data: {
            currency: 'usd',
            recurring: {
              interval: 'month'
            },
            product_data: {
              name: feature.name,
              description: feature.description,
              metadata: {
                feature_id: feature.id,
                category: feature.category
              }
            },
            unit_amount: feature.price * 100
          },
          quantity: 1
        });
      }
    }

    if (lineItems.length === 0) {
      return NextResponse.json({ error: 'No valid items found' }, { status: 400 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://ai-solutions.company';

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'subscription',
      customer_email: email,
      success_url: successUrl || `${appUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${appUrl}?canceled=true`,
      metadata: {
        feature_ids: items.map(i => i.featureId).join(','),
        customer_email: email
      },
      subscription_data: {
        metadata: {
          feature_ids: items.map(i => i.featureId).join(',')
        }
      }
    });

    return NextResponse.json({
      sessionId: session.id,
      url: session.url
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to create checkout session', details: errorMessage },
      { status: 500 }
    );
  }
}
