import { parseTrialState, type BowTrialState } from './trial.ts';
import { CHAT_MODE, SHOPPING_MODE, type BowChatMode } from './shopping.ts';

export const BOW_CHAT_LIMITS = {
  maxMessageChars: 500,
  maxSessionIdChars: 64,
  maxTurns: 8,
  maxLines: 40,
} as const;

export type BowChatRole = 'user' | 'assistant';

export type BowChatTurn = {
  role: BowChatRole;
  content: string;
};

export type BowChatInput = {
  message: string;
  sessionId?: string;
  history?: BowChatTurn[];
  mode?: BowChatMode;
  trial?: BowTrialState;
};

export type BowValidationError =
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
  | 'history-content-invalid'
  | 'mode-invalid'
  | 'trial-not-object'
  | 'trial-invalid';

export type BowValidationResult =
  | { ok: true; value: BowChatInput }
  | { ok: false; error: BowValidationError };

const ALLOWED_FIELDS = new Set(['message', 'sessionId', 'history', 'mode', 'trial']);
const SESSION_RE = /^[A-Za-z0-9_-]+$/;

export function validateBowChatInput(body: unknown): BowValidationResult {
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
  if (message.length > BOW_CHAT_LIMITS.maxMessageChars) {
    return { ok: false, error: 'message-too-long' };
  }

  let sessionId: string | undefined;
  if ('sessionId' in o && o.sessionId !== undefined) {
    if (typeof o.sessionId !== 'string') return { ok: false, error: 'session-not-string' };
    const s = o.sessionId.trim();
    if (!s) return { ok: false, error: 'session-empty' };
    if (s.length > BOW_CHAT_LIMITS.maxSessionIdChars) {
      return { ok: false, error: 'session-too-long' };
    }
    if (!SESSION_RE.test(s)) return { ok: false, error: 'session-invalid' };
    sessionId = s;
  }

  let history: BowChatTurn[] | undefined;
  if ('history' in o && o.history !== undefined) {
    if (!Array.isArray(o.history)) return { ok: false, error: 'history-not-array' };
    if (o.history.length > BOW_CHAT_LIMITS.maxTurns) {
      return { ok: false, error: 'history-too-long' };
    }
    const out: BowChatTurn[] = [];
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
      if (!content || content.length > BOW_CHAT_LIMITS.maxMessageChars) {
        return { ok: false, error: 'history-content-invalid' };
      }
      out.push({ role: entry.role, content });
    }
    history = out;
  }

  let mode: BowChatMode | undefined;
  if ('mode' in o && o.mode !== undefined) {
    if (o.mode !== CHAT_MODE && o.mode !== SHOPPING_MODE) {
      return { ok: false, error: 'mode-invalid' };
    }
    mode = o.mode;
  }

  let trial: BowTrialState | undefined;
  if ('trial' in o && o.trial !== undefined) {
    const parsed = parseTrialState(o.trial);
    if (!parsed.ok) return { ok: false, error: parsed.error };
    trial = parsed.value;
  }

  const value: BowChatInput = { message };
  if (sessionId !== undefined) value.sessionId = sessionId;
  if (history !== undefined) value.history = history;
  if (mode !== undefined) value.mode = mode;
  if (trial !== undefined) value.trial = trial;
  return { ok: true, value };
}

const SCRIPT_RESPONSES = [
  {
    test: /trial|free trial|3 day|start|get started/i,
    reply: 'Great! Your 3-day free trial gives you full access to explore Bow Bot. What would you like to try first?',
  },
  {
    test: /help|how|feature/i,
    reply: 'I can help you understand the features available in your trial. What specific thing are you curious about?',
  },
  {
    test: /price|cost|billing|pay/i,
    reply: 'During your free trial, everything is included. After the trial, you can choose the plan that works best for you. Would you like to know more about the trial timeline?',
  },
  {
    test: /thank/i,
    reply: 'You are very welcome! Is there anything else I can help you with?',
  },
];

export function bowScriptReply(message: string): string {
  const q = message.toLowerCase();
  for (const { test, reply } of SCRIPT_RESPONSES) {
    if (test.test(q)) return reply;
  }
  return 'Good question. I am here to help with your 3-day free trial. Could you tell me a bit more about what you are looking to accomplish?';
}
