'use client';
import React, { useEffect, useState } from 'react';
import { BowAvatar } from './BowAvatar';
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

type ChatTurn = { role: 'user' | 'assistant'; content: string };

export function BowChat() {
  const [msgs, setMsgs] = useState<BowMsg[]>([]);
  const [typing, setTyping] = useState(false);
  const [started, setStarted] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [draft, setDraft] = useState('');
  const [history, setHistory] = useState<ChatTurn[]>([]);
  const [sessionId] = useState(() => `bow-${Math.random().toString(36).slice(2, 10)}`);
  const end = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = end.current;
    if (el && el.parentElement) {
      el.parentElement.scrollTop = el.parentElement.scrollHeight;
    }
  }, [msgs, typing]);

  const start = () => {
    if (!name.trim() || !email.trim()) return;
    setStarted(true);
    setMsgs(BOWBOT_BOOT.map((b) => ({ from: b.from, text: b.text })));
  };

  const send = async () => {
    const t = draft.trim();
    if (!t) return;
    setDraft('');
    setMsgs((x) => [...x, { from: 'me', text: t }]);
    setTyping(true);
    const nextHistory: ChatTurn[] = [...history, { role: 'user', content: t }];
    try {
      const res = await fetch('/api/bow-chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ message: t, sessionId, history }),
      });
      const data = await res.json();
      const reply = typeof data?.reply === 'string' && data.reply ? data.reply : bowScriptReply(t);
      const label = typeof data?.label === 'string' && data.label ? data.label : FALLBACK_LABEL;
      window.setTimeout(() => {
        setTyping(false);
        setMsgs((x) => [...x, { from: 'bowbot', text: `[${label}] ${reply}` }]);
        setHistory([...nextHistory, { role: 'assistant', content: reply }]);
      }, 800);
    } catch {
      window.setTimeout(() => {
        setTyping(false);
        const reply = bowScriptReply(t);
        setMsgs((x) => [...x, { from: 'bowbot', text: `[${FALLBACK_LABEL}] ${reply}` }]);
        setHistory([...nextHistory, { role: 'assistant', content: reply }]);
      }, 800);
    }
  };

  const emailOk = /^\S+@\S+\.\S+$/.test(email);

  return (
    <div className="chat bow-chat" role="log" aria-live="polite">
      <div className="chat-head">
        <BowAvatar />
        <div>
          <b>Bow Bot</b>
          <small>
            <span className="pulse" /> {FALLBACK_LABEL}
          </small>
        </div>
      </div>
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
          <div className="composer">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') send();
              }}
              placeholder="Message Bow Bot"
              enterKeyHint="send"
              aria-label="Your message for Bow Bot"
            />
            <button onClick={send} aria-label="Send">
              ↑
            </button>
          </div>
        </>
      )}
    </div>
  );
}
