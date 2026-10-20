import { NextRequest, NextResponse } from 'next/server';
import { get } from '@vercel/blob';
import { GUIDES } from '@/lib/guides';
import { sampleFilename, verifySampleToken } from '@/lib/sample';

// GET /api/sample/download?guide=...&t=... — streams the free chapter from the
// PRIVATE Blob store (samples/<slug>.pdf), server-side only, never a public
// URL (issue #127). Bad or expired token = 403, unknown guide = 404, missing
// Blob object = a short plain 404 (the chapter is being prepared).
export async function GET(req: NextRequest): Promise<NextResponse> {
  const guide = req.nextUrl.searchParams.get('guide') || '';
  const token = req.nextUrl.searchParams.get('t') || '';
  const secret = (process.env.SAMPLE_LINK_SECRET ?? '').trim();

  if (!secret || !verifySampleToken(guide, token, secret)) {
    return new NextResponse('This link is invalid or has expired.', { status: 403 });
  }
  if (!GUIDES.some((g) => g.slug === guide)) {
    return new NextResponse('Not found.', { status: 404 });
  }

  let blobResult: Awaited<ReturnType<typeof get>> | null = null;
  try {
    blobResult = await get(`samples/${guide}.pdf`, { access: 'private' });
  } catch {
    blobResult = null;
  }
  if (!blobResult || blobResult.statusCode !== 200 || !blobResult.stream) {
    return new NextResponse('Your sample chapter is on the way. This link will work once it exists.', {
      status: 404,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  return new NextResponse(blobResult.stream, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${sampleFilename(guide)}"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
