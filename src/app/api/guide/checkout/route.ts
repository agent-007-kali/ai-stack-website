import { NextRequest } from 'next/server';
import { createGuideCheckout } from '@/lib/guide-handlers';

// One-time card payment for a guide (issue #122). The shared handler in
// src/lib/guide-handlers.ts does the work: no body = guide 1,
// {product:'<slug>'} = that guide, unknown slug = 400.
export async function POST(req: NextRequest) {
  return createGuideCheckout(req);
}
