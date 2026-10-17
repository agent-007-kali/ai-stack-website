// Shared server-side helpers for the Bow live relay.
//
// Same pattern as src/app/api/jarvis-chat/route.ts: the browser only ever talks
// to /api/bow-relay. That route talks to a PRIVATE GitHub issue using a
// fine-grained token read from the JARVIS_GITHUB_TOKEN Vercel env var. The token
// is never logged, returned or exposed to the client, and no issue number or
// repo detail is returned in any response body.
//
// One issue per session: a thread titled `bow-<channel>-<sessionId>` is created
// on the visitor's first message, so sessions are fully isolated and a visitor
// never sees another customer's messages.

export const RELAY_REPO = 'agent-007-kali/jarvis-bridge';
export const RELAY_LABEL = 'bow-relay';

export const RELAY_CHANNELS = ['try', 'sales'] as const;
export type RelayChannel = (typeof RELAY_CHANNELS)[number];

export const RELAY_LIMITS = {
  maxMessageChars: 500,
  minIntervalMs: 3000,
  maxPerHour: 30,
} as const;

const VISITOR_MARK = '**Visitor:** ';

export type RelayMessage = {
  from: 'visitor' | 'advisor';
  text: string;
  ts: number;
};

type GhComment = { id: number; body: string; created_at: string };
type GhIssue = { number: number; title: string; pull_request?: unknown };

export class RelayConfigError extends Error {}
export class RelayUpstreamError extends Error {}

export function isRelayChannel(value: unknown): value is RelayChannel {
  return typeof value === 'string' && (RELAY_CHANNELS as readonly string[]).includes(value);
}

export function isRelaySessionId(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{6,64}$/.test(value);
}

export function relayTopic(channel: RelayChannel, sessionId: string): string {
  return `bow-${channel}-${sessionId}`;
}

async function gh(path: string, init?: RequestInit): Promise<Response> {
  const token = process.env.JARVIS_GITHUB_TOKEN;
  if (!token) throw new RelayConfigError('relay not configured');
  return fetch(`https://api.github.com/repos/${RELAY_REPO}${path}`, {
    ...init,
    cache: 'no-store',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
      'User-Agent': 'bow-live-relay',
    },
  });
}

async function listThreadIssues(): Promise<GhIssue[]> {
  const res = await gh(`/issues?state=all&labels=${RELAY_LABEL}&per_page=100`);
  if (!res.ok) throw new RelayUpstreamError('list failed');
  const list = (await res.json()) as GhIssue[];
  return list.filter((i) => !i.pull_request);
}

/** Find the session's private thread, creating it on the visitor's first message. */
export async function findOrCreateThread(
  channel: RelayChannel,
  sessionId: string,
): Promise<number> {
  const topic = relayTopic(channel, sessionId);
  const existing = (await listThreadIssues()).find((i) => i.title === topic);
  if (existing) return existing.number;

  const res = await gh('/issues', {
    method: 'POST',
    body: JSON.stringify({
      title: topic,
      body: `Private Bow relay thread. Channel: ${channel}. Session: ${sessionId}.`,
      labels: [RELAY_LABEL],
    }),
  });
  if (!res.ok) throw new RelayUpstreamError('create failed');
  return ((await res.json()) as GhIssue).number;
}

async function findThread(
  channel: RelayChannel,
  sessionId: string,
): Promise<number | null> {
  const topic = relayTopic(channel, sessionId);
  const existing = (await listThreadIssues()).find((i) => i.title === topic);
  return existing ? existing.number : null;
}

const toMessage = (c: GhComment): RelayMessage =>
  c.body.startsWith(VISITOR_MARK)
    ? { from: 'visitor', text: c.body.slice(VISITOR_MARK.length), ts: Date.parse(c.created_at) }
    : { from: 'advisor', text: c.body, ts: Date.parse(c.created_at) };

/** Post one visitor message to the session thread. */
export async function postVisitorMessage(
  channel: RelayChannel,
  sessionId: string,
  text: string,
): Promise<void> {
  const issue = await findOrCreateThread(channel, sessionId);
  const res = await gh(`/issues/${issue}/comments`, {
    method: 'POST',
    body: JSON.stringify({ body: VISITOR_MARK + text }),
  });
  if (!res.ok) throw new RelayUpstreamError('comment failed');
}

/** Read the session thread, if it exists yet. */
export async function readThread(
  channel: RelayChannel,
  sessionId: string,
): Promise<RelayMessage[]> {
  const issue = await findThread(channel, sessionId);
  if (issue == null) return [];
  const res = await gh(`/issues/${issue}/comments?per_page=100`);
  if (!res.ok) throw new RelayUpstreamError('comments failed');
  const list = (await res.json()) as GhComment[];
  return list.map(toMessage);
}

/** In-memory per-session rate limiter. Best-effort per serverless instance. */
type Bucket = { lastMs: number; windowStart: number; count: number };
const buckets = new Map<string, Bucket>();

export function checkRateLimit(key: string): { ok: true } | { ok: false; retryAfter: number } {
  const now = Date.now();
  const b = buckets.get(key);
  if (b) {
    if (now - b.lastMs < RELAY_LIMITS.minIntervalMs) {
      return { ok: false, retryAfter: RELAY_LIMITS.minIntervalMs - (now - b.lastMs) };
    }
    if (now - b.windowStart > 60 * 60 * 1000) {
      b.windowStart = now;
      b.count = 0;
    }
    if (b.count >= RELAY_LIMITS.maxPerHour) {
      return { ok: false, retryAfter: b.windowStart + 60 * 60 * 1000 - now };
    }
    b.lastMs = now;
    b.count += 1;
    return { ok: true };
  }
  buckets.set(key, { lastMs: now, windowStart: now, count: 1 });
  return { ok: true };
}
