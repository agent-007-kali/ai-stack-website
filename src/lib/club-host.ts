// Jarvis host for the AI Money Club chat (issue #53, spec 19:31Z):
// welcome + orientation on first visit, the daily prompt in #ideas,
// price/payment escalation logging, and basic auto-moderation (clear
// credential leaks, misplaced referral links, spam).
//
// Jarvis always posts with the [ai] marker so the UI labels every message
// "AI - not a human". The host never invents prices, refunds or promises:
// those go to the deterministic holding line and into the escalation log.

import { clubStoreGet, clubStorePut } from './club-store.ts';
import { CLUB_ROOMS, postMessage, type ClubRoomId } from './club-chat.ts';

export const JARVIS_NAME = 'Jarvis';
export const RULES_LINE =
  'Rules: keep it useful, no spam or abuse, passcodes and passwords are auto-removed, referral links only in #referrals. Neo (the founder) can delete any message.';

const ORIENTATION_ROOMS = CLUB_ROOMS.map((r) => `#${r.title}`).join(' ');

export function orientationText(name: string): string {
  return `Welcome ${name} - Jarvis here, the AI host of this club (an AI, not a human). Rooms: ${ORIENTATION_ROOMS}. ${RULES_LINE} Stuck on anything? Ask in #help.`;
}

const ROOM_WELCOMES: Record<ClubRoomId, string> = {
  ideas: 'Daily build prompts land here. Reply with what you are actually working on.',
  help: 'Stuck? Describe the problem in one message - the room or I will try to help.',
  wins: 'Post wins, however small. One line is fine.',
  'jobs-gigs': 'Paid work worth sharing. No unpaid "exposure" posts.',
  'show-tell': 'Show what you shipped this week - link, screenshot or description.',
  'ask-jarvis': 'Ask me anything about building with AI or using this site. I am an AI, not a human, and I do not confirm prices, payments or refunds in chat - those go to Neo.',
  'collab-board': 'Looking for a collaborator? Say what you are building and what you need.',
  referrals: 'Referral links live here and only here. Say what the link is before posting it.',
};

export function roomWelcomeText(room: ClubRoomId): string {
  return ROOM_WELCOMES[room];
}

// ------------------------------------------------------------ moderation
// Auto-removal of clear rule breaks at post time. Everything else is the
// founder's delete button. Rule numbers match the pinned rules line.

export type ScreenResult = { ok: true } | { ok: false; rule: number; reason: string };

const CREDENTIAL_RE =
  /(passcode|password|passwd|pwd|api[_\s-]?key|secret)(?:\s+is)?\s*[:=#-]?\s*[A-Za-z0-9\-_]{6,}/i;
const REFERRAL_RE = /(whop\.com|bit\.ly|\/ref\/|[?&]ref=)/i;
const SPAM_RE = /(t\.me\/|telegram(\.me)?\/|airdrop|giveaway|casino|guaranteed\s+(profit|returns?)|\b100x\b|free money)/i;

export function screenClubMessage(room: ClubRoomId, text: string): ScreenResult {
  if (CREDENTIAL_RE.test(text)) {
    return { ok: false, rule: 1, reason: 'Never post passcodes or passwords in chat - that message was removed for your safety.' };
  }
  if (room !== 'referrals' && REFERRAL_RE.test(text)) {
    return { ok: false, rule: 2, reason: 'Referral links belong in #referrals only - that link was removed.' };
  }
  if (SPAM_RE.test(text)) {
    return { ok: false, rule: 3, reason: 'That looks like spam and was removed.' };
  }
  return { ok: true };
}

// ---------------------------------------------------------- daily prompt
const DAILY_PROMPTS: readonly string[] = [
  'Daily prompt: what is the one task you would hand to an AI agent today if you could?',
  'Daily prompt: show one thing you shipped this week - even if it is ugly.',
  'Daily prompt: what did you try in AI this month that did not work, and what did it teach you?',
  'Daily prompt: which of your weekly tasks is most repetitive? That is the first one to automate.',
  'Daily prompt: post the smallest useful automation you know - one paragraph, no code needed.',
  'Daily prompt: what is blocking you right now - skill, time, or idea? Say which.',
  'Daily prompt: name one business near you that is still doing something manually.',
  'Daily prompt: what did AI get wrong for you this week?',
  'Daily prompt: share one tool you actually paid for and why it was worth it.',
  'Daily prompt: if you had two free hours tonight, what would you build?',
  'Daily prompt: post a before/after of something AI helped you speed up.',
  'Daily prompt: what question do you wish someone in this club would answer?',
  'Daily prompt: reply to one other member today - the club works both ways.',
  'Daily prompt: what is your current weekly workflow, in three lines?',
];

const SCHEDULE_PATH = 'club-chat/schedule.json';

function utcDay(): string {
  return new Date().toISOString().slice(0, 10);
}

function pickDailyPrompt(day: string): string {
  let h = 0;
  for (let i = 0; i < day.length; i++) h = (h * 31 + day.charCodeAt(i)) % 997;
  return DAILY_PROMPTS[h % DAILY_PROMPTS.length];
}

/**
 * Post the daily prompt to #ideas at most once per UTC day (called by
 * /api/club/cron). Races across instances can double-post at worst; the
 * schedule write happens first, so the common case is exactly one.
 */
export async function postDailyPromptIfDue(nowDay = utcDay()): Promise<{ posted: boolean }> {
  let last = '';
  try {
    const text = await clubStoreGet(SCHEDULE_PATH);
    if (text !== null) {
      last = (JSON.parse(text) as { lastPromptDay?: string }).lastPromptDay ?? '';
    }
  } catch {
    // no schedule yet - treat as due
  }
  if (last === nowDay) return { posted: false };
  await clubStorePut(SCHEDULE_PATH, JSON.stringify({ lastPromptDay: nowDay }));
  await postMessage('ideas', 'ai', JARVIS_NAME, pickDailyPrompt(nowDay));
  return { posted: true };
}

// ----------------------------------------------------- #ask-jarvis answers
// Escalation patterns: a subset of src/lib/bow-relay/groq.ts, kept
// deterministic so nothing about money is ever improvised by the model.

const ESCALATION_PATTERNS: RegExp[] = [
  /\b(pricing|price|prices|cost|costs|how much|discount|discounts|refund|refunds|invoice|invoices|£)\b/i,
  /\b(payment|payments|pay|paid|stripe|billing|subscription|subscriptions|subscribe|cancel my)\b/i,
];

export const CLUB_HOLDING_LINE =
  "That's one for Neo - he will answer here or by email. Prices, payments and refunds are not confirmed in chat.";

export function isClubEscalation(text: string): boolean {
  return ESCALATION_PATTERNS.some((re) => re.test(text));
}

/** Durable escalation record (serverless-safe, unlike the var/ file used by bow). */
async function recordEscalation(question: string, reply: string): Promise<void> {
  const record = { to: 'tradersbooking@gmail.com', question, reply, createdAt: new Date().toISOString() };
  console.log(`[club-escalation] ${JSON.stringify(record)}`);
  try {
    await clubStorePut(`club-chat/escalations/${Date.now()}.json`, JSON.stringify(record));
  } catch {
    // The host log line above already carries the record.
  }
}

/**
 * Answer one #ask-jarvis question.
 * Escalation (price/payment/refund) -> holding line to Neo.
 * Everything else is handled by the backing-issue answer lane, so the host
 * posts no canned fallback and never calls an LLM.
 */
export async function answerAskJarvis(question: string): Promise<string | null> {
  if (isClubEscalation(question)) {
    await recordEscalation(question, CLUB_HOLDING_LINE);
    return CLUB_HOLDING_LINE;
  }
  return null;
}

/** True when a message in any room is addressed to the host. */
export function addressedToJarvis(text: string): boolean {
  return /\bjarvis\b/i.test(text);
}
