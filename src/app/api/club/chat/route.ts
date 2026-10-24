// POST/GET/DELETE /api/club/chat - the only door into the AI Money Club
// chat (issue #53). Session-authenticated (signed club cookie, record
// re-read per request so revokes take effect immediately).
//
//   GET  ?room=<id>&since=<iso>  read messages + safe roster + me
//   POST {action:'message', room, text}   post (1 msg / 3 s, screen + welcome flow)
//   POST {action:'name', name}            set display name once
//   POST {room, id} with DELETE           founder/admin moderation delete
//
// Responses carry display names only - never credential usernames, never
// repo/issue details.

import { NextRequest, NextResponse } from 'next/server';
import {
  ClubChatConfigError,
  ClubChatUpstreamError,
  claimRoomVisit,
  deleteMessage,
  getRoster,
  isClubRoom,
  postMessage,
  readRoom,
  rosterView,
  setDisplayName,
  touchPresence,
} from '@/lib/club-chat';
import {
  RULES_LINE,
  answerAskJarvis,
  addressedToJarvis,
  orientationText,
  roomWelcomeText,
  screenClubMessage,
} from '@/lib/club-host';
import { allowPost, checkAdminToken, sessionFromCookieHeader } from '@/lib/club-members';

export const dynamic = 'force-dynamic';

const MAX_TEXT = 1000;

const json = (data: unknown, status = 200) =>
  NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } });

function mapChatError(e: unknown): NextResponse {
  if (e instanceof ClubChatConfigError) {
    console.error('[club-chat] NOT CONFIGURED - set JARVIS_GITHUB_TOKEN before launch.');
    return json({ error: 'Chat not configured' }, 500);
  }
  if (e instanceof ClubChatUpstreamError) {
    return json({ error: 'Chat storage unavailable' }, 502);
  }
  console.error('[club-chat] unexpected', e);
  return json({ error: 'Chat unavailable' }, 500);
}

export async function GET(req: NextRequest) {
  const record = await sessionFromCookieHeader(req.headers.get('cookie'));
  if (!record) return json({ error: 'auth' }, 401);

  const room = req.nextUrl.searchParams.get('room');
  if (!isClubRoom(room)) return json({ error: 'unknown room' }, 400);
  const since = req.nextUrl.searchParams.get('since') || undefined;

  try {
    const entry = await touchPresence(record.username, record.tier);
    const needsName = entry.name === '';

    // First visits: post Jarvis's orientation / room welcome BEFORE reading,
    // so the member sees them immediately in the same response.
    if (!needsName) {
      const claim = await claimRoomVisit(record.username, room);
      if (claim.orientation) {
        await postMessage(room, 'ai', 'Jarvis', orientationText(entry.name));
      } else if (claim.roomWelcome) {
        await postMessage(room, 'ai', 'Jarvis', roomWelcomeText(room));
      }
    }

    const messages = await readRoom(room, since);
    const roster = rosterView(await getRoster());
    return json({
      room,
      rules: RULES_LINE,
      needsName,
      messages,
      roster,
      me: { name: entry.name, tier: record.tier, founder: record.tier === 'founder' },
    });
  } catch (e) {
    return mapChatError(e);
  }
}

export async function POST(req: NextRequest) {
  const record = await sessionFromCookieHeader(req.headers.get('cookie'));
  if (!record) return json({ error: 'auth' }, 401);

  let body: { action?: string; room?: unknown; text?: unknown; name?: unknown; id?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Bad request' }, 400);
  }

  try {
    // --- set display name (once, before anything is posted) ---
    if (body.action === 'name') {
      const entry = await touchPresence(record.username, record.tier);
      if (entry.name && record.tier !== 'founder') {
        return json({ error: 'Name already set' }, 409);
      }
      const set = await setDisplayName(record.username, record.tier, body.name);
      if (!set.ok) return json({ error: set.error }, 400);
      const claim = await claimRoomVisit(record.username, isClubRoom(body.room) ? body.room : 'ideas');
      if (claim.orientation) {
        await postMessage(
          isClubRoom(body.room) ? body.room : 'ideas',
          'ai',
          'Jarvis',
          orientationText(set.entry.name),
        );
      }
      const roster = rosterView(await getRoster());
      return json({
        ok: true,
        needsName: false,
        roster,
        me: { name: set.entry.name, tier: record.tier, founder: record.tier === 'founder' },
      });
    }

    // --- moderation delete: founder session or admin token ---
    if (!body.action || body.action === 'delete') {
      if (body.room === undefined && body.id === undefined) return json({ error: 'Bad request' }, 400);
      const founder = record.tier === 'founder';
      const admin = checkAdminToken(req.headers.get('x-admin-token'));
      if (!founder && !admin) return json({ error: 'forbidden' }, 403);
      if (!isClubRoom(body.room) || typeof body.id !== 'number') {
        return json({ error: 'Bad request' }, 400);
      }
      await deleteMessage(body.room, body.id);
      return json({ ok: true });
    }

    // --- post a message ---
    if (body.action !== 'message') return json({ error: 'Unknown action' }, 400);

    const room = body.room;
    if (!isClubRoom(room)) return json({ error: 'unknown room' }, 400);
    const text = typeof body.text === 'string' ? body.text.replace(/\r\n/g, '\n').trim() : '';
    if (!text) return json({ error: 'empty' }, 400);
    if (text.length > MAX_TEXT) return json({ error: `Messages are limited to ${MAX_TEXT} characters` }, 400);

    const entry = await touchPresence(record.username, record.tier);
    if (!entry.name) return json({ error: 'Pick a display name first', needsName: true }, 400);

    const limit = allowPost(record.username);
    if (!limit.ok) {
      return json({ error: 'Slow down', retryAfterMs: limit.retryAfterMs }, 429);
    }

    const screen = screenClubMessage(room, text);
    if (!screen.ok) {
      try {
        await postMessage(room, 'ai', 'Jarvis', `${entry.name}: ${screen.reason}`);
      } catch {
        // warn is best-effort; the rejection below still reaches the sender
      }
      return json({ error: screen.reason, rule: screen.rule }, 400);
    }

    const kind = record.tier === 'founder' ? 'founder' : 'member';
    const message = await postMessage(room, kind, entry.name, text);

    // Jarvis answers in #ask-jarvis (or when addressed by name anywhere).
    let replyMessage: unknown = null;
    if (room === 'ask-jarvis' || addressedToJarvis(text)) {
      const reply = await answerAskJarvis(text);
      if (reply) {
        try {
          replyMessage = await postMessage(room, 'ai', 'Jarvis', reply);
        } catch {
          replyMessage = null;
        }
      }
    }

    return json({ ok: true, message, replyMessage });
  } catch (e) {
    return mapChatError(e);
  }
}

export async function DELETE(req: NextRequest) {
  return POST(req);
}
