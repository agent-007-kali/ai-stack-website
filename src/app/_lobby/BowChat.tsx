'use client';
import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { BowAvatar } from './BowAvatar';
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
  const [mode, setMode] = useState<BowChatMode>(CHAT_MODE);
  const [trial, setTrial] = useState<BowTrialState | null>(null);
  const [sessionId] = useState(() => `bow-${Math.random().toString(36).slice(2, 10)}`);
  const end = React.useRef<HTMLDivElement>(null);

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
    if (!name.trim() || !email.trim()) return;
    const existing = loadTrial();
    const state = existing ?? { startedAt: Date.now(), day: localDayKey(), used: 0 };
    if (!existing) saveTrial(state);
    setTrial(state);
    setStarted(true);
    setMsgs(BOWBOT_BOOT.map((b) => ({ from: b.from, text: b.text })));
  };

  const enterShopping = () => {
    if (mode === SHOPPING_MODE) return;
    setMode(SHOPPING_MODE);
    setMsgs((x) => [...x, { from: 'bowbot', text: SHOPPING_MODE_INTRO }]);
    setHistory((h) => [...h, { role: 'assistant', content: SHOPPING_MODE_INTRO }]);
  };

  const enterChat = () => {
    if (mode === CHAT_MODE) return;
    setMode(CHAT_MODE);
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
    try {
      const res = await fetch('/api/bow-chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          message: t,
          sessionId,
          history: history.slice(-8),
          mode,
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
      }, 800);
    }
  };

  const emailOk = /^\S+@\S+\.\S+$/.test(email);
  const remaining = verdict && !verdict.blocked ? verdict.remaining : 0;

  return (
    <div className="chat bow-chat" role="log" aria-live="polite">
      <div className="chat-head">
        <BowAvatar />
        <div>
          <b>Bow Bot</b>
          <small>
            <span className="pulse" /> {mode === SHOPPING_MODE ? 'shopping mode' : FALLBACK_LABEL}
          </small>
        </div>
      </div>
      {started && (
        <>
          <div className="mode-toggle" role="group" aria-label="Chat mode">
            <button
              type="button"
              className={mode === CHAT_MODE ? 'on' : ''}
              aria-pressed={mode === CHAT_MODE}
              onClick={enterChat}
            >
              Chat
            </button>
            <button
              type="button"
              className={mode === SHOPPING_MODE ? 'on' : ''}
              aria-pressed={mode === SHOPPING_MODE}
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
        <div className="gate">
          <h3>Bow Chat - 3-day free trial</h3>
          <p>Before we start, tell Bow Bot who you are. No card needed.</p>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            autoComplete="name"
            enterKeyHint="go"
          />
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            inputMode="email"
            autoComplete="email"
            enterKeyHint="go"
            onKeyDown={(e) => {
              if (e.key === 'Enter') start();
            }}
          />
          <button className="cta full" disabled={!name.trim() || !emailOk} onClick={start}>
            Start chat
          </button>
          <p className="trial-terms">
            Free trial: {BOW_TRIAL_LIMITS.trialDays} days,{' '}
            {BOW_TRIAL_LIMITS.dailyMessageLimit} messages a day. No card needed.
          </p>
        </div>
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
                  mode === SHOPPING_MODE
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
