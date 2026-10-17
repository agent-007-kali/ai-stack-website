// Server-side provider adapter for the /sales agent. FAIL-CLOSED.
//
// BOUNDARY
// --------
// The browser never talks to a model provider. It talks to POST
// /api/sales-agent, which uses this adapter. Until activation is separately
// approved and configured, the adapter always returns `{ mode: 'fallback' }`
// and the UI answers from the deterministic engine in ./engine.
//
// Guarantees enforced here:
//   - The API key comes ONLY from the environment (no key is ever committed).
//   - A hard monthly budget cap (in cents) is required; missing or zero cap
//     means no paid call is allowed.
//   - Any provider error, timeout or unexpected shape falls back, never throws.
//   - No provider SDK is imported and no call is made in this task.
//
// HONEST LIMIT: an in-process counter is NOT a globally enforceable cap on
// multi-instance hosting. A real cap needs an owner-approved shared store
// before paid calls are switched on.

export const PROVIDER_KEY_ENV = 'SALES_AGENT_API_KEY';
export const PROVIDER_BUDGET_ENV = 'SALES_AGENT_MONTHLY_BUDGET_CENTS';

/** Estimated cost of one short reply, in cents. Conservative. */
export const ESTIMATED_REPLY_CENTS = 2;

export type ProviderFallbackReason =
  | 'no-key'
  | 'no-budget-cap'
  | 'budget-exhausted'
  | 'not-activated';

export type ProviderResult =
  | { mode: 'fallback'; reason: ProviderFallbackReason }
  | { mode: 'live'; reply: string; costCents: number };

export interface ProviderStatus {
  /** Whether a key exists in the environment. Does NOT mean calls are enabled. */
  keyPresent: boolean;
  /** Monthly cap in cents (0 = not configured). */
  budgetCents: number;
  /** Cents already spent this process lifetime. */
  spentCents: number;
  /** True only when a key AND a positive budget cap are both configured. */
  paidCallsAllowed: boolean;
}

let spentCents = 0;

function readBudgetCents(): number {
  const raw = process.env[PROVIDER_BUDGET_ENV];
  if (!raw) return 0;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function providerStatus(): ProviderStatus {
  const keyPresent = Boolean(process.env[PROVIDER_KEY_ENV]);
  const budgetCents = readBudgetCents();
  return {
    keyPresent,
    budgetCents,
    spentCents,
    paidCallsAllowed: keyPresent && budgetCents > 0 && spentCents + ESTIMATED_REPLY_CENTS <= budgetCents,
  };
}

/**
 * Ask the configured provider for a reply. Always fail-closed in this build.
 * Kept async so a real implementation can be dropped in without changing the
 * route contract.
 */
export async function requestProviderReply(message: string): Promise<ProviderResult> {
  void message; // a real implementation sends the visitor text to the provider
  const status = providerStatus();
  if (!status.keyPresent) return { mode: 'fallback', reason: 'no-key' };
  if (status.budgetCents <= 0) return { mode: 'fallback', reason: 'no-budget-cap' };
  if (status.spentCents + ESTIMATED_REPLY_CENTS > status.budgetCents) {
    return { mode: 'fallback', reason: 'budget-exhausted' };
  }
  // A key and a cap exist, but live calls are still not approved in this task.
  return { mode: 'fallback', reason: 'not-activated' };
}

/** Called by a real implementation after a successful paid call. */
export function recordSpend(cents: number): void {
  if (Number.isFinite(cents) && cents > 0) spentCents += cents;
}
