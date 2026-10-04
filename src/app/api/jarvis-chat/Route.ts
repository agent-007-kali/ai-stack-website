// src/app/api/jarvis-chat/route.ts
// Private chat bridge for /jarvis-bridge. The browser only talks to this route.
// This route talks to a PRIVATE GitHub issue using a fine-grained token kept in a Vercel env var.

export const dynamic = 'force-dynamic';

const REPO = 'agent-007-kali/jarvis-bridge';
const ISSUE = 2; // private thread: https://github.com/agent-007-kali/jarvis-bridge/issues/2
const MARK = '**Jorge:** ';
const PASSWORD = process.env.JARVIS_CHAT_PASSWORD || 'santiago';

const gh = (path: string, init?: RequestInit) =>
  fetch('https://api.github.com/repos/' + REPO + path, {
    ...init,
    cache: 'no-store',
    headers: {
      Authorization: 'Bearer ' + process.env.JARVIS_GITHUB_TOKEN,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
      'User-Agent': 'jarvis-bridge',
    },
  });

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

type Comment = { id: number; body: string; created_at: string };
const toMsg = (c: Comment) =>
  c.body.startsWith(MARK)
    ? { id: c.id, from: 'me', text: c.body.slice(MARK.length), ts: Date.parse(c.created_at) }
    : { id: c.id, from: 'jarvis', text: c.body, ts: Date.parse(c.created_at) };

async function authed(req: Request) {
  if (!process.env.JARVIS_GITHUB_TOKEN) return json({ error: 'not configured' }, 500);
  if (req.headers.get('x-chat-password') !== PASSWORD) {
    await new Promise((r) => setTimeout(r, 800)); // slow down guessing
    return json({ error: 'unauthorized' }, 401);
  }
  return null;
}

export async function GET(req: Request) {
  const bad = await authed(req);
  if (bad) return bad;
  const res = await gh('/issues/' + ISSUE + '/comments?per_page=100');
  if (!res.ok) return json({ error: 'upstream ' + res.status }, 502);
  const list = (await res.json()) as Comment[];
  return json({ messages: list.map(toMsg) });
}

export async function POST(req: Request) {
  const bad = await authed(req);
  if (bad) return bad;
  let text = '';
  try {
    text = String((await req.json()).text ?? '').trim();
  } catch {}
  if (!text) return json({ error: 'empty' }, 400);
  if (text.length > 2000) return json({ error: 'too long' }, 400);
  const res = await gh('/issues/' + ISSUE + '/comments', {
    method: 'POST',
    body: JSON.stringify({ body: MARK + text }),
  });
  if (!res.ok) return json({ error: 'upstream ' + res.status }, 502);
  return json({ message: toMsg((await res.json()) as Comment) });
}
