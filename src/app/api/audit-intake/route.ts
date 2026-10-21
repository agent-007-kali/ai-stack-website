// Ten-question intake for the £75 AI audit (issue #25, reliability fix
// issue #39). Same approved pattern as the /sample signup: a plain HTML form
// POST, no JS, server-side validation and a 303 redirect to
// /audit/thanks?intake=1. Order matters: the private Blob record is written
// FIRST and its failure is fatal (real 500, no fake thanks) so an answer
// can never vanish silently; the Formspree notification is best-effort but
// LOUD — a missing env or a failed POST is console.error'd for the Vercel
// runtime logs, never skipped in silence. Submissions are readable via
// GET /api/audit-intake/list (SIGNUPS_ADMIN_TOKEN bearer).
import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { rateAllowed } from '@/lib/sample';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest): Promise<NextResponse> {
  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown';
  if (!rateAllowed(ip)) {
    return new NextResponse('Too many submissions from this address. Try again later.', { status: 429 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Bad form' }, { status: 400 });
  }

  const get = (name: string) => String(form.get(name) ?? '').trim();
  const answers = {
    '1. Business name + website': get('business'),
    '2. What the business does': get('what'),
    '3. People working in it': get('people'),
    '4. Biggest time-eater each week': get('timeeater'),
    '5. Tools already in use': get('tools'),
    '6. Tried with AI so far': get('aitried'),
    '7. Would automate tomorrow': get('automate'),
    '8. Do NOT touch with AI': get('donttouch'),
    '9. Best email for the report': get('email'),
    '10. Anything else': get('other'),
  };
  const honeypot = get('website');

  // Required: who you are, what you do, where the report goes. The rest is
  // encouraged but optional - an empty answer is still an answer.
  if (!answers['1. Business name + website'] || answers['1. Business name + website'].length > 200) {
    return new NextResponse('Business name is required (max 200 characters).', { status: 400 });
  }
  if (!answers['2. What the business does'] || answers['2. What the business does'].length > 500) {
    return new NextResponse('Tell me what the business does (max 500 characters).', { status: 400 });
  }
  const email = answers['9. Best email for the report'];
  if (!email || email.length > 200 || !EMAIL_RE.test(email)) {
    return new NextResponse('A valid email for the report is required.', { status: 400 });
  }

  // Honeypot filled = bot: pretend success, send nothing.
  if (!honeypot) {
    // 1. Private Blob record FIRST - storage failure is fatal. A submission
    // the store rejects must NOT see a fake thanks page (issue #39).
    const record = { ...answers, ts: new Date().toISOString() };
    try {
      await put(`audit-intake/${Date.now()}.json`, JSON.stringify(record), {
        access: 'private',
        addRandomSuffix: true,
        contentType: 'application/json',
      });
    } catch (e) {
      console.error('[audit-intake] private Blob store FAILED, submission not saved:', e);
      return new NextResponse(
        'We could not store your answers, please email tradersbooking@gmail.com',
        { status: 500 },
      );
    }
    // 2. Notification email -> tradersbooking@gmail.com. Best effort, but a
    // missing env or a failed POST is logged loudly, never silent (issue #39).
    const formspreeId = (process.env.FORMSPREE_FORM_ID ?? '').trim();
    if (!formspreeId) {
      console.error(
        '[audit-intake] FORMSPREE_FORM_ID is not set - notification email NOT sent; answers are stored in the private Blob only',
      );
    } else {
      try {
        const res = await fetch(`https://formspree.io/f/${encodeURIComponent(formspreeId)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({
            ...answers,
            _subject: `£75 AI Audit intake - ${answers['1. Business name + website']}`,
            _template: 'table',
          }),
        });
        if (!res.ok) {
          console.error(`[audit-intake] Formspree notification FAILED: HTTP ${res.status}`);
        }
      } catch (e) {
        console.error('[audit-intake] Formspree notification FAILED with error:', e);
      }
    }
  }

  return NextResponse.redirect(`${req.nextUrl.origin}/audit/thanks?intake=1`, 303);
}
