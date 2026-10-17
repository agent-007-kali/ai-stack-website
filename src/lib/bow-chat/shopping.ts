// Bow Shopping mode for Bow Chat.
//
// HONESTY RULES (enforced by this module's output shape)
// ------------------------------------------------------
//   1. Every reply is explicitly labelled "simulated" — the results are
//      illustrative, never live prices, unless a real pricing source is wired
//      in later (none is today).
//   2. Every reply ends with the approval line: nothing is bought, ordered or
//      charged without the visitor's explicit approval, and this demo never
//      performs a purchase, order or checkout.
//   3. No payment flow exists here — approving anything only ever produces
//      another simulated message.

export const SHOPPING_MODE = 'shopping' as const;
export const CHAT_MODE = 'chat' as const;
export type BowChatMode = typeof CHAT_MODE | typeof SHOPPING_MODE;

export const SHOPPING_SIMULATED_LABEL = 'simulated result, not live';

export const SHOPPING_APPROVAL_LINE =
  'Nothing is bought without your explicit approval - no order, no payment, ' +
  'no purchase unless you say so.';

export const SHOPPING_MODE_INTRO =
  'Shopping mode on. Give me a brief and a budget and I will compare a few ' +
  'options. Every result is simulated, not live prices. ' + SHOPPING_APPROVAL_LINE;

/** Whole replies must stay under the 500-char history limit (see script.ts). */
const REPLY_BUDGET_CHARS = 500;
const BRIEF_MAX = 40;

export type ParsedBudget = { amount: number; symbol: string };

function toAmount(raw: string): number {
  return Number.parseFloat(raw.replace(/,/g, ''));
}

/** Pull a budget out of free text: "£300", "250 pounds", "budget of 400". */
export function parseBudget(message: string): ParsedBudget | null {
  const symbolled = message.match(/(£|€|\$)\s?(\d[\d,]*(?:\.\d+)?)/);
  if (symbolled) {
    const amount = toAmount(symbolled[2]);
    if (amount > 0 && amount < 1_000_000) return { amount, symbol: symbolled[1] };
  }
  const spelled = message.match(/\b(\d[\d,]*(?:\.\d+)?)\s?(?:gbp|pounds?|quid)\b/i);
  if (spelled) {
    const amount = toAmount(spelled[1]);
    if (amount > 0 && amount < 1_000_000) return { amount, symbol: '£' };
  }
  const budgetWord = message.match(
    /\bbudget(?:\s+(?:of|is|around|about|max(?:imum)?))?\s*[:=]?\s*(?:£|€|\$)?\s?(\d[\d,]*)/i,
  );
  if (budgetWord) {
    const amount = toAmount(budgetWord[1]);
    if (amount > 0 && amount < 1_000_000) return { amount, symbol: '£' };
  }
  return null;
}

function trimBrief(message: string): string {
  const flat = message.replace(/\s+/g, ' ').trim();
  if (flat.length <= BRIEF_MAX) return flat;
  return flat.slice(0, BRIEF_MAX - 1).trimEnd() + '…';
}

function money(symbol: string, value: number): string {
  return `${symbol}${Math.round(value)}`;
}

const TIERS = [
  { name: 'Everyday pick', share: 0.4, note: 'lowest cost of the three' },
  { name: 'Balanced pick', share: 0.7, note: 'more quality headroom' },
  { name: 'Top-of-budget pick', share: 0.95, note: 'uses your full budget' },
] as const;

const TIERS_NO_BUDGET = [
  { name: 'Everyday pick', note: 'cheapest sensible match' },
  { name: 'Balanced pick', note: 'best price-to-fit ratio' },
  { name: 'Top pick', note: 'premium match if you stretch' },
] as const;

/**
 * Scripted, deterministic shopping reply: a brief in, three comparable
 * simulated options out, always with the approval line. Never claims live
 * pricing. Never performs a purchase. Stays under the 500-char history limit
 * so it can round-trip through /api/bow-chat.
 */
export function bowShoppingReply(message: string): string {
  const brief = trimBrief(message);
  const budget = parseBudget(message);

  const lines: string[] = [];
  lines.push('[simulated results - not live prices]');
  lines.push(
    budget
      ? `Brief: "${brief}" | Budget: ${money(budget.symbol, budget.amount)}`
      : `Brief: "${brief}" | Budget: not given`,
  );

  if (budget) {
    TIERS.forEach((tier, i) => {
      lines.push(
        `${i + 1}) ${tier.name} - ${money(budget.symbol, budget.amount * tier.share)} est. ` +
          `(simulated): ${tier.note}.`,
      );
    });
  } else {
    TIERS_NO_BUDGET.forEach((tier, i) => {
      lines.push(`${i + 1}) ${tier.name} - no price (simulated): ${tier.note}.`);
    });
  }

  lines.push('Compare the three and tell me which to shortlist. ' + SHOPPING_APPROVAL_LINE);
  const reply = lines.join('\n');
  if (reply.length > REPLY_BUDGET_CHARS) {
    // Never let a pathological brief break the history contract.
    return (
      '[simulated results - not live prices]\n' +
      'I can compare options for you - send a shorter brief with a budget. ' +
      SHOPPING_APPROVAL_LINE
    );
  }
  return reply;
}

/** True when the visitor is asking to approve / buy something. */
export function isApprovalRequest(message: string): boolean {
  return /\b(approve|approved|buy|purchase|order it|place the order|checkout|go ahead)\b/i.test(
    message,
  );
}

/**
 * Reply when the visitor appears to approve a simulated option. There is no
 * checkout anywhere in this demo, so this only ever confirms that nothing was
 * bought.
 */
export function bowShoppingApprovalReply(): string {
  return (
    'To be clear: this is a simulated demo, so no purchase was made. ' +
    SHOPPING_APPROVAL_LINE +
    ' If you want the real thing, continue from the pricing on the homepage.'
  );
}
