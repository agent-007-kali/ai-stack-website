'use client';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { BowAvatar } from './BowAvatar';
import { useRelay } from '@/lib/bow-relay/useRelay';
import {
  BOW_TRIAL_LIMITS,
  consumeTrial,
  evaluateTrial,
  localDayKey,
  parseTrialState,
  type BowTrialState,
  type BowTrialVerdict,
} from '@/lib/bow-chat/trial';
import {
  CHAT_MODE,
  SHOPPING_MODE,
  SHOPPING_MODE_INTRO,
  type BowChatMode,
} from '@/lib/bow-chat/shopping';
import './bow-chat.css';

export type BowMsg = {
  from: 'bowbot' | 'me' | 'boot';
  text: string;
};

const BOWBOT_BOOT: BowMsg[] = [
  { from: 'boot', text: '$ boot sequence initiated ...' },
  { from: 'boot', text: '$ loading bow bot personality matrix ... ok' },
  { from: 'boot', text: '$ session opened - scripted demo, not live' },
  { from: 'bowbot', text: 'Hello! I am Bow Bot. Welcome to your 3-day free trial experience.' },
  { from: 'bowbot', text: 'How can I help you get started today?' },
];

const FALLBACK_LABEL = 'scripted demo, not live';
const UPGRADE_HREF = '/';
const TRIAL_STORAGE_KEY = 'bow-chat-trial-v1';

function bowScriptReply(message: string): string {
  const q = message.toLowerCase();
  if (/trial|free trial|3 day|start|get started/.test(q)) {
    return 'Great! Your 3-day free trial gives you full access to explore Bow Bot. What would you like to try first?';
  }
  if (/help|how|feature/.test(q)) {
    return 'I can help you understand the features available in your trial. What specific thing are you curious about?';
  }
  if (/price|cost|billing|pay/.test(q)) {
    return 'During your free trial, everything is included. After the trial you can choose the plan that works best for you. Would you like to know more about the trial timeline?';
  }
  if (/thank/.test(q)) {
    return 'You are very welcome! Is there anything else I can help you with?';
  }
  return 'Good question. I am here to help with your 3-day free trial. Could you tell me a bit more about what you are looking to accomplish?';
}

function loadTrial(): BowTrialState | null {
  try {
    const raw = window.localStorage.getItem(TRIAL_STORAGE_KEY);
    if (!raw) return null;
    const parsed = parseTrialState(JSON.parse(raw) as unknown);
    return parsed.ok ? parsed.value : null;
  } catch {
    return null;
  }
}

function saveTrial(state: BowTrialState): void {
  try {
    window.localStorage.setItem(TRIAL_STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* private mode: the gate still runs, it just will not persist */
  }
}

type ChatTurn = { role: 'user' | 'assistant'; content: string };

export function BowChat() {
  const [msgs, setMsgs] = useState<BowMsg[]>([]);
  const [typing, setTyping] = useState(false);
  const [started, setStarted] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [draft, setDraft] = useState('');
  const [history, setHistory] = useState<ChatTurn[]>([]);
  const [chatMode, setChatMode] = useState<BowChatMode>(CHAT_MODE);
  const [trial, setTrial] = useState<BowTrialState | null>(null);
  const [sessionId] = useState(() => `bow-${Math.random().toString(36).slice(2, 12)}`);
  const end = React.useRef<HTMLDivElement>(null);

  const onAdvisor = useCallback((text: string) => {
    setTyping(false);
    setMsgs((x) => [...x, { from: 'bowbot', text }]);
    setHistory((h) => [...h, { role: 'assistant', content: text }]);
  }, []);

  const { status, mode: relayTier, send: relaySend } = useRelay(
    'try',
    sessionId,
    started,
    onAdvisor,
  );

  useEffect(() => {
    const el = end.current;
    if (el && el.parentElement) {
      el.parentElement.scrollTop = el.parentElement.scrollHeight;
    }
  }, [msgs, typing]);

  const verdict: BowTrialVerdict | null = useMemo(
    () => (trial ? evaluateTrial(trial) : null),
    [trial],
  );
  const blocked = verdict?.blocked ? verdict.reason : null;

  const start = () => {
    if (!name.trim() || !/^\S+@\S+\.\S+$/.test(email.trim())) return;
    const existing = loadTrial();
    const state = existing ?? { startedAt: Date.now(), day: localDayKey(), used: 0 };
    if (!existing) saveTrial(state);
    setTrial(state);
    setStarted(true);
    setMsgs(BOWBOT_BOOT.map((b) => ({ from: b.from, text: b.text })));
  };

  const enterShopping = () => {
    if (chatMode === SHOPPING_MODE) return;
    setChatMode(SHOPPING_MODE);
    setMsgs((x) => [...x, { from: 'bowbot', text: SHOPPING_MODE_INTRO }]);
    setHistory((h) => [...h, { role: 'assistant', content: SHOPPING_MODE_INTRO }]);
  };

  const enterChat = () => {
    if (chatMode === CHAT_MODE) return;
    setChatMode(CHAT_MODE);
    setMsgs((x) => [...x, { from: 'bowbot', text: 'Back in chat mode. What else can I help you with?' }]);
    setHistory((h) => [
      ...h,
      { role: 'assistant', content: 'Back in chat mode. What else can I help you with?' },
    ]);
  };

  const send = async () => {
    const t = draft.trim();
    if (!t || !trial || !verdict || verdict.blocked) return;
    setDraft('');
    setMsgs((x) => [...x, { from: 'me', text: t }]);
    setTyping(true);
    const nextHistory: ChatTurn[] = [...history, { role: 'user', content: t }];

    // Tier 1: live relay (instant Groq/holding line, or the polled advisor
    // thread). Shopping mode never goes live - it is always simulated, so it
    // skips straight to the route below. A live answer consumes one trial
    // message here; /api/bow-chat is not called on success.
    if (chatMode !== SHOPPING_MODE) {
      const live = await relaySend(t);
      if (live) {
        const after = consumeTrial(trial).state;
        saveTrial(after);
        setTrial(after);
        setHistory(nextHistory);
        // Stay busy: the typing dots clear when the advisor reply arrives.
        return;
      }
    }

    // Tier 2: the bow-chat route (shopping simulation, provider or labelled
    // scripted fallback). The route returns the updated trial state.
    try {
      const res = await fetch('/api/bow-chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          message: t,
          sessionId,
          history: history.slice(-8),
          mode: chatMode,
          trial,
        }),
      });
      const data = await res.json();

      const returned = parseTrialState(data?.trial as unknown);
      const after = returned.ok ? returned.value : consumeTrial(trial).state;
      saveTrial(after);
      setTrial(after);

      if (res.status === 403 && data?.blocked) {
        setTyping(false);
        return;
      }

      const reply =
        typeof data?.reply === 'string' && data.reply ? data.reply : bowScriptReply(t);
      const label =
        typeof data?.label === 'string' && data.label ? data.label : FALLBACK_LABEL;
      window.setTimeout(() => {
        setTyping(false);
        setMsgs((x) => [...x, { from: 'bowbot', text: `[${label}] ${reply}` }]);
        setHistory([...nextHistory, { role: 'assistant', content: reply }]);
      }, 800);
    } catch {
      const after = consumeTrial(trial).state;
      saveTrial(after);
      setTrial(after);
      window.setTimeout(() => {
        setTyping(false);
        const reply = bowScriptReply(t);
        setMsgs((x) => [...x, { from: 'bowbot', text: `[${FALLBACK_LABEL}] ${reply}` }]);
        setHistory([...nextHistory, { role: 'assistant', content: reply }]);
      }, 500);
    }
    // When live, the typing dots stay until an advisor reply arrives (polled).
  };

  const emailOk = /^\S+@\S+\.\S+$/.test(email);
  const remaining = verdict && !verdict.blocked ? verdict.remaining : 0;

  const statusText =
    chatMode === SHOPPING_MODE
      ? 'shopping mode - simulated, approval needed'
      : status === 'live'
        ? relayTier === 'relay'
          ? 'live - relaying to the owner'
          : 'live - instant AI reply'
        : status === 'unavailable'
          ? 'live unavailable - scripted demo'
          : FALLBACK_LABEL;

  return (
    <div className="chat bow-chat" role="log" aria-live="polite">
      <div className="chat-head">
        <BowAvatar />
        <div>
          <b>Bow Bot</b>
          <small>
            <span className="pulse" /> {statusText}
          </small>
        </div>
      </div>
      {started && (
        <>
          <div className="mode-toggle" role="group" aria-label="Chat mode">
            <button
              type="button"
              className={chatMode === CHAT_MODE ? 'on' : ''}
              aria-pressed={chatMode === CHAT_MODE}
              onClick={enterChat}
            >
              Chat
            </button>
            <button
              type="button"
              className={chatMode === SHOPPING_MODE ? 'on' : ''}
              aria-pressed={chatMode === SHOPPING_MODE}
              onClick={enterShopping}
            >
              Shopping
            </button>
          </div>
          <div className="trial-bar" aria-live="polite">
            <span className="trial-count" data-testid="trial-count">
              {remaining} / {BOW_TRIAL_LIMITS.dailyMessageLimit} messages left today
            </span>
            <span className="trial-day">
              {verdict ? `trial day ${verdict.dayIndex} of ${BOW_TRIAL_LIMITS.trialDays}` : ''}
            </span>
          </div>
        </>
      )}
      {!started ? (
        <form className="gate" onSubmit={(e) => { e.preventDefault(); start(); }}>
          <h3>Bow Chat - 3-day free trial</h3>
          <p>Before we start, tell Bow Bot who you are. No card needed.</p>
          <label htmlFor="trial-name">Your name</label>
          <input id="trial-name" name="name" required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            autoComplete="name"
            enterKeyHint="go"
          />
          <label htmlFor="trial-email">Email</label>
          <input id="trial-email" name="email" type="email" required pattern={"[^\\s@]+@[^\\s@]+\\.[^\\s@]+"} aria-describedby="trial-email-help"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            inputMode="email"
            autoComplete="email"
            enterKeyHint="go"
          />
          <p id="trial-email-help" role="status">{email && !emailOk ? 'Enter a valid email address, for example name@company.com.' : 'Your name and email are required to start this trial.'}</p>
          <button type="submit" className="cta full" disabled={!name.trim() || !emailOk}>
            Start chat
          </button>
          <p className="trial-terms">
            Free trial: {BOW_TRIAL_LIMITS.trialDays} days,{' '}
            {BOW_TRIAL_LIMITS.dailyMessageLimit} messages a day. No card needed.
          </p>
        </form>
      ) : (
        <>
          <div className="chat-body">
            {msgs.map((m, i) => (
              <div key={i} className={'row ' + m.from}>
                {m.from === 'bowbot' && <BowAvatar />}
                <div className="msg">{m.text}</div>
              </div>
            ))}
            {typing && (
              <div className="row bowbot">
                <BowAvatar />
                <div className="msg typing">
                  <i />
                  <i />
                  <i />
                </div>
              </div>
            )}
            <div ref={end} />
          </div>
          {blocked ? (
            <div className="trial-notice" role="status" data-testid="trial-notice">
              <b>
                {blocked === 'daily-limit'
                  ? `That's all ${BOW_TRIAL_LIMITS.dailyMessageLimit} messages for today`
                  : 'Your 3-day free trial has ended'}
              </b>
              <p>
                {blocked === 'daily-limit'
                  ? 'Your daily batch resets tomorrow. Want to keep going now? Pick a plan and carry on where you left off.'
                  : 'Thanks for trying Bow Bot. Your trial is over, but you can carry on with a plan from the homepage.'}
              </p>
              <Link className="cta full" href={UPGRADE_HREF}>
                See plans &amp; upgrade
              </Link>
              <small>
                {BOW_TRIAL_LIMITS.trialDays}-day trial, {BOW_TRIAL_LIMITS.dailyMessageLimit}{' '}
                messages a day. Pricing is on the homepage.
              </small>
            </div>
          ) : (
            <div className="composer">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') send();
                }}
                placeholder={
                  chatMode === SHOPPING_MODE
                    ? 'Brief + budget (e.g. headphones under £150)'
                    : 'Message Bow Bot'
                }
                enterKeyHint="send"
                aria-label="Your message for Bow Bot"
              />
              <button onClick={send} aria-label="Send">
                ↑
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
