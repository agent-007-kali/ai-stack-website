// 3-day free-trial gate for Bow Chat.
//
// STAGED PATTERN (mirrors the adapter's budget cap)
// ------------------------------------------------
// The trial state for this demo is tracked client-side (localStorage) and sent
// with every /api/bow-chat request, so it is honestly bypassable. Everything
// the HTTP route needs to make a gate decision lives in this module behind two
// pure functions — `evaluateTrial` and `consumeTrial` — so a real datastore
// (server sessions, DB rows) can replace the client-supplied state later
// without touching the route or the UI.

export const BOW_TRIAL_LIMITS = {
  /** Messages allowed per visitor per local calendar day. */
  dailyMessageLimit: 20,
  /** Length of the free trial window, in days. */
  trialDays: 3,
} as const;

/** Trial state as it travels with a request (client-supplied in this demo). */
export type BowTrialState = {
  /** Epoch ms when the visitor started the trial. */
  startedAt: number;
  /** Local calendar day of the last counted message: YYYY-MM-DD. */
  day: string;
  /** Messages already used on `day`. */
  used: number;
};

export type BowTrialBlockReason = 'daily-limit' | 'trial-expired';

/** Verdict for a trial state. */
export type BowTrialVerdict =
  | {
      blocked: false;
      reason: null;
      /** Messages the visitor may still send today. */
      remaining: number;
      /** Epoch ms when the trial window ends. */
      expiresAt: number;
      /** 1-based day of the trial window the visitor is currently in. */
      dayIndex: number;
    }
  | {
      blocked: true;
      reason: BowTrialBlockReason;
      remaining: 0;
      expiresAt: number;
      dayIndex: number;
    };

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 86_400_000;

export function localDayKey(from: Date = new Date()): string {
  const y = from.getFullYear();
  const m = String(from.getMonth() + 1).padStart(2, '0');
  const d = String(from.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function trialDurationMs(): number {
  return BOW_TRIAL_LIMITS.trialDays * DAY_MS;
}

/** Parse and sanitise the `trial` field of a /api/bow-chat request body. */
export function parseTrialState(
  raw: unknown,
  now: number = Date.now(),
): { ok: true; value: BowTrialState } | { ok: false; error: 'trial-not-object' | 'trial-invalid' } {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return { ok: false, error: 'trial-not-object' };
  }
  const o = raw as Record<string, unknown>;
  const { startedAt, day, used } = o;
  if (
    typeof startedAt !== 'number' ||
    !Number.isFinite(startedAt) ||
    startedAt < 0 ||
    startedAt > now + 60_000
  ) {
    return { ok: false, error: 'trial-invalid' };
  }
  if (typeof day !== 'string' || !DAY_RE.test(day)) {
    return { ok: false, error: 'trial-invalid' };
  }
  if (
    typeof used !== 'number' ||
    !Number.isInteger(used) ||
    used < 0 ||
    used > BOW_TRIAL_LIMITS.dailyMessageLimit
  ) {
    return { ok: false, error: 'trial-invalid' };
  }
  return { ok: true, value: { startedAt, day, used } };
}

function dayIndexOf(startedAt: number, now: number): number {
  const elapsed = now - startedAt;
  if (elapsed < 0) return 1;
  return Math.min(Math.floor(elapsed / DAY_MS) + 1, BOW_TRIAL_LIMITS.trialDays);
}

/**
 * Decide whether a visitor may send one more message. A rolled-over local day
 * resets the daily counter. Never throws.
 */
export function evaluateTrial(state: BowTrialState, now: number = Date.now()): BowTrialVerdict {
  const expiresAt = state.startedAt + trialDurationMs();
  const dayIndex = dayIndexOf(state.startedAt, now);

  if (now >= expiresAt) {
    return { blocked: true, reason: 'trial-expired', remaining: 0, expiresAt, dayIndex };
  }

  const usedToday = state.day === localDayKey(new Date(now)) ? state.used : 0;
  if (usedToday >= BOW_TRIAL_LIMITS.dailyMessageLimit) {
    return { blocked: true, reason: 'daily-limit', remaining: 0, expiresAt, dayIndex };
  }

  return {
    blocked: false,
    reason: null,
    remaining: BOW_TRIAL_LIMITS.dailyMessageLimit - usedToday,
    expiresAt,
    dayIndex,
  };
}

/**
 * Consume one message against a state that has already passed `evaluateTrial`.
 * Returns the state to persist plus the remaining-message count after this
 * send (0 when the daily cap has just been reached — the reply is still
 * delivered; the NEXT request is the one that gets blocked).
 */
export function consumeTrial(
  state: BowTrialState,
  now: number = Date.now(),
): { state: BowTrialState; remaining: number } {
  const before = evaluateTrial(state, now);
  if (before.blocked) return { state, remaining: 0 };
  const day = localDayKey(new Date(now));
  const usedToday = state.day === day ? state.used : 0;
  const next: BowTrialState = { startedAt: state.startedAt, day, used: usedToday + 1 };
  return { state: next, remaining: Math.max(0, before.remaining - 1) };
}

/** The state+meta the route returns to the client so it can persist it. */
export type BowTrialPayload = BowTrialState & {
  remaining: number;
  expiresAt: number;
  dayIndex: number;
};

export function trialPayload(
  state: BowTrialState,
  verdict: BowTrialVerdict,
): BowTrialPayload {
  return {
    startedAt: state.startedAt,
    day: state.day,
    used: state.used,
    remaining: verdict.remaining,
    expiresAt: verdict.expiresAt,
    dayIndex: verdict.dayIndex,
  };
}
