// GET /api/club/cron - Vercel cron for the AI Money Club (issue #53).
// Posts Jarvis's daily prompt to #ideas at most once per UTC day.
// Auth: Bearer ${CRON_SECRET}. Fail-closed when the secret is unset -
// a publicly triggerable endpoint must never exist.

import { NextRequest, NextResponse } from 'next/server';
import { postDailyPromptIfDue } from '@/lib/club-host';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const secret = (process.env.CRON_SECRET ?? '').trim();
  const auth = (req.headers.get('authorization') ?? '').trim();
  const devBypass = process.env.NODE_ENV !== 'production' && auth === 'Bearer dev-cron';

  if (!secret || (auth !== `Bearer ${secret}` && !devBypass)) {
    if (!secret) {
      console.error('[club-cron] CRON_SECRET not set - daily prompt cannot run (fail-closed).');
    }
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const { posted } = await postDailyPromptIfDue();
    return NextResponse.json({ ok: true, posted }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    console.error('[club-cron] failed', e);
    return NextResponse.json({ error: 'cron failed' }, { status: 500 });
  }
}
