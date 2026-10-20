import { NextRequest, NextResponse } from 'next/server';
import { get, list } from '@vercel/blob';

// GET /api/sample/signups?key=... — stored free-chapter signups as JSON,
// gated by env SAMPLE_ADMIN_KEY (issue #127). Wrong or missing key = 404 so
// the endpoint does not advertise itself. Emails are never logged.
export async function GET(req: NextRequest): Promise<NextResponse> {
  const key = req.nextUrl.searchParams.get('key') || '';
  const adminKey = (process.env.SAMPLE_ADMIN_KEY ?? '').trim();
  if (!adminKey || key !== adminKey) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  try {
    const listed = await list({ prefix: 'signups/' });
    const signups: unknown[] = [];
    for (const blob of listed.blobs) {
      let res: Awaited<ReturnType<typeof get>> | null = null;
      try {
        res = await get(blob.pathname, { access: 'private' });
      } catch {
        res = null;
      }
      if (!res || res.statusCode !== 200 || !res.stream) continue;
      const text = await new Response(res.stream).text();
      try {
        signups.push(JSON.parse(text));
      } catch {
        /* skip unreadable record */
      }
    }
    return NextResponse.json(signups);
  } catch {
    return NextResponse.json({ error: 'Could not read signups' }, { status: 500 });
  }
}
