import { NextRequest, NextResponse } from 'next/server';
import { get } from '@vercel/blob';
import { cryptoSecret, resolveCryptoProduct, verifyDownload } from '@/lib/crypto-pay';
import { BUNDLE_SLUGS, guideBySlug } from '@/lib/guides';

// GET /api/crypto-pay/download?product&sig&t[&item] - streams the purchased
// PDF once the reference has been validated on-chain (the token is minted
// only by the status route after validateTransfer passes, issue #36 spec
// item 4). Same private-Blob streaming as the Stripe route
// (src/lib/guide-handlers.ts guideDownload) - the public blob URL is never
// exposed. The confirmed signature rides in every link: it is the receipt.

export async function GET(req: NextRequest): Promise<NextResponse> {
  const secret = cryptoSecret();
  const u = new URL(req.url);
  const product = u.searchParams.get('product') || '';
  const sig = u.searchParams.get('sig') || '';
  const token = u.searchParams.get('t') || '';
  const item = u.searchParams.get('item') || '';

  if (!verifyDownload(product, sig, token, secret)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const resolved = resolveCryptoProduct(product);
  if (!resolved || (resolved.kind !== 'guide' && resolved.kind !== 'bundle')) {
    // audit/build have no PDF (delivery there is the on-page handoff).
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // Bundle: one signed token fans out to the four guides, exactly like the
  // Stripe thanks page - each item must be one of the original four.
  if (resolved.kind === 'bundle') {
    if (!item || !BUNDLE_SLUGS.includes(item)) {
      return NextResponse.json({ error: 'Unknown bundle item' }, { status: 400 });
    }
    const guide = guideBySlug(item);
    if (!guide) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return streamPdf(guide.blobPathname, guide.blobPathname.split('/').pop() || 'guide.pdf');
  }

  const guide = guideBySlug(product);
  if (!guide || !guide.blobPathname) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return streamPdf(guide.blobPathname, guide.blobPathname.split('/').pop() || 'guide.pdf');
}

async function streamPdf(pathname: string, filename: string): Promise<NextResponse> {
  let blob: Awaited<ReturnType<typeof get>> | null = null;
  try {
    blob = await get(pathname, { access: 'private' });
  } catch (e) {
    console.error('[crypto-pay] download blob read failed', { pathname, error: e instanceof Error ? e.message : e });
    blob = null;
  }
  if (!blob || blob.statusCode !== 200 || !blob.stream) {
    return NextResponse.json({ error: 'File unavailable' }, { status: 500 });
  }
  return new NextResponse(blob.stream, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
