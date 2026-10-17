// Shared contract + scripted reply engine for the preview sales chat.
//
// This module is deliberately pure: no network, no React, no environment
// access, no provider SDK. It exists so the HTTP route, the browser UI and the
// offline tests all agree on one documented input shape and one scripted reply
// source.
//
// Visitor text is UNTRUSTED chat input. Nothing here parses it as a command.
// There are no tools, no account access, no secret lookup and no agent
// execution. Claimed "admin"/"owner" messages are handled as ordinary text.

export const SALES_CHAT_LIMITS = {
  /** Maximum characters in a single visitor message. */
  maxMessageChars: 500,
  /** Maximum characters in the client-provided session identifier. */
  maxSessionIdChars: 64,
  /** Maximum number of prior turns accepted in `history`. */
  maxTurns: 8,
  /** Maximum number of lines the demo terminal keeps on screen. */
  maxLines: 40,
} as const;

export type SalesChatRole = 'user' | 'assistant';

export type SalesChatTurn = {
  role: SalesChatRole;
  content: string;
};

export type SalesChatInput = {
  message: string;
  sessionId?: string;
  history?: SalesChatTurn[];
};

export type ValidationError =
  | 'not-object'
  | 'unknown-field'
  | 'missing-message'
  | 'message-not-string'
  | 'message-empty'
  | 'message-too-long'
  | 'session-not-string'
  | 'session-empty'
  | 'session-too-long'
  | 'session-invalid'
  | 'history-not-array'
  | 'history-too-long'
  | 'history-entry-invalid'
  | 'history-role-invalid'
  | 'history-content-invalid';

export type ValidationResult =
  | { ok: true; value: SalesChatInput }
  | { ok: false; error: ValidationError };

const ALLOWED_FIELDS = new Set(['message', 'sessionId', 'history']);
const SESSION_RE = /^[A-Za-z0-9_-]+$/;

/**
 * Validate the documented request shape.
 *
 * - body must be a plain object with only `message`, `sessionId`, `history`
 * - `message` must be a non-empty string of at most 500 characters
 * - `sessionId`, if present, must be a bounded identifier (<= 64 chars)
 * - `history`, if present, is at most 8 turns of `{ role: 'user'|'assistant',
 *   content: string }`; `system` roles and any other role are rejected
 */
export function validateSalesChatInput(body: unknown): ValidationResult {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return { ok: false, error: 'not-object' };
  }
  const o = body as Record<string, unknown>;

  for (const key of Object.keys(o)) {
    if (!ALLOWED_FIELDS.has(key)) return { ok: false, error: 'unknown-field' };
  }

  if (!('message' in o)) return { ok: false, error: 'missing-message' };
  if (typeof o.message !== 'string') return { ok: false, error: 'message-not-string' };
  const message = o.message.trim();
  if (!message) return { ok: false, error: 'message-empty' };
  if (message.length > SALES_CHAT_LIMITS.maxMessageChars) {
    return { ok: false, error: 'message-too-long' };
  }

  let sessionId: string | undefined;
  if ('sessionId' in o && o.sessionId !== undefined) {
    if (typeof o.sessionId !== 'string') return { ok: false, error: 'session-not-string' };
    const s = o.sessionId.trim();
    if (!s) return { ok: false, error: 'session-empty' };
    if (s.length > SALES_CHAT_LIMITS.maxSessionIdChars) {
      return { ok: false, error: 'session-too-long' };
    }
    if (!SESSION_RE.test(s)) return { ok: false, error: 'session-invalid' };
    sessionId = s;
  }

  let history: SalesChatTurn[] | undefined;
  if ('history' in o && o.history !== undefined) {
    if (!Array.isArray(o.history)) return { ok: false, error: 'history-not-array' };
    if (o.history.length > SALES_CHAT_LIMITS.maxTurns) {
      return { ok: false, error: 'history-too-long' };
    }
    const out: SalesChatTurn[] = [];
    for (const raw of o.history) {
      if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
        return { ok: false, error: 'history-entry-invalid' };
      }
      const entry = raw as Record<string, unknown>;
      for (const key of Object.keys(entry)) {
        if (key !== 'role' && key !== 'content') {
          return { ok: false, error: 'history-entry-invalid' };
        }
      }
      if (entry.role !== 'user' && entry.role !== 'assistant') {
        return { ok: false, error: 'history-role-invalid' };
      }
      if (typeof entry.content !== 'string') {
        return { ok: false, error: 'history-content-invalid' };
      }
      const content = entry.content.trim();
      if (!content || content.length > SALES_CHAT_LIMITS.maxMessageChars) {
        return { ok: false, error: 'history-content-invalid' };
      }
      out.push({ role: entry.role, content });
    }
    history = out;
  }

  const value: SalesChatInput = { message };
  if (sessionId !== undefined) value.sessionId = sessionId;
  if (history !== undefined) value.history = history;
  return { ok: true, value };
}

// ---------------------------------------------------------------------------
// Scripted reply engine
// ---------------------------------------------------------------------------

export type Persona = 'sol' | 'jarvis';
export type LineWho = 'sys' | 'sol' | 'jarvis' | 'visitor';

export type TerminalLine = { who: LineWho; text: string };

export type ScriptAction = { kind: 'mailto'; href: string } | null;

export type ScriptResult = {
  lines: TerminalLine[];
  persona: Persona;
  action: ScriptAction;
};

/** Existing, user-initiated booking transport. Unchanged from the live demo. */
export const BOOK_MAILTO =
  'mailto:tradersbooking@gmail.com?subject=Free%20consultation%20-%20AI%20Solutions';

export const PERSONA_LABEL: Record<Persona, string> = {
  sol: 'sol@ai-solutions',
  jarvis: 'bow-sales@ai-solutions',
};

export const DISCLOSURE =
  'Demo desk - scripted replies, not live - Sol, AI receptionist / Bow Sales Customer Advisor';

/** Demo boot copy. Truthful: scripted, not live. */
export function bootLines(): TerminalLine[] {
  return [
    { who: 'sys', text: '$ connecting to ai-solutions.company ... ok' },
    { who: 'sys', text: 'session opened - demo desk - scripted replies, not live' },
    {
      who: 'sol',
      text: 'Hi, I am Sol, the AI receptionist. Ask me about AI Solutions and I will point you the right way, or type "consultant".',
    },
  ];
}

const CONSULTANT_RE =
  /(consultant|sales (?:rep|person|consultant|team|desk)|talk to (?:a )?(?:human|person|someone|consultant)|speak to (?:a )?(?:human|person|someone|consultant)|real person|representative|account manager)/i;

const FORBIDDEN_RE =
  /(ignore (?:all |your |the )?(?:previous |prior )?instructions|system prompt|developer mode|jailbreak|api[\s_-]?key|secret|passphrase|password|token|process\.env|environment variable|\benv\b|run (?:this |the )?(?:command|script|code)|execute|shell|\bsudo\b|rm -rf|curl\s+https?:\/\/|print (?:the )?(?:key|secret|token|password)|exfiltrat|i am the owner|i'?m the owner|owner (?:says|here)|as (?:the )?owner|admin(?:istrator)? (?:here|says)|give me (?:the )?(?:key|secret|token|password))/i;

const PRICE_RE = /(price|pricing|cost|how much|£|\bquote\b|budget|afford)/i;
const HARDWARE_RE = /(hardware|spec|specification|gpu|ram|memory|cpu|storage|machine|what.?s inside|runs? (?:it|the ai))/i;
const GENERAL_RE = /(what|who|about|help|do you|can you|how do|explain|tell me|why|where)/i;
const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;
const CALL_RE = /(\bcall me\b|\bphone me\b|\bring me\b|\btext me\b|\bwhatsapp me\b|request a call|book a call)/i;
const BOOK_RE = /^\s*book\b/i;

const P_SOL_INTRO =
  'We make your business agent-ready. AI Solutions builds local-first AI agents and the AI Solutions Box - a desktop that runs your AI on your own machine. I am Sol, the AI receptionist in this scripted demo. Ask about the Box range, or type "consultant" to talk to our Bow Sales Customer Advisor.';
const P_HARDWARE =
  'The AI Solutions Box runs your AI on the machine - your work stays local. Vega (£2,995) is the entry machine with a 24GB GPU. Altair (£3,995) steps up for more demanding work. Rigel (£7,995) is our top machine. All are custom-built to order with 3-week delivery.';
const P_PRICING =
  'Fixed prices: Vega £2,995, Altair £3,995, Rigel £7,995 - custom-built to order with 3-week delivery. AI Solutions OS Care is £99/month. Any other price needs a consultation; this scripted demo cannot book one or promise a slot.';
const P_EMAIL =
  'I do not send, store or forward anything in this demo. If you want to reach the team, type "book" to open an email from your own mail app.';
const P_CALL =
  'This scripted demo cannot call, contact or notify anyone. If you want to reach the team, type "book" to open an email from your own mail app.';
const P_FORBIDDEN =
  'I cannot do that. This demo has no tools, account access, secrets or agent execution, and I treat everything typed here as untrusted chat input.';
const P_FALLBACK =
  'I cannot answer that in this scripted demo. Ask about the AI Solutions Box range or pricing, or type "consultant" for our Bow Sales Customer Advisor.';
const ADVISOR_INTRO =
  "Hi, I'm the Bow Sales Customer Advisor. This is a scripted demo, not a live agent. Ask about the AI Solutions Box range or pricing.";
const CONSULTANT_SYS =
  '-- scripted handover: Sol, AI receptionist -> Bow Sales Customer Advisor. Scripted demo, not live. --';
const BOOKING_SYS = 'opening an email from your own mail app - this demo sends nothing';
const BOOKING_REPLY =
  'Opening an email to the team from your own mail app. Send it yourself to ask about a free consultation; this demo does not send a message or book a slot.';

/**
 * Produce the scripted reply for one visitor message.
 *
 * `persona` is the persona currently talking. A consultant request (or an
 * explicit `book`, which keeps the existing user-initiated mailto behaviour)
 * is the only thing that changes persona or opens anything.
 */
export function scriptReply(text: string, persona: Persona): ScriptResult {
  const q = text.trim();

  if (BOOK_RE.test(q)) {
    return {
      lines: [
        { who: 'sys', text: BOOKING_SYS },
        { who: persona, text: BOOKING_REPLY },
      ],
      persona,
      action: { kind: 'mailto', href: BOOK_MAILTO },
    };
  }

  if (FORBIDDEN_RE.test(q)) {
    return { lines: [{ who: persona, text: P_FORBIDDEN }], persona, action: null };
  }

  if (CONSULTANT_RE.test(q)) {
    return {
      lines: [
        { who: 'sys', text: CONSULTANT_SYS },
        { who: 'jarvis', text: ADVISOR_INTRO },
      ],
      persona: 'jarvis',
      action: null,
    };
  }

  const asksPrice = PRICE_RE.test(q);
  const asksHardware = HARDWARE_RE.test(q);
  if (asksPrice) {
    // Any price question returns the locked list plus an explicit deferral for
    // anything outside it. No number is ever invented.
    return { lines: [{ who: persona, text: P_PRICING }], persona, action: null };
  }
  if (asksHardware) {
    return { lines: [{ who: persona, text: P_HARDWARE }], persona, action: null };
  }

  if (EMAIL_RE.test(q)) {
    return { lines: [{ who: persona, text: P_EMAIL }], persona, action: null };
  }

  if (CALL_RE.test(q)) {
    return { lines: [{ who: persona, text: P_CALL }], persona, action: null };
  }

  if (GENERAL_RE.test(q)) {
    return { lines: [{ who: persona, text: P_SOL_INTRO }], persona, action: null };
  }

  return { lines: [{ who: persona, text: P_FALLBACK }], persona, action: null };
}
