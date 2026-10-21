// Fixed GBP -> USD display table (issue #37). Static, hard-coded, no FX API,
// no network: Cesar's instruction was "no spending". Stripe checkout stays
// GBP; we only SHOW the USD equivalent next to GBP prices ("£14 (~$18)").
// Extend here when a new price point needs USD.

const USD_TABLE: Record<number, string> = {
  9: '$12',
  12: '$15',
  14: '$18',
  25: '$32',
  35: '$44',
  75: '$95',
  300: '$380',
  1000: '$1,250',
};

/** USD label for a whole-pound GBP amount, or null when it is not in the table. */
export function usdFor(pounds: number): string | null {
  if (!Number.isInteger(pounds)) return null;
  return USD_TABLE[pounds] ?? null;
}

/**
 * Append the USD equivalent to every GBP amount in `text` that is in the
 * fixed table: "£14 (~$18)". Amounts outside the table (e.g. £750, £51)
 * are left untouched, so this is safe to spread over any price copy.
 * Matches "£75", "£75.00" (not "£750.00" past the table), not "GBP 75".
 * Idempotent: an amount already followed by " (~$" is not decorated again.
 */
export function withUsd(text: string): string {
  if (!text) return text;
  return text.replace(/£(\d{1,4})(?:\.\d{1,2})?(?!\d)/g, (match, digits, offset: number, whole: string) => {
    if (whole.startsWith(' (~$', offset + match.length)) return match;
    const usd = usdFor(parseInt(digits, 10));
    return usd ? `${match} (~${usd})` : match;
  });
}
