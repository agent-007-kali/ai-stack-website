import { NextRequest, NextResponse } from 'next/server';
import { normaliseSite, normaliseTask, scoreSite } from '@/lib/bot-score';

// GET /api/bot/score?site=example.com&task=read
// Demonstration of the Bot-Friendliness Score engine. Registry + fixtures
// only; this route performs no network fetch of the requested site.
export async function GET(request: NextRequest) {
  const site = normaliseSite(request.nextUrl.searchParams.get('site'));
  const task = normaliseTask(request.nextUrl.searchParams.get('task'));

  if (!site) {
    return NextResponse.json(
      {
        error: 'missing_or_invalid_site',
        usage: '/api/bot/score?site=github.com&task=read  (task: read | account | post | buy, default read)',
        try: '/api/bot/score?site=fixture-open.example&task=read',
      },
      { status: 400 },
    );
  }
  if (!task) {
    return NextResponse.json(
      { error: 'invalid_task', allowed: ['read', 'account', 'post', 'buy'] },
      { status: 400 },
    );
  }

  return NextResponse.json({
    ...scoreSite(site, task),
    engine: {
      name: 'bot-friendliness-score',
      version: '0.1.0-preview',
      mode: 'registry+fixtures, no live fetch',
      scale: '/bot',
      disclaimer:
        'Demonstration. DECLARED means the site says so; it is not proof the route works. U means unsettled, never a low score. Nothing here is a public rating.',
    },
  });
}
