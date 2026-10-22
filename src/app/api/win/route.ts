import { NextRequest, NextResponse } from 'next/server';
import { get, put } from '@vercel/blob';
import { analyzeSite, TEASER, type Win } from '@/lib/wins';
import { fetchHomepage } from '@/lib/win-fetch';

// POST /api/win — the free "3 best AI wins" checker (issue #32). Rule-based,
// no keys, no spend: fetch the homepage behind an SSRF guard, turn the HTML
// into three wins, and capture the lead {ts, email, url, wins} as JSONL in
// the PRIVATE Blob store (leads/wins.jsonl). An unreadable site still gets
// three trade-detected generic wins and the email is still captured — the
// tool never 500s on a site that will not load. Capture failures are
// console.error'd loudly (never silent) and the wins are still served.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LEADS_KEY = 'leads/wins.jsonl';

// 5 checks per IP per hour (in-memory, per spec; serverless instances each
// keep their own counter — enough to stop abuse, nothing persistent).
const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 60 * 60 * 1000;
const hits = new Map<string, number[]>();

function rateAllowed(ip: string, now = Date.now()): boolean {
  const windowStart = now - RATE_WINDOW_MS;
  const list = (hits.get(ip) || []).filter((t) => t > windowStart);
  if (list.length >= RATE_LIMIT) {
    hits.set(ip, list);
    return false;
  }
  list.push(now);
  hits.set(ip, list);
  return true;
}

type WinBody = { url?: unknown; email?: unknown };

async function captureLead(record: {
  ts: string;
  email: string;
  url: string;
  wins: Win[];
  trade: string;
  unreadable: boolean;
}): Promise<boolean> {
  try {
    let existing = '';
    try {
      const cur = await get(LEADS_KEY, { access: 'private' });
      if (cur && cur.statusCode === 200 && cur.stream) {
        existing = await new Response(cur.stream).text();
      }
    } catch {
      /* first write, nothing to append to */
    }
    const line = JSON.stringify(record) + '\n';
    await put(LEADS_KEY, existing + line, {
      access: 'private',
      allowOverwrite: true,
      contentType: 'application/x-ndjson',
    });
    return true;
  } catch (e) {
    console.error('[win] lead capture FAILED (wins still served):', e);
    return false;
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: WinBody;
  try {
    body = (await req.json()) as WinBody;
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }

  const email = typeof body.email === 'string' ? body.email.trim() : '';
  let rawUrl = typeof body.url === 'string' ? body.url.trim() : '';
  if (!rawUrl || rawUrl.length > 500) {
    return NextResponse.json({ error: 'Please enter your website address.' }, { status: 400 });
  }
  if (!rawUrl.match(/^https?:\/\//i)) rawUrl = `https://${rawUrl}`;
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') throw new Error('protocol');
  } catch {
    return NextResponse.json({ error: 'Please enter a valid website address.' }, { status: 400 });
  }
  if (!email || email.length > 200 || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: 'Please enter a valid email for the breakdown.' }, { status: 400 });
  }

  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown';
  if (!rateAllowed(ip)) {
    return NextResponse.json(
      { error: 'That is five checks from this address for now — try again in an hour.' },
      { status: 429 },
    );
  }

  const fetched = await fetchHomepage(rawUrl);
  const html = fetched.ok ? fetched.html : null;
  if (!fetched.ok) {
    // Expected for unreachable/JS-only/blocked sites — not an error.
    console.warn(`[win] site not readable (${fetched.reason}) for ${rawUrl}`);
  }

  const analysis = analyzeSite(rawUrl, html);
  const captured = await captureLead({
    ts: new Date().toISOString(),
    email,
    url: rawUrl,
    wins: analysis.wins,
    trade: analysis.trade,
    unreadable: analysis.unreadable,
  });

  return NextResponse.json({
    wins: analysis.wins,
    teaser: TEASER,
    unreadable: analysis.unreadable,
    captured,
  });
}
