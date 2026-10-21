import { NextRequest, NextResponse } from 'next/server';
import { buildPaymentTransaction, cryptoSecret, verifyReference } from '@/lib/crypto-pay';

// Solana Pay transaction-request endpoint (issue #36 Option B, spec item 1).
// The wallet QR-decodes `solana:<this-url>`, then:
//   GET  -> { label, icon }  (spec: payment metadata)
//   POST -> { transaction }  (spec: base64 unsigned tx; body { account })
// The buyer's wallet injects a recent blockhash, signs and sends - we never
// hold keys and never sign. The reference token (t) binds ref+product+usd.

function params(req: NextRequest) {
  const u = new URL(req.url);
  return {
    ref: u.searchParams.get('ref') || '',
    product: u.searchParams.get('product') || '',
    usd: Number(u.searchParams.get('usd') || ''),
    t: u.searchParams.get('t') || '',
  };
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const secret = cryptoSecret();
  const { ref, product, usd, t } = params(req);
  const check = verifyReference(ref, product, usd, t, secret);
  if (!check.ok) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  const appUrl = (req.headers.get('origin') || '').replace(/\/+$/, '')
    || process.env.NEXT_PUBLIC_APP_URL
    || 'https://ai-solutions.company';
  // Spec: label + icon for the wallet's confirmation screen.
  return NextResponse.json({ label: 'AI Solutions', icon: `${appUrl}/icon.svg` });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const secret = cryptoSecret();
  const { ref, product, usd, t } = params(req);
  const check = verifyReference(ref, product, usd, t, secret);
  if (!check.ok) {
    return NextResponse.json({ error: 'Invalid or expired payment request' }, { status: 404 });
  }

  let account = '';
  try {
    const body = (await req.json()) as { account?: unknown };
    account = typeof body?.account === 'string' ? body.account : '';
  } catch {
    /* falls through to 400 */
  }
  if (!account) {
    return NextResponse.json({ error: 'Missing account parameter' }, { status: 400 });
  }

  try {
    const transaction = await buildPaymentTransaction(account, ref, usd);
    return NextResponse.json({
      transaction,
      message: `AI Solutions - ${product} - ${usd} USDC`,
    });
  } catch (e) {
    console.error('[crypto-pay] transaction build failed', e);
    return NextResponse.json({ error: 'Failed to create transaction' }, { status: 500 });
  }
}
