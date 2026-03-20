import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { features } from '@/lib/features';

export async function POST(request: NextRequest) {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  
  return NextResponse.json({
    hasKey: !!stripeKey,
    keyPrefix: stripeKey ? stripeKey.substring(0, 10) : null,
    keyLength: stripeKey ? stripeKey.length : 0,
  });
}
