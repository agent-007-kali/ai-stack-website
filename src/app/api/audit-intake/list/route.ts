import { NextRequest, NextResponse } from 'next/server';
import { get, list } from '@vercel/blob';

// GET /api/audit-intake/list — stored £75 audit intake submissions as JSON,
// gated by SIGNUPS_ADMIN_TOKEN sent as an Authorization: Bearer header
// (issue #39). Wrong or missing token, or unset env, = 404 so the endpoint
// does not advertise itself. Emails and answers are never logged; the
// records only come back through this authenticated read of the private
// Blob store (same list+get shape as /api/sample/signups).
export async function GET(req: NextRequest): Promise<NextResponse> {
  const auth = req.headers.get('authorization') || '';
  const token = (process.env.SIGNUPS_ADMIN_TOKEN ?? '').trim();
  if (!token || auth !== `Bearer ${token}`) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  try {
    const listed = await list({ prefix: 'audit-intake/' });
    const submissions: unknown[] = [];
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
        submissions.push(JSON.parse(text));
      } catch {
        /* skip unreadable record */
      }
    }
    return NextResponse.json(submissions);
  } catch {
    return NextResponse.json({ error: 'Could not read submissions' }, { status: 500 });
  }
}
