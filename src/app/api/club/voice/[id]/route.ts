// GET /api/club/voice/[id] - members-only streamed MP3 from private Blob
// (issue #163)

import { NextRequest, NextResponse } from 'next/server';
import { sessionFromCookieHeader } from '@/lib/club-members';

export const dynamic = 'force-dynamic';

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { 'Cache-Control': 'private, no-store' } });
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const record = await sessionFromCookieHeader(req.headers.get('cookie'));
  if (!record) return json({ error: 'auth' }, 401);

  const { id } = await context.params;
  // [id] is digits only (validate ^[0-9]{6,20}\.mp3$)
  if (!/^[0-9]{6,20}\.mp3$/.test(id)) {
    return json({ error: 'not found' }, 404);
  }

  const key = `club-voice/${id}`;

  // Use direct Blob get for streaming
  try {
    const { get } = await import('@vercel/blob');
    const blob = await get(key, { access: 'private' });
    if (!blob || blob.statusCode !== 200 || !blob.stream) {
      return json({ error: 'not found' }, 404);
    }
    return new NextResponse(blob.stream as any, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'private',
      },
    });
  } catch {
    return json({ error: 'not found' }, 404);
  }
}
