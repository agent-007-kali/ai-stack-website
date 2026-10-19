import { NextRequest } from 'next/server';
import { guideDownload } from '@/lib/guide-handlers';

// Streams the paid guide PDF from the private Blob store (issue #122).
// Shared handler: Stripe paid check, metadata.product picks the product.
export async function GET(req: NextRequest) {
  return guideDownload(req);
}
