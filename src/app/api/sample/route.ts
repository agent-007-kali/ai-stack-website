import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { GUIDES } from '@/lib/guides';
import { rateAllowed, signSampleToken } from '@/lib/sample';

// POST /api/sample — free-chapter signup (issue #127). Validates the form,
// stores one JSON record per signup in the PRIVATE Blob store, then 303s to
// /sample/thanks with an HMAC-signed, 7-day download token.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest): Promise<NextResponse> {
  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown';
  if (!rateAllowed(ip)) {
    return new NextResponse('Too many signups from this address. Try again later.', { status: 429 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Bad form' }, { status: 400 });
  }
  const name = String(form.get('name') ?? '').trim();
  const email = String(form.get('email') ?? '').trim();
  const guide = String(form.get('guide') ?? '').trim();
  const honeypot = String(form.get('website') ?? '');

  if (!GUIDES.some((g) => g.slug === guide)) {
    return NextResponse.json({ error: 'Unknown guide' }, { status: 400 });
  }
  if (name.length < 1 || name.length > 80) {
    return NextResponse.json({ error: 'Name must be 1-80 characters' }, { status: 400 });
  }
  if (email.length > 200 || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
  }

  const secret = (process.env.SAMPLE_LINK_SECRET ?? '').trim();
  if (!secret) {
    return NextResponse.json({ error: 'Sample signup not configured' }, { status: 500 });
  }

  // Honeypot filled = bot: pretend success, store nothing.
  if (!honeypot) {
    const record = { name, email, guide, ts: new Date().toISOString() };
    try {
      await put(`signups/${Date.now()}-${guide}.json`, JSON.stringify(record), {
        access: 'private',
        addRandomSuffix: true,
        contentType: 'application/json',
      });
    } catch {
      return NextResponse.json({ error: 'Could not store signup' }, { status: 500 });
    }
  }

  const token = signSampleToken(guide, secret);
  return NextResponse.redirect(
    `${req.nextUrl.origin}/sample/thanks?guide=${encodeURIComponent(guide)}&t=${encodeURIComponent(token)}`,
    303,
  );
}
