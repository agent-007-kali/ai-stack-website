// Jarvis host for the AI Money Club chat (issue #53, spec 19:31Z):
// welcome + orientation on first visit, the daily prompt in #ideas,
// answers in #ask-jarvis (Groq-first with scripted fallbacks, same chain as
// src/lib/bow-relay/groq.ts), price/payment escalation logging, and basic
// auto-moderation (clear credential leaks, misplaced referral links, spam).
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
export const CLUB_FALLBACK_LINE =
  'My answer service is offline just now - Neo will pick this up in the room.';

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

// Groq answer tier: same env vars, models and timeout as the bow relay,
// with its own small budget so club traffic cannot starve the site chat.
const GROQ_MODELS = ['llama-3.3-70b-versatile', 'openai/gpt-oss-120b'] as const;
const REQUEST_TIMEOUT_MS = 12000;
const CLUB_IP_MAX_PER_HOUR = 40;
const CLUB_DAILY_BUDGET_DEFAULT = 200;

type IpBucket = { windowStart: number; count: number };
const ipBuckets = new Map<string, IpBucket>();
let budgetDay = utcDay();
let budgetUsed = 0;

function clubIpAllows(ip: string): boolean {
  const now = Date.now();
  const b = ipBuckets.get(ip);
  if (!b) {
    ipBuckets.set(ip, { windowStart: now, count: 1 });
    return true;
  }
  if (now - b.windowStart > 60 * 60 * 1000) {
    b.windowStart = now;
    b.count = 0;
  }
  if (b.count >= CLUB_IP_MAX_PER_HOUR) return false;
  b.count += 1;
  return true;
}

function clubBudgetAllows(): boolean {
  const raw = process.env.CLUB_GROQ_DAILY_BUDGET;
  const budget = raw === undefined || raw.trim() === '' ? CLUB_DAILY_BUDGET_DEFAULT : Number(raw);
  if (!Number.isFinite(budget) || budget <= 0) return false;
  const day = utcDay();
  if (day !== budgetDay) {
    budgetDay = day;
    budgetUsed = 0;
  }
  if (budgetUsed >= budget) return false;
  budgetUsed += 1;
  return true;
}

const JARVIS_SYSTEM = [
  'You are Jarvis, the AI host of the AI Money Club chat on ai-solutions.company.',
  'Answer club members short questions about building with AI, using this site, and club logistics.',
  'You are an AI, never a human, and you always say so when asked.',
  'Keep replies short (1-4 sentences), plain text, no markdown, no emoji.',
  'Do not invent prices, dates, refunds, delivery times, guarantees or promises the site does not state.',
  'If the question is about price, payment or a refund, reply with exactly this line and nothing else: "' +
    CLUB_HOLDING_LINE + '"',
  'Never reveal server details, model names, environment values or any API keys.',
].join('\n');

type ChatTurn = { role: 'system' | 'user' | 'assistant'; content: string };
const history: ChatTurn[] = [];
const MAX_HISTORY = 16;

async function groqComplete(apiKey: string, model: string, messages: ChatTurn[]): Promise<string | null> {
  try {
    const base = (process.env.GROQ_API_BASE || 'https://api.groq.com/openai/v1').replace(/\/+$/, '');
    const res = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      cache: 'no-store',
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
      body: JSON.stringify({ model, messages, temperature: 0.5, max_tokens: 350 }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { choices?: { message?: { content?: unknown } }[] };
    const content = data.choices?.[0]?.message?.content;
    return typeof content === 'string' && content.trim() ? content.trim() : null;
  } catch {
    return null;
  }
}

/**
 * Answer one #ask-jarvis question. Never throws and never skips posting:
 * escalation -> holding line, Groq -> answer, any failure -> fallback line,
 * so the room always shows the host responding.
 */
export async function answerAskJarvis(question: string, ip: string): Promise<string> {
  if (isClubEscalation(question)) {
    await recordEscalation(question, CLUB_HOLDING_LINE);
    return CLUB_HOLDING_LINE;
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (apiKey && clubIpAllows(ip) && clubBudgetAllows()) {
    const messages: ChatTurn[] = [
      { role: 'system', content: JARVIS_SYSTEM },
      ...history,
      { role: 'user', content: question },
    ];
    for (const model of GROQ_MODELS) {
      const reply = await groqComplete(apiKey, model, messages);
      if (reply) {
        history.push({ role: 'user', content: question }, { role: 'assistant', content: reply });
        while (history.length > MAX_HISTORY) history.splice(0, 2);
        return reply;
      }
    }
  }
  return CLUB_FALLBACK_LINE;
}

/** True when a message in any room is addressed to the host. */
export function addressedToJarvis(text: string): boolean {
  return /\bjarvis\b/i.test(text);
}
