import { NextRequest, NextResponse } from 'next/server';
import { createMerchantClient } from '@solana/pay';
import { checkPayment, cryptoSecret, signDownload, verifyReference, type PaymentDeps } from '@/lib/crypto-pay';

// GET /api/crypto-pay/status?ref&product&usd&t - the browser polls this every
// ~2s after the QR is shown (issue #36 spec item 3). Server-side:
// findReference (a tx mentioning the reference) + validateTransfer (recipient,
// exact amount, USDC mint, reference all match). Only a full pass returns
// 'confirmed' and mints the download token - underpayment or wrong token
// stays 'pending' forever and the reference expires safely.

const PUBLIC_RPC = 'https://api.mainnet-beta.solana.com';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const secret = cryptoSecret();
  const u = new URL(req.url);
  const ref = u.searchParams.get('ref') || '';
  const product = u.searchParams.get('product') || '';
  const usd = Number(u.searchParams.get('usd') || '');
  const t = u.searchParams.get('t') || '';

  const check = verifyReference(ref, product, usd, t, secret);
  if (!check.ok) {
    if (check.reason === 'expired') return NextResponse.json({ status: 'expired' });
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const rpcUrl = (process.env.SOLANA_RPC_URL || '').trim() || PUBLIC_RPC;
  const merchant = createMerchantClient({ rpcUrl });
  const deps: PaymentDeps = {
    findReference: async (r) =>
      (await merchant.pay.findReference(r)) as unknown as { signature: string },
    validateTransfer: async (sig, fields) =>
      merchant.pay.validateTransfer(
        sig as Parameters<typeof merchant.pay.validateTransfer>[0],
        fields as unknown as Parameters<typeof merchant.pay.validateTransfer>[1],
      ),
  };

  const result = await checkPayment(deps, ref, usd);

  if (result.status === 'unverifiable') {
    // Loud, not swallowed: RPC flaked (public endpoint rate limits are the
    // known case - SOLANA_RPC_URL is the free-tier escape hatch).
    console.error('[crypto-pay] status check unverifiable', { ref, reason: result.reason });
    return NextResponse.json({ status: 'unverifiable', usd, product });
  }

  if (result.status === 'pending') {
    return NextResponse.json({ status: 'pending', usd, product });
  }

  const kind = product.startsWith('guide') ? 'guide' : null;
  console.log(`[crypto-pay] CONFIRMED product=${product} usd=${usd} sig=${result.signature}`);

  // Only file-backed products get a download token; audit/build hand off on
  // the page (no PDF exists for them on the Stripe path either).
  const isFile = product !== 'audit' && product !== 'build-setup' && product !== 'build-build';
  const downloadToken = isFile ? signDownload(product, result.signature, secret) : undefined;

  return NextResponse.json({
    status: 'confirmed',
    signature: result.signature,
    product,
    kind,
    usd,
    downloadToken,
  });
}
