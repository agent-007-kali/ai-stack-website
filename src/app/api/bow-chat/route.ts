import { NextRequest, NextResponse } from 'next/server';
import { validateBowChatInput } from '@/lib/bow-chat/script';
import { replyWithBudget, FALLBACK_LABEL } from '@/lib/bow-chat/adapter';
import { evaluateTrial, consumeTrial, trialPayload, type BowTrialState } from '@/lib/bow-chat/trial';
import {
  CHAT_MODE,
  SHOPPING_MODE,
  SHOPPING_SIMULATED_LABEL,
  bowShoppingReply,
  bowShoppingApprovalReply,
  isApprovalRequest,
} from '@/lib/bow-chat/shopping';

export const dynamic = 'force-dynamic';

const MAX_BODY_BYTES = 8 * 1024;
const UPGRADE_HREF = '/';

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

function blockedJson(state: BowTrialState, reason: 'daily-limit' | 'trial-expired', expiresAt: number, dayIndex: number) {
  return NextResponse.json(
    {
      fallback: true,
      active: false,
      blocked: true,
      reason,
      label: FALLBACK_LABEL,
      upgradeHref: UPGRADE_HREF,
      trial: { ...trialPayload(state, { blocked: true, reason, remaining: 0, expiresAt, dayIndex }) },
    },
    { status: 403 },
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

  const input = validated.value;
  const mode = input.mode ?? CHAT_MODE;

  // 3-day free-trial gate. The demo state arrives with the request (see
  // trial.ts) — evaluate and consume here so a real datastore can replace
  // the client-supplied state without changing this route's shape.
  if (!input.trial) {
    return errorJson('trial-required');
  }
  const preVerdict = evaluateTrial(input.trial);
  if (preVerdict.blocked) {
    return blockedJson(input.trial, preVerdict.reason, preVerdict.expiresAt, preVerdict.dayIndex);
  }
  const consumed = consumeTrial(input.trial);
  const trial = {
    ...trialPayload(consumed.state, preVerdict),
    remaining: consumed.remaining,
  };

  // Shopping mode is always simulated: no provider call, no live prices, and
  // the approval line is part of every reply (see shopping.ts).
  if (mode === SHOPPING_MODE) {
    const reply = isApprovalRequest(input.message)
      ? bowShoppingApprovalReply()
      : bowShoppingReply(input.message);
    return NextResponse.json(
      {
        fallback: true,
        active: false,
        label: SHOPPING_SIMULATED_LABEL,
        reply,
        persona: 'bowbot',
        reason: 'shopping_simulated',
        mode,
        trial,
      },
      { status: 200 },
    );
  }

  const result = await replyWithBudget(input);

  if (result.live) {
    return NextResponse.json(
      {
        fallback: false,
        active: true,
        label: 'live',
        reply: result.reply,
        persona: 'bowbot',
        reason: null,
        mode,
        trial,
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
      mode,
      trial,
    },
    { status: 200 },
  );
}
