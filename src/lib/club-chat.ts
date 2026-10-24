// AI Money Club chat: fixed rooms, identity markers, GitHub-issue storage
// and the safe presence roster (issue #53).
//
// Storage follows src/lib/bow-relay/relay.ts exactly: one PRIVATE GitHub
// issue per room (title `club-<room>`, label `club-chat`) in the private
// jarvis-bridge repo, discovered by label+title, messages as comments with a
// kind+name marker prefix. The browser only talks to /api/club/chat; no issue
// number, repo detail or username ever appears in a response body.
//
// The roster (display names, tiers, last-seen) lives in the PRIVATE Blob
// store, separate from the credential records in club-members.ts, and is the
// ONLY thing the sidebar ever shows: display names only, never usernames.

import { clubStoreGet, clubStorePut } from './club-store.ts';
import {
  CLUB_ROOMS,
  isClubRoom,
  type ClubMessage,
  type ClubRoom,
  type ClubRoomId,
  type ClubSenderKind,
} from './club-rooms.ts';

// Re-exported so route/host code keeps one import site; room shapes live in
// the dependency-free club-rooms.ts so the client bundle stays server-free.
export { CLUB_ROOMS, isClubRoom };
export type { ClubMessage, ClubRoom, ClubRoomId, ClubSenderKind };

export const CLUB_CHAT_REPO = 'agent-007-kali/jarvis-bridge';
export const CLUB_CHAT_LABEL = 'club-chat';

export class ClubChatConfigError extends Error {}
export class ClubChatUpstreamError extends Error {}

/** Display names: no `[ ] : *` and no newlines (they would break markers). */
export function sanitizeDisplayName(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const name = raw.replace(/\s+/g, ' ').trim();
  if (name.length < 1 || name.length > 24) return null;
  if (/[\[\]:*\n\r]/.test(name)) return null;
  return name;
}

const markerOf = (kind: ClubSenderKind, name: string) => `**[${kind}] ${name}:** `;
const MARKER_RE = /^\*\*\[(member|founder|ai)\] ([^:\]]{1,24}):\*\* /;

// Test-only override of the API base (house pattern: GROQ_API_BASE in
// bow-relay/groq.ts). Unset in production - the default is api.github.com.
const GH_BASE = (process.env.CLUB_CHAT_API_BASE || 'https://api.github.com').replace(/\/+$/, '');

const gh = (path: string, init?: RequestInit) =>
  fetch(`${GH_BASE}/repos/${CLUB_CHAT_REPO}${path}`, {
    ...init,
    cache: 'no-store',
    headers: {
      Authorization: 'Bearer ' + process.env.JARVIS_GITHUB_TOKEN,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
      'User-Agent': 'club-chat',
    },
  });

function requireToken(): void {
  if (!process.env.JARVIS_GITHUB_TOKEN) {
    throw new ClubChatConfigError('JARVIS_GITHUB_TOKEN not configured');
  }
}

type GhComment = { id: number; body: string; created_at: string };
type GhIssue = { number: number; title: string; pull_request?: unknown };

function toMessage(c: GhComment): ClubMessage | null {
  const m = MARKER_RE.exec(c.body);
  if (!m) return null; // stray comment (e.g. issue body notes) - never shown
  return {
    id: c.id,
    kind: m[1] as ClubSenderKind,
    name: m[2],
    text: c.body.slice(m[0].length),
    ts: Date.parse(c.created_at),
  };
}

async function listRoomIssues(): Promise<GhIssue[]> {
  const res = await gh(`/issues?state=all&labels=${CLUB_CHAT_LABEL}&per_page=100`);
  if (!res.ok) throw new ClubChatUpstreamError('list failed ' + res.status);
  const list = (await res.json()) as GhIssue[];
  return list.filter((i) => !i.pull_request);
}

async function findOrCreateRoom(room: ClubRoomId): Promise<number> {
  const topic = `club-${room}`;
  const existing = (await listRoomIssues()).find((i) => i.title === topic);
  if (existing) return existing.number;
  const res = await gh('/issues', {
    method: 'POST',
    body: JSON.stringify({
      title: topic,
      body: `AI Money Club room: #${room}. Created by the club chat API.`,
      labels: [CLUB_CHAT_LABEL],
    }),
  });
  if (!res.ok) throw new ClubChatUpstreamError('create failed ' + res.status);
  return ((await res.json()) as GhIssue).number;
}

async function findRoom(room: ClubRoomId): Promise<number | null> {
  const topic = `club-${room}`;
  const existing = (await listRoomIssues()).find((i) => i.title === topic);
  return existing ? existing.number : null;
}

/** Last messages of a room; optional `since` cursor (ISO) for polling. */
export async function readRoom(room: ClubRoomId, sinceIso?: string): Promise<ClubMessage[]> {
  requireToken();
  const issue = await findRoom(room);
  if (issue == null) return [];
  const since = sinceIso ? `&since=${encodeURIComponent(sinceIso)}` : '';
  const res = await gh(`/issues/${issue}/comments?per_page=100${since}`);
  if (!res.ok) throw new ClubChatUpstreamError('comments failed ' + res.status);
  let list = (await res.json()) as GhComment[];

  if (!sinceIso) {
    // First load: walk to the LAST page so old rooms show recent messages.
    const link = res.headers.get('link') || '';
    const last = /page=(\d+)>; rel="last"/.exec(link);
    if (last && Number(last[1]) > 1) {
      const lastRes = await gh(`/issues/${issue}/comments?per_page=100&page=${last[1]}`);
      if (lastRes.ok) list = (await lastRes.json()) as GhComment[];
    }
    list = list.slice(-100);
  }

  return list.map(toMessage).filter((m): m is ClubMessage => m !== null);
}

/** Post one message; the room issue is created lazily on first post. */
export async function postMessage(
  room: ClubRoomId,
  kind: ClubSenderKind,
  name: string,
  text: string,
): Promise<ClubMessage> {
  requireToken();
  const issue = await findOrCreateRoom(room);
  const res = await gh(`/issues/${issue}/comments`, {
    method: 'POST',
    body: JSON.stringify({ body: markerOf(kind, name) + text }),
  });
  if (!res.ok) throw new ClubChatUpstreamError('comment failed ' + res.status);
  const msg = toMessage((await res.json()) as GhComment);
  if (!msg) throw new ClubChatUpstreamError('unparseable comment');
  return msg;
}

/** Moderation delete (founder session or admin token). */
export async function deleteMessage(room: ClubRoomId, commentId: number): Promise<void> {
  requireToken();
  const issue = await findRoom(room);
  if (issue == null) throw new ClubChatUpstreamError('no room');
  const res = await gh(`/issues/${issue}/comments/${commentId}`, { method: 'DELETE' });
  if (!res.ok && res.status !== 404) throw new ClubChatUpstreamError('delete failed ' + res.status);
}

// --------------------------------------------------------------- roster
// Safe, public-by-design projection: display name + tier + presence only.
// Credential usernames stay as private Blob keys and are never returned here.

export type RosterEntry = {
  name: string;
  tier: 'paid' | 'founder';
  lastSeen: number;
  rooms: string[]; // rooms visited (first-visit welcome state)
  oriented: boolean; // orientation message already posted
};

export type RosterDoc = { users: Record<string, RosterEntry> };

const ROSTER_PATH = 'club-chat/roster.json';
const PRESENCE_WRITE_MIN_MS = 60 * 1000;
export const ONLINE_WINDOW_MS = 3 * 60 * 1000;

export async function getRoster(): Promise<RosterDoc> {
  try {
    // The roster is read-modify-written by every poll (claimRoomVisit), so a
    // CDN-cached read can return the pre-visit state and re-trigger a welcome.
    // Read straight from origin instead.
    const text = await clubStoreGet(ROSTER_PATH, { noCache: true });
    if (text === null) return { users: {} };
    const doc = JSON.parse(text) as RosterDoc;
    return doc && typeof doc.users === 'object' && doc.users ? doc : { users: {} };
  } catch {
    return { users: {} };
  }
}

async function saveRoster(doc: RosterDoc): Promise<void> {
  await clubStorePut(ROSTER_PATH, JSON.stringify(doc));
}

/**
 * Update presence for a logged-in member. Display name comes from the roster
 * (set once via the chat API); founder tier forces the display name 'Neo'.
 * Throttled: one Blob write per member per minute at most.
 */
export async function touchPresence(
  username: string,
  tier: 'paid' | 'founder',
  now = Date.now(),
): Promise<RosterEntry> {
  const doc = await getRoster();
  let entry = doc.users[username];
  if (!entry) {
    // Paid members start UNNAMED (empty = not shown anywhere yet); their
    // credential username must never appear in the roster. Founder = Neo.
    entry = { name: tier === 'founder' ? 'Neo' : '', tier, lastSeen: now, rooms: [], oriented: false };
    doc.users[username] = entry;
    await saveRoster(doc);
    return entry;
  }
  if (entry.tier !== tier) {
    entry.tier = tier;
    if (tier === 'founder') entry.name = 'Neo';
  }
  if (now - entry.lastSeen >= PRESENCE_WRITE_MIN_MS) {
    entry.lastSeen = now;
    await saveRoster(doc);
  }
  return entry;
}

/** Set (or correct) a member's display name. Founder is always 'Neo'. */
export async function setDisplayName(
  username: string,
  tier: 'paid' | 'founder',
  rawName: unknown,
): Promise<{ ok: true; entry: RosterEntry } | { ok: false; error: string }> {
  const name = tier === 'founder' ? 'Neo' : sanitizeDisplayName(rawName);
  if (!name) return { ok: false, error: 'Name must be 1-24 characters (no [ ] : * )' };
  const doc = await getRoster();
  const entry =
    doc.users[username] ||
    ({ name, tier, lastSeen: Date.now(), rooms: [], oriented: false } as RosterEntry);
  entry.name = name;
  entry.tier = tier;
  doc.users[username] = entry;
  await saveRoster(doc);
  return { ok: true, entry };
}

/**
 * Claim a room visit for the welcome flow. Returns which welcome (if any)
 * the route must post BEFORE answering the read, and marks the state first
 * so a racing poll cannot double-post.
 */
export async function claimRoomVisit(
  username: string,
  room: ClubRoomId,
): Promise<{ orientation: boolean; roomWelcome: boolean }> {
  const { clubStoreGetWithMeta, clubStorePut, BlobPreconditionFailedError } = await import('./club-store.ts');
  const ROSTER_PATH = 'club-chat/roster.json';
  const maxAttempts = 5;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const meta = await clubStoreGetWithMeta(ROSTER_PATH, { noCache: true });
    let doc: RosterDoc = { users: {} };
    if (meta && meta.text) {
      try {
        const parsed = JSON.parse(meta.text) as RosterDoc;
        if (parsed && typeof parsed.users === 'object' && parsed.users) {
          doc = parsed;
        }
      } catch {
        doc = { users: {} };
      }
    }
    const entry = doc.users[username];
    if (!entry) return { orientation: false, roomWelcome: false }; // presence not written yet - caller touches first
    const firstEver = !entry.oriented;
    const firstRoom = !entry.rooms.includes(room);
    if (!firstEver && !firstRoom) {
      return { orientation: false, roomWelcome: false };
    }
    const next: RosterDoc = JSON.parse(JSON.stringify(doc)) as RosterDoc;
    const nextEntry = next.users[username];
    if (!nextEntry) return { orientation: false, roomWelcome: false };
    if (firstEver) nextEntry.oriented = true;
    if (firstRoom && !nextEntry.rooms.includes(room)) nextEntry.rooms.push(room);
    try {
      await clubStorePut(ROSTER_PATH, JSON.stringify(next), meta && meta.etag ? { ifMatch: meta.etag } : {});
      return { orientation: firstEver, roomWelcome: !firstEver && firstRoom };
    } catch (e: any) {
      if (e instanceof BlobPreconditionFailedError || e?.name === 'BlobPreconditionFailedError') {
        continue; // retry on race
      }
      // Fallback to last-write-wins if conditional write not supported
      try {
        await clubStorePut(ROSTER_PATH, JSON.stringify(next));
        return { orientation: firstEver, roomWelcome: !firstEver && firstRoom };
      } catch {
        return { orientation: false, roomWelcome: false };
      }
    }
  }
  return { orientation: false, roomWelcome: false };
}

/** Safe sidebar projection: display names only, Jarvis pinned on top. */
export function rosterView(doc: RosterDoc, now = Date.now()) {
  const members = Object.values(doc.users)
    .filter((e) => e.name !== '') // unnamed members are invisible until they pick a name
    .map((e) => ({
    name: e.name,
    founder: e.tier === 'founder',
    online: now - e.lastSeen < ONLINE_WINDOW_MS,
  }));
  members.sort((a, b) => {
    if (a.online !== b.online) return a.online ? -1 : 1;
    if (a.founder !== b.founder) return a.founder ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
  return [{ name: 'Jarvis', founder: false, online: true, ai: true as const }, ...members.map((m) => ({ ...m, ai: false as const }))];
}
