'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  bootLines,
  handleMessage,
  advanceOrder,
  orderResult,
  orderFailure,
  initialChatState,
  SALES_AGENT_LIMITS,
  type AgentAction,
  type AgentLine,
  type ChatState,
} from '@/lib/sales-agent/engine';
import {
  DISCLOSURE,
  PERSONA_LABEL,
  PERSONA_NAME,
  PERSONA_TITLE,
} from '@/lib/sales-agent/knowledge';
import type { OrderRequest } from '@/lib/leads/schema';
import { requestAgentReply } from '@/lib/sales-agent/adapter';

const MAX_LINES = SALES_AGENT_LIMITS.maxLines;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function pushBounded(current: AgentLine[], next: AgentLine[]): AgentLine[] {
  const merged = [...current, ...next];
  return merged.length > MAX_LINES ? merged.slice(merged.length - MAX_LINES) : merged;
}

function newSessionId(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch {
    /* fall through */
  }
  return 'session-' + Math.random().toString(36).slice(2, 12);
}

/** Render agent text, turning bare URLs into clickable links. */
function renderText(text: string): ReactNode[] {
  const parts = text.split(/(https?:\/\/[^\s)]+)/g);
  return parts.map((part, i) =>
    /^https?:\/\//.test(part) ? (
      <a key={i} className="sa-url" href={part} target="_blank" rel="noreferrer">
        {part}
      </a>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

export function SalesAgentChat() {
  const [stage, setStage] = useState<'details' | 'chat'>('details');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [detailError, setDetailError] = useState<string | null>(null);

  const [lines, setLines] = useState<AgentLine[]>([]);
  const [input, setInput] = useState('');
  const [chatState, setChatState] = useState<ChatState>(initialChatState);
  const [pendingAction, setPendingAction] = useState<AgentAction>(null);
  const [busy, setBusy] = useState(false);
  const [adapterNote, setAdapterNote] = useState<string | null>(null);

  const body = useRef<HTMLDivElement>(null);
  const sessionRef = useRef('');
  const busyRef = useRef(false);

  useEffect(() => {
    if (!sessionRef.current) sessionRef.current = newSessionId();
  }, []);

  useEffect(() => {
    const el = body.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines, busy]);

  function startChat(e: React.FormEvent) {
    e.preventDefault();
    const n = name.trim();
    const m = email.trim();
    if (!n) {
      setDetailError('Please add a name.');
      return;
    }
    if (!EMAIL_RE.test(m)) {
      setDetailError('Please add a valid email address.');
      return;
    }
    setDetailError(null);
    setStage('chat');
    setLines(pushBounded([], bootLines(n)));
  }

  async function submitOrder(payload: OrderRequest) {
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { ok?: boolean; reference?: string; error?: string };
      if (res.ok && data.ok && data.reference) {
        const reply = orderResult(payload, data.reference);
        setLines((l) => pushBounded(l, reply.lines));
        setPendingAction(reply.action);
      } else {
        const reply = orderFailure(data.error || 'request rejected');
        setLines((l) => pushBounded(l, reply.lines));
        setPendingAction(reply.action);
      }
    } catch {
      const reply = orderFailure('network error');
      setLines((l) => pushBounded(l, reply.lines));
      setPendingAction(reply.action);
    }
  }

  const currentStep = chatState.mode === 'order' ? chatState.step : undefined;

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || busyRef.current) return;

    busyRef.current = true;
    setBusy(true);
    setInput('');
    setAdapterNote(null);
    setLines((l) => pushBounded(l, [{ who: 'visitor', text }]));

    if (chatState.mode === 'order') {
      // Deterministic order flow - no network until the visitor confirms.
      const reply = advanceOrder(chatState, text);
      setChatState(reply.state);
      setLines((l) => pushBounded(l, reply.lines));
      if (reply.action?.kind === 'submit-order') {
        await submitOrder(reply.action.payload);
      } else {
        setPendingAction(reply.action);
      }
      busyRef.current = false;
      setBusy(false);
      return;
    }

    // Knowledge question: try the (inactive) route, then answer from the sheet.
    const history = lines
      .filter((l) => l.who !== 'sys')
      .map((l) => ({
        role: (l.who === 'visitor' ? 'user' : 'assistant') as 'user' | 'assistant',
        content: l.text,
      }))
      .slice(-SALES_AGENT_LIMITS.maxTurns);

    const adapter = await requestAgentReply({
      message: text,
      sessionId: sessionRef.current || undefined,
      history,
    });
    if (!adapter.ok) {
      setAdapterNote(`live agent unavailable (${adapter.reason}) - answering from the scripted sheet`);
    }

    const reply = handleMessage(chatState, text);
    setChatState(reply.state);
    setLines((l) => pushBounded(l, reply.lines));
    setPendingAction(reply.action);

    busyRef.current = false;
    setBusy(false);
  }

  function quickOrder() {
    setInput('');
    busyRef.current = true;
    setBusy(true);
    setLines((l) => pushBounded(l, [{ who: 'visitor', text: 'order' }]));
    const reply = handleMessage(chatState, 'order');
    setChatState(reply.state);
    setLines((l) => pushBounded(l, reply.lines));
    setPendingAction(null);
    busyRef.current = false;
    setBusy(false);
  }

  const placeholder =
    currentStep === 'product'
      ? 'type a number, or a product name...'
      : currentStep === 'confirm'
        ? "type 'confirm' to log the order..."
        : currentStep
          ? 'type your answer, or "cancel"...'
          : "ask about Bow Bot, the Box, sessions - or type 'order'...";

  return (
    <section className="sa" aria-label="Sales chat">
      <div className="sa-win">
        <div className="sa-head">
          <i style={{ background: '#ff5f56' }} />
          <i style={{ background: '#ffbd2e' }} />
          <i style={{ background: '#27c93f' }} />
          <img
            className="sa-orb"
            src="/bowbot/assets/orb-static-DETHUGoC.png"
            alt=""
            aria-hidden
          />
          <span className="sa-title">ai-solutions.company / sales</span>
          <span className="sa-badge">{DISCLOSURE}</span>
        </div>

        <div className="sa-body" ref={body} aria-live="polite">
          {stage === 'details' ? (
            <div className="sa-start">
              <img
                className="sa-start__orb"
                src="/bowbot/assets/orb-static-DETHUGoC.png"
                alt=""
                aria-hidden
              />
              <p className="sa-start__lead">
                Hi, I&apos;m {PERSONA_NAME} from the {PERSONA_TITLE}. Tell me your name and email
                and we&apos;ll start. I&apos;ll use them only to log anything you order or ask for.
              </p>
              <form className="sa-start__form" onSubmit={startChat} noValidate>
                <label className="sa-field">
                  <span>Your name</span>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="name"
                    placeholder="Alex Rivera"
                  />
                </label>
                <label className="sa-field">
                  <span>Email</span>
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    inputMode="email"
                    placeholder="alex@example.com"
                  />
                </label>
                {detailError && (
                  <p className="sa-error" role="alert">
                    {detailError}
                  </p>
                )}
                <button type="submit" className="sa-btn sa-btn--primary">
                  Start chat
                </button>
              </form>
              <p className="sa-hint">No password, no card. Just so the team can reply.</p>
            </div>
          ) : (
            lines.map((l, i) =>
              l.who === 'sys' ? (
                <div key={i} className="sa-msg sa-msg--sys">
                  {l.text}
                </div>
              ) : (
                <div key={i} className="sa-msg">
                  <span
                    className={
                      l.who === 'agent' ? 'sa-who sa-who--agent' : 'sa-who sa-who--visitor'
                    }
                  >
                    {l.who === 'visitor' ? `${name.trim().split(' ')[0] || 'visitor'}@web` : PERSONA_LABEL}
                  </span>
                  <span className="sa-prompt"> ~ $</span> {renderText(l.text)}
                </div>
              ),
            )
          )}
          {busy && <div className="sa-msg sa-msg--sys">{PERSONA_NAME.toLowerCase()} is working ...</div>}
        </div>

        {pendingAction && pendingAction.kind !== 'submit-order' && (
          <div className="sa-action">
            <a className="sa-btn sa-btn--ghost" href={pendingAction.href} target="_blank" rel="noreferrer">
              {pendingAction.label}
            </a>
          </div>
        )}

        {stage === 'chat' && (
          <form className="sa-in" onSubmit={send}>
            <label htmlFor="sa-input" className="sa-in__label">
              <span className="sa-who--visitor">{name.trim().split(' ')[0] || 'visitor'}@web</span>
              <span className="sa-prompt"> ~ $</span>
            </label>
            <input
              id="sa-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              maxLength={SALES_AGENT_LIMITS.maxMessageChars}
              placeholder={placeholder}
              autoComplete="off"
            />
            <button
              type="button"
              className="sa-btn sa-btn--small"
              onClick={quickOrder}
              disabled={busy || chatState.mode === 'order'}
            >
              Order
            </button>
            <button type="submit" className="sa-btn sa-btn--small sa-btn--primary" disabled={busy}>
              Send
            </button>
          </form>
        )}

        <div className="sa-foot">
          <span>
            {DISCLOSURE}. I never take card or payment details in chat.
          </span>
          {adapterNote && <span className="sa-foot__note"> {adapterNote}</span>}
        </div>
      </div>
    </section>
  );
}
