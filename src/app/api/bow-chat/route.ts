import { NextRequest, NextResponse } from 'next/server';
import { validateBowChatInput } from '@/lib/bow-chat/script';
import { replyWithBudget, FALLBACK_LABEL } from '@/lib/bow-chat/adapter';

export const dynamic = 'force-dynamic';

const MAX_BODY_BYTES = 8 * 1024;

function errorJson(error: string) {
  return NextResponse.json(
    {
      fallback: true,
      active: false,
      label: FALLBACK_LABEL,
      error,
      reason: 'validation_failed',
    },
    { status: 400 },
  );
}

export async function POST(req: NextRequest) {
  const contentType = req.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    return NextResponse.json(
      {
        fallback: true,
        active: false,
        label: FALLBACK_LABEL,
        error: 'invalid-content-type',
        reason: 'validation_failed',
      },
      { status: 415 },
    );
  }

  const contentLength = req.headers.get('content-length');
  if (contentLength && Number.parseInt(contentLength, 10) > MAX_BODY_BYTES) {
    return NextResponse.json(
      {
        fallback: true,
        active: false,
        label: FALLBACK_LABEL,
        error: 'payload-too-large',
        reason: 'validation_failed',
      },
      { status: 413 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorJson('invalid-json');
  }

  const validated = validateBowChatInput(body);
  if (!validated.ok) {
    return errorJson('validation-error');
  }

  const result = await replyWithBudget(validated.value);

  if (result.live) {
    return NextResponse.json(
      {
        fallback: false,
        active: true,
        label: 'live',
        reply: result.reply,
        persona: 'bowbot',
        reason: null,
      },
      { status: 200 },
    );
  }

  return NextResponse.json(
    {
      fallback: true,
      active: false,
      label: FALLBACK_LABEL,
      reply: result.reply,
      persona: 'bowbot',
      reason: result.reason,
    },
    { status: 200 },
  );
}
