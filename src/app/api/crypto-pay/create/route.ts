import { NextRequest, NextResponse } from 'next/server';
import { cryptoSecret, newReference, resolveCryptoProduct, signReference } from '@/lib/crypto-pay';

// POST /api/crypto-pay/create - mint a payment reference for one product
// (issue #36 Option B). Stateless: the ref -> product/amount mapping travels
// in an HMAC token the browser carries, so any serverless instance can verify
// it without any store. Rate-limited per IP *per product* (the /guide page
// offers several blocks, and a human retrying one product is fine); loud
// console errors on config problems (house rule: failures are logged, never
// swallowed).
const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 60 * 60 * 1000;
const hits = new Map<string, number[]>();

function rateAllowed(key: string, now = Date.now()): boolean {
  const windowStart = now - RATE_WINDOW_MS;
  const list = (hits.get(key) || []).filter((t) => t > windowStart);
  if (list.length >= RATE_LIMIT) {
    hits.set(key, list);
    return false;
  }
  list.push(now);
  hits.set(key, list);
  return true;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  let product = '';
  try {
    const body = (await req.json()) as { product?: unknown };
    product = typeof body?.product === 'string' ? body.product : '';
  } catch {
    /* falls through to 400 */
  }
  if (!product) {
    return NextResponse.json({ error: 'Missing product' }, { status: 400 });
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  if (!rateAllowed(`${ip}:${product}`)) {
    return NextResponse.json({ error: 'Too many payment requests' }, { status: 429 });
  }

  const secret = cryptoSecret();
  if (!secret) {
    console.error('[crypto-pay] CRYPTO_PAY_SECRET (or fallback secret) is not set - create refused');
    return NextResponse.json({ error: 'Crypto payment not configured' }, { status: 503 });
  }

  const resolved = resolveCryptoProduct(product);
  if (!resolved) {
    // No fixed USD price (env unset or price outside the table): the client
    // hides the crypto block - same rule as the mailto fallback.
    return NextResponse.json({ error: 'USD price unavailable' }, { status: 409 });
  }

  // Absolute endpoint for the QR/deeplink: browser Origin header, else the
  // request's own origin (server-to-server), else configured app URL.
  const appUrl = (req.headers.get('origin') || '').replace(/\/+$/, '')
    || new URL(req.url).origin
    || process.env.NEXT_PUBLIC_APP_URL
    || 'https://ai-solutions.company';

  const ref = newReference();
  const { token, expiry } = signReference(ref, resolved.product, resolved.usd, secret);
  const qs = `ref=${ref}&product=${encodeURIComponent(resolved.product)}&usd=${resolved.usd}&t=${token}`;
  const url = `${appUrl}/api/crypto-pay?${qs}`;

  console.log(
    `[crypto-pay] reference minted product=${resolved.product} usd=${resolved.usd} exp=${new Date(expiry).toISOString()}`,
  );
  return NextResponse.json({
    ref,
    token,
    product: resolved.product,
    kind: resolved.kind,
    name: resolved.name,
    usd: resolved.usd,
    pounds: resolved.pounds,
    expiresAt: expiry,
    url,
    // What goes in the QR: a Solana Pay transaction-request URL.
    solanaUrl: `solana:${url}`,
    statusUrl: `/api/crypto-pay/status?${qs}`,
  });
}
