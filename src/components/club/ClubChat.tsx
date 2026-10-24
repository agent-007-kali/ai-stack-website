'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CLUB_ROOMS, type ClubBuddy, type ClubMessage, type ClubRoomId } from '@/lib/club-rooms';

// AI Money Club chat UI (issue #53). ICQ-retro skin (see chat.css),
// fixed 8 rooms, 2.5 s polling (no websockets on Vercel), buddy list with
// display names only, muted-by-default two-note chime, pinned rules line.

type Me = { name: string; tier: string; founder: boolean };
type ChatState = {
  room?: ClubRoomId;
  rules: string;
  needsName: boolean;
  messages: ClubMessage[];
  roster: ClubBuddy[];
  me: Me;
};

const POLL_MS = 2500;
const SEND_COOLDOWN_S = 3;
const MAX_TEXT = 1000;
const CLUB_HOLDING_LINE = "That's one for Neo - he will answer here or by email. Prices, payments and refunds are not confirmed in chat.";

function iso(ts: number): string {
  return new Date(ts).toISOString();
}

export default function ClubChat() {
  const router = useRouter();
  const [room, setRoom] = useState<ClubRoomId>('ideas');
  const [state, setState] = useState<ChatState | null>(null);
  const [connected, setConnected] = useState(false);
  const [input, setInput] = useState('');
  const [sendError, setSendError] = useState('');
  const [sending, setSending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [soundOn, setSoundOn] = useState(false);
  const [buddiesOpen, setBuddiesOpen] = useState(false);
  const [audioState, setAudioState] = useState<Record<number, { loading: boolean; error: string | null; played: boolean }>>({});
  const [nameDraft, setNameDraft] = useState('');
  const [nameError, setNameError] = useState('');
  const [settingName, setSettingName] = useState(false);

  const cursorRef = useRef<string>('');
  const seenRef = useRef<Set<number>>(new Set());
  const ownRef = useRef<Set<number>>(new Set());
  const loadedRef = useRef(false);
  const soundRef = useRef(false);
  const roomRef = useRef<ClubRoomId>('ideas');
  const logRef = useRef<HTMLDivElement | null>(null);
  const audioRef = useRef<AudioContext | null>(null);

  soundRef.current = soundOn;

  useEffect(() => {
    roomRef.current = room;
  }, [room]);

  // Chime is muted by default; remember the member's choice.
  useEffect(() => {
    try {
      if (localStorage.getItem('clubChatSound') === '1') setSoundOn(true);
    } catch {}
  }, []);

  const chime = useCallback(() => {
    if (!soundRef.current) return;
    try {
      const ctx = audioRef.current ?? new AudioContext();
      audioRef.current = ctx;
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, t);
      osc.frequency.setValueAtTime(1318, t + 0.09);
      gain.gain.setValueAtTime(0.05, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.3);
    } catch {
      // audio unavailable - chime is a nicety, never an error
    }
  }, []);

  const dieToLogin = useCallback(() => {
    router.push('/club/login');
  }, [router]);

  const merge = useCallback(
    (incoming: ClubMessage[], chimeNew: boolean) => {
      const fresh = incoming.filter((m) => !seenRef.current.has(m.id) && !ownRef.current.has(m.id));
      for (const m of incoming) seenRef.current.add(m.id);
      setState((prev) => {
        if (!prev) return prev;
        const byId = new Map(prev.messages.map((m) => [m.id, m]));
        for (const m of incoming) byId.set(m.id, m);
        const merged = [...byId.values()].sort((a, b) => a.ts - b.ts || a.id - b.id);
        return { ...prev, messages: merged };
      });
      if (chimeNew && fresh.length > 0) chime();
    },
    [chime],
  );

  // Full load for a room (on switch or after the name prompt).
  const loadRoom = useCallback(
    async (target: ClubRoomId) => {
      try {
        const res = await fetch(`/api/club/chat?room=${target}`, { cache: 'no-store' });
        if (res.status === 401) {
          dieToLogin();
          return;
        }
        const data = (await res.json().catch(() => null)) as ChatState | null;
        if (!res.ok || !data) {
          setConnected(false);
          return;
        }
        if (target !== roomRef.current) return; // a newer room switch won the race
        loadedRef.current = false;
        cursorRef.current = data.messages.length
          ? iso(data.messages[data.messages.length - 1].ts)
          : iso(Date.now());
        seenRef.current = new Set(data.messages.map((m) => m.id));
        setState(data);
        setConnected(true);
        loadedRef.current = true;
      } catch {
        setConnected(false);
      }
    },
    [dieToLogin],
  );

  useEffect(() => {
    void loadRoom(room);
  }, [room, loadRoom]);

  // Poll the active room.
  useEffect(() => {
    let stopped = false;
    const tick = async () => {
      try {
        const since = cursorRef.current ? `&since=${encodeURIComponent(cursorRef.current)}` : '';
        const res = await fetch(`/api/club/chat?room=${room}${since}`, { cache: 'no-store' });
        if (res.status === 401) {
          dieToLogin();
          return;
        }
        if (!res.ok) {
          setConnected(false);
          return;
        }
        const data = (await res.json()) as ChatState & { messages: ClubMessage[] };
        if (stopped) return;
        setConnected(true);
        if (data.messages.length) {
          cursorRef.current = iso(Math.max(...data.messages.map((m) => m.ts)));
        }
        setState((prev) =>
          prev ? { ...prev, roster: data.roster, rules: data.rules, needsName: data.needsName, me: data.me } : prev,
        );
        merge(data.messages, loadedRef.current);
      } catch {
        if (!stopped) setConnected(false);
      }
    };
    const id = setInterval(() => void tick(), POLL_MS);
    return () => {
      stopped = true;
      clearInterval(id);
    };
  }, [room, merge, dieToLogin]);

  // Cooldown countdown.
  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  // Keep the log pinned to the bottom when new messages arrive.
  useEffect(() => {
    const el = logRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [state?.messages.length, room]);

  async function send() {
    const text = input.trim();
    if (!text || sending || cooldown > 0) return;
    setSending(true);
    setSendError('');
    try {
      const res = await fetch('/api/club/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'message', room, text }),
      });
      if (res.status === 401) {
        dieToLogin();
        return;
      }
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        message?: ClubMessage;
        replyMessage?: ClubMessage | null;
        retryAfterMs?: number;
      };
      if (!res.ok || !data.ok || !data.message) {
        setSendError(data.error || 'Could not send');
        if (res.status === 429) {
          setCooldown(Math.max(1, Math.ceil((data.retryAfterMs ?? 3000) / 1000)));
        }
        return;
      }
      ownRef.current.add(data.message.id);
      const extra: ClubMessage[] = [data.message];
      if (data.replyMessage) extra.push(data.replyMessage);
      merge(extra, false);
      setInput('');
      setCooldown(SEND_COOLDOWN_S);
    } catch {
      setSendError('Could not reach the server');
    } finally {
      setSending(false);
    }
  }

  async function submitName(e: React.FormEvent) {
    e.preventDefault();
    if (settingName) return;
    setSettingName(true);
    setNameError('');
    try {
      const res = await fetch('/api/club/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'name', name: nameDraft, room }),
      });
      if (res.status === 401) {
        dieToLogin();
        return;
      }
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setNameError(data.error || 'Could not set name');
        return;
      }
      setNameDraft('');
      await loadRoom(room); // pulls the Jarvis orientation that name-set triggers
    } catch {
      setNameError('Could not reach the server');
    } finally {
      setSettingName(false);
    }
  }

  async function removeMessage(id: number) {
    try {
      const res = await fetch('/api/club/chat', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ room, id }),
      });
      if (res.ok) {
        setState((prev) =>
          prev ? { ...prev, messages: prev.messages.filter((m) => m.id !== id) } : prev,
        );
      }
    } catch {
      setSendError('Could not delete');
    }
  }

  async function leave() {
    try {
      await fetch('/api/club/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'logout' }),
      });
    } catch {
      // cookie clears either way on the redirect
    }
    router.push('/club/login');
  }

  const activeRoom = CLUB_ROOMS.find((r) => r.id === room) ?? CLUB_ROOMS[0];
  const onlineCount = (state?.roster ?? []).filter((b) => b.online).length;
  const needsName = !!state?.needsName;

  return (
    <div className={`clubchat${buddiesOpen ? ' is-buddiesopen' : ''}`}>
      <div className="clubchat__head">
        <span className="clubchat__dots" aria-hidden="true">
          <i /><i /><i />
        </span>
        <span className="clubchat__title">AI Money Club - Chat{state ? ` - ${state.me.name ? state.me.name : 'new member'}` : ''}</span>
        <span className="clubchat__headbtn">
          <button
            type="button"
            className={`clubchat__btn${soundOn ? ' clubchat__btn--on' : ''}`}
            onClick={() => {
              const next = !soundOn;
              setSoundOn(next);
              try {
                localStorage.setItem('clubChatSound', next ? '1' : '0');
              } catch {}
            }}
            aria-pressed={soundOn}
          >
            {soundOn ? 'Sound on' : 'Muted'}
          </button>
          <button
            type="button"
            className="clubchat__btn clubchat__buddiestoggle"
            onClick={() => setBuddiesOpen((v) => !v)}
          >
            Buddies {onlineCount}
          </button>
          <button type="button" className="clubchat__btn" onClick={() => void leave()}>
            Leave
          </button>
        </span>
      </div>

      <nav className="clubchat__rooms" aria-label="Rooms">
        <div className="clubchat__roomslabel">Rooms</div>
        {CLUB_ROOMS.map((r) => (
          <button
            key={r.id}
            type="button"
            className={`clubchat__room${r.id === room ? ' is-active' : ''}`}
            onClick={() => setRoom(r.id)}
          >
            <span className="clubchat__roomhash">#</span>
            {r.title}
          </button>
        ))}
      </nav>

      <main className="clubchat__main">
        <div className="clubchat__topic">
          <span className="clubchat__topicname">#{activeRoom.title}</span>
          <span className="clubchat__topicblurb">{activeRoom.blurb}</span>
        </div>

        <div className="clubchat__log" ref={logRef}>
          {!state ? (
            <div className="clubchat__empty">Connecting…</div>
          ) : state.messages.length === 0 ? (
            <div className="clubchat__empty">
              Nothing here yet. Say something - or wait for Jarvis&apos;s daily prompt.
            </div>
          ) : (
            state.messages.map((m) => {
              const isAiAnswer =
                m.kind === 'ai' &&
                m.text !== CLUB_HOLDING_LINE &&
                !(m.text.startsWith('Welcome to #') || m.text.startsWith('First time here')) &&
                !m.text.startsWith('Hi ') &&
                m.text.includes('Jarvis') === false ? // room intros/welcomes posted by site have no audio - but spec says "lane's answers start with "Jarvis:" after the [ai] marker"
                false : false;
              // Spec: "For messages with m.kind === 'ai' whose text is NOT the club holding line and is not a host room-intro post (the lane's answers start with "Jarvis:" after the [ai] marker; room intros and welcomes are posted by the site itself and have no audio)"
              const isJarvisAnswer = m.kind === 'ai' && m.text !== CLUB_HOLDING_LINE && !m.text.includes('First time here') && !m.text.startsWith('Welcome to');
              const canHear = isJarvisAnswer;
              const aState = audioState[m.id] || { loading: false, error: null, played: false };
              return (
                <div
                  key={m.id}
                  className={`clubchat__msg${state.me.name && m.name === state.me.name && m.kind !== 'ai' ? ' is-mine' : ''}`}
                >
                  {state.me.founder && m.kind !== 'ai' ? (
                    <button
                      type="button"
                      className="clubchat__del"
                      onClick={() => void removeMessage(m.id)}
                      aria-label="Delete message"
                    >
                      x
                    </button>
                  ) : null}
                  <span className={`clubchat__who clubchat__who--${m.kind}`}>
                    {m.name}
                    {m.kind === 'founder' ? <i className="clubchat__badge">Founder</i> : null}
                    {m.kind === 'ai' ? <i className="clubchat__badge clubchat__badge--ai">AI - not a human</i> : null}
                  </span>
                  <span className="clubchat__text">{m.text}</span>
                  {canHear ? (
                    <div className="clubchat__voice">
                      {!aState.played ? (
                        <button
                          type="button"
                          className="clubchat__hear"
                          disabled={aState.loading}
                          onClick={async () => {
                            setAudioState((s) => ({ ...s, [m.id]: { loading: true, error: null, played: false } }));
                            try {
                              const audio = new Audio(`/api/club/voice/${m.id}.mp3`);
                              audio.preload = 'none';
                              audio.oncanplaythrough = () => {
                                void audio.play().catch(() => {});
                              };
                              audio.onerror = () => {
                                setAudioState((s) => ({ ...s, [m.id]: { loading: false, error: "Voice is still being prepared - try again in a moment", played: false } }));
                              };
                              audio.onplay = () => {
                                setAudioState((s) => ({ ...s, [m.id]: { loading: false, error: null, played: true } }));
                              };
                              // trigger load
                              audio.load();
                            } catch {
                              setAudioState((s) => ({ ...s, [m.id]: { loading: false, error: "Voice is still being prepared - try again in a moment", played: false } }));
                            }
                          }}
                        >
                          {aState.loading ? 'Loading…' : 'Hear it'}
                        </button>
                      ) : null}
                      {aState.played ? (
                        <audio controls preload="none" src={`/api/club/voice/${m.id}.mp3`} autoPlay />
                      ) : null}
                      {aState.error ? (
                        <div className="clubchat__voiceerr">{aState.error}</div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              );
            })
          )}
        </div>

        <div className="clubchat__rules">{state?.rules ?? ''}</div>

        {sendError ? <div className="clubchat__error">{sendError}</div> : null}

        <div className="clubchat__compose">
          <input
            className="clubchat__input"
            value={input}
            maxLength={MAX_TEXT}
            placeholder={`Message #${activeRoom.title}`}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void send();
              }
            }}
            disabled={!state || needsName}
            aria-label={`Message #${activeRoom.title}`}
          />
          <span className="clubchat__sendnote">
            {input.length > 900 ? `${input.length}/${MAX_TEXT}` : cooldown > 0 ? `wait ${cooldown}s` : 'Enter to send'}
          </span>
          <button
            type="button"
            className="clubchat__send"
            onClick={() => void send()}
            disabled={!state || needsName || sending || cooldown > 0 || !input.trim()}
          >
            Send
          </button>
        </div>
      </main>

      <aside className="clubchat__buddies" aria-label="Buddy list">
        <div className="clubchat__buddieslabel">Buddies</div>
        {(state?.roster ?? []).map((b) => (
          <div key={b.name} className={`clubchat__buddy${b.online ? ' is-online' : ''}`}>
            <span className="clubchat__dot" aria-hidden="true" />
            <span className="clubchat__buddyname">{b.name}</span>
            {b.ai ? <span className="clubchat__buddybadge clubchat__buddybadge--ai">AI host</span> : null}
            {!b.ai && b.founder ? (
              <span className="clubchat__buddybadge clubchat__buddybadge--founder">Founder</span>
            ) : null}
          </div>
        ))}
        {(state?.roster ?? []).length <= 1 ? (
          <div className="clubchat__buddy">No members online yet.</div>
        ) : null}
      </aside>

      <div className="clubchat__status">
        <span>
          <b>{connected ? 'Connected' : 'Reconnecting…'}</b>
        </span>
        <span>
          <b>{onlineCount}</b> online
        </span>
        <span>1 message / 3 s</span>
        <span>{soundOn ? 'Chime on' : 'Muted'}</span>
      </div>

      {needsName ? (
        <div className="clubchat__overlay">
          <form className="clubchat__namebox" onSubmit={submitName}>
            <h2>Pick a display name</h2>
            <p>
              This is what the room sees. Your login username stays private. One choice - keep it
              friendly.
            </p>
            <input
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              maxLength={24}
              placeholder="e.g. SamMakes"
              autoFocus
              aria-label="Display name"
            />
            {nameError ? (
              <p style={{ color: 'var(--cc-danger)', marginTop: 8 }} role="alert">
                {nameError}
              </p>
            ) : null}
            <button type="submit" disabled={settingName || !nameDraft.trim()}>
              {settingName ? 'Setting…' : 'Enter the room'}
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
