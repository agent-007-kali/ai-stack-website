// Provider adapter for Bow Chat.
//
// STAGED PATTERN (mirrors the #64 sales-chat preview scaffold)
// ------------------------------------------------------------
// The model is fronted behind this adapter so the HTTP route never talks to a
// provider directly and the UI never talks to a provider at all.
//
// Rules enforced here:
//   1. The provider key is read from an environment variable ONLY. It is never
//      hard-coded, never logged, never returned in a response and never present
//      in the repository.
//   2. A hard monthly budget cap is enforced before any provider call. The cap
//      and the per-call cost estimate are also read from environment variables.
//   3. If no provider key is configured, or the monthly cap is already spent,
//      the adapter returns an honest scripted demo reply and makes NO provider
//      call and incurs NO spend.
//   4. Any provider error, timeout or malformed response degrades to the same
//      scripted fallback. The route never throws.
//
// BUDGET CAVEAT (same as #64): an in-process counter is NOT an enforceable
// global cap on multi-instance serverless hosting — instances do not share
// memory and scale-outs reset it. This adapter therefore ships with the cap
// disabled for spend by default and is intended for owner-configured activation
// only. No paid call is made in the default configuration.

import { bowScriptReply } from './script';

export const FALLBACK_LABEL = 'scripted demo, not live';

export type BowProviderResult =
  | { ok: true; live: true; reply: string }
  | { ok: true; live: false; reply: string; reason: BowFallbackReason };

export type BowFallbackReason =
  | 'no_provider_key'
  | 'budget_exhausted'
  | 'provider_error'
  | 'provider_timeout'
  | 'provider_malformed';

export type BowProviderConfig = {
  /** Provider API key, from env only. Empty string when not configured. */
  apiKey: string;
  /** Provider base URL, from env only. Empty string when not configured. */
  baseUrl: string;
  /** Hard monthly budget cap in GBP. 0 or less disables paid calls. */
  monthlyBudgetGbp: number;
  /** Estimated cost per call in GBP. Used against the monthly cap. */
  costPerCallGbp: number;
};

export const BOW_PROVIDER_ENV = {
  apiKey: 'BOW_CHAT_PROVIDER_API_KEY',
  baseUrl: 'BOW_CHAT_PROVIDER_BASE_URL',
  monthlyBudget: 'BOW_CHAT_MONTHLY_BUDGET_GBP',
  costPerCall: 'BOW_CHAT_COST_PER_CALL_GBP',
} as const;

const DEFAULT_COST_PER_CALL_GBP = 0.01;

function readConfig(): BowProviderConfig {
  const env = process.env as Record<string, string | undefined>;
  const monthly = Number.parseFloat(env[BOW_PROVIDER_ENV.monthlyBudget] ?? '0');
  const cost = Number.parseFloat(
    env[BOW_PROVIDER_ENV.costPerCall] ?? String(DEFAULT_COST_PER_CALL_GBP),
  );
  return {
    apiKey: env[BOW_PROVIDER_ENV.apiKey] ?? '',
    baseUrl: env[BOW_PROVIDER_ENV.baseUrl] ?? '',
    monthlyBudgetGbp: Number.isFinite(monthly) ? monthly : 0,
    costPerCallGbp: Number.isFinite(cost) && cost > 0 ? cost : DEFAULT_COST_PER_CALL_GBP,
  };
}

// Per-instance monthly spend tracker. Reset on instance restart. Documented as
// NOT a global enforceable cap — see the caveat above.
let spentThisMonthGbp = 0;
let spendMonthKey = monthKey();

function monthKey(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${d.getUTCMonth() + 1}`;
}

function rollMonthIfNeeded(): void {
  const key = monthKey();
  if (key !== spendMonthKey) {
    spendMonthKey = key;
    spentThisMonthGbp = 0;
  }
}

export type BowChatTurn = { role: 'user' | 'assistant'; content: string };

export type BowProviderInput = {
  message: string;
  sessionId?: string;
  history?: BowChatTurn[];
};

const SYSTEM_PROMPT =
  'You are Bow Bot, the assistant for the Bow Bot 3-day free trial. ' +
  'Be concise and helpful. Never invent prices or promises.';

function scripted(message: string): string {
  return bowScriptReply(message);
}

async function callProvider(
  config: BowProviderConfig,
  input: BowProviderInput,
): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...(input.history ?? []).map((t) => ({ role: t.role, content: t.content })),
      { role: 'user', content: input.message },
    ];
    const res = await fetch(config.baseUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({ messages }),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error('provider_http_' + res.status);
    let data: unknown;
    try {
      data = await res.json();
    } catch {
      throw new Error('provider_malformed');
    }
    const text = (data as { reply?: unknown })?.reply;
    if (typeof text !== 'string' || !text.trim()) throw new Error('provider_malformed');
    return text.trim();
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('provider_timeout');
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Produce one reply for one visitor message. Never throws.
 *
 * Returns `live: true` only when a provider key is configured, the monthly cap
 * allows the call, and the provider answered. Otherwise returns an honest
 * scripted fallback labelled "scripted demo, not live".
 */
export async function replyWithBudget(input: BowProviderInput): Promise<BowProviderResult> {
  const config = readConfig();

  if (!config.apiKey) {
    return { ok: true, live: false, reply: scripted(input.message), reason: 'no_provider_key' };
  }

  rollMonthIfNeeded();
  if (spentThisMonthGbp + config.costPerCallGbp > config.monthlyBudgetGbp) {
    return { ok: true, live: false, reply: scripted(input.message), reason: 'budget_exhausted' };
  }

  try {
    const reply = await callProvider(config, input);
    spentThisMonthGbp += config.costPerCallGbp;
    return { ok: true, live: true, reply };
  } catch (err) {
    const message = err instanceof Error ? err.message : '';
    const reason: BowFallbackReason = message.startsWith('provider_timeout')
      ? 'provider_timeout'
      : message.startsWith('provider_malformed')
        ? 'provider_malformed'
        : 'provider_error';
    return { ok: true, live: false, reply: scripted(input.message), reason };
  }
}
