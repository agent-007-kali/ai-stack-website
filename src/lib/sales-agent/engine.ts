// Deterministic sales-agent engine for the /sales page.
//
// This module is pure: no network, no React, no environment access, no provider
// SDK. It exists so the HTTP route, the browser UI and the offline tests all
// agree on one documented input shape, one scripted knowledge answer source and
// one deterministic order flow.
//
// The order flow is a form-style state machine, NOT a model call. Orders are
// therefore captured identically whether or not a live provider is configured.
//
// Visitor text is UNTRUSTED chat input. Nothing here parses it as a command.
// There are no tools, no account access, no secret lookup and no agent
// execution. Claimed "admin"/"owner" messages are handled as ordinary text.

import type { OrderRequest } from '@/lib/leads/schema';
import {
  CONTACT_EMAIL,
  BOWBOT_CHECKOUT_URL,
  BOWBOT_TRIAL_URL,
  SESSION_LUMA_URL,
  DISCLOSURE,
  PAYMENT_NOTE,
  ORDER_PRODUCTS,
  findProduct,
  type OrderProduct,
  type OrderProductId,
} from './knowledge.ts';

export const SALES_AGENT_LIMITS = {
  /** Maximum characters in a single visitor message. */
  maxMessageChars: 500,
  /** Maximum characters in the client-provided session identifier. */
  maxSessionIdChars: 64,
  /** Maximum number of prior turns accepted in `history`. */
  maxTurns: 8,
  /** Maximum number of lines the demo terminal keeps on screen. */
  maxLines: 60,
  /** Maximum line length for a stored free-text field. */
  maxFieldChars: 1000,
} as const;

export type AgentWho = 'sys' | 'agent' | 'visitor';

export type AgentLine = { who: AgentWho; text: string };

export type ChatRole = 'user' | 'assistant';

export type ChatTurn = { role: ChatRole; content: string };

export type AgentInput = {
  message: string;
  sessionId?: string;
  history?: ChatTurn[];
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
  | { ok: true; value: AgentInput }
  | { ok: false; error: ValidationError };

const ALLOWED_FIELDS = new Set(['message', 'sessionId', 'history']);
const SESSION_RE = /^[A-Za-z0-9_-]+$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Validate the documented request shape. Mirrors the #54 chat contract. */
export function validateAgentInput(body: unknown): ValidationResult {
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
  if (message.length > SALES_AGENT_LIMITS.maxMessageChars) {
    return { ok: false, error: 'message-too-long' };
  }

  let sessionId: string | undefined;
  if ('sessionId' in o && o.sessionId !== undefined) {
    if (typeof o.sessionId !== 'string') return { ok: false, error: 'session-not-string' };
    const s = o.sessionId.trim();
    if (!s) return { ok: false, error: 'session-empty' };
    if (s.length > SALES_AGENT_LIMITS.maxSessionIdChars) {
      return { ok: false, error: 'session-too-long' };
    }
    if (!SESSION_RE.test(s)) return { ok: false, error: 'session-invalid' };
    sessionId = s;
  }

  let history: ChatTurn[] | undefined;
  if ('history' in o && o.history !== undefined) {
    if (!Array.isArray(o.history)) return { ok: false, error: 'history-not-array' };
    if (o.history.length > SALES_AGENT_LIMITS.maxTurns) {
      return { ok: false, error: 'history-too-long' };
    }
    const out: ChatTurn[] = [];
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
      if (!content || content.length > SALES_AGENT_LIMITS.maxMessageChars) {
        return { ok: false, error: 'history-content-invalid' };
      }
      out.push({ role: entry.role, content });
    }
    history = out;
  }

  const value: AgentInput = { message };
  if (sessionId !== undefined) value.sessionId = sessionId;
  if (history !== undefined) value.history = history;
  return { ok: true, value };
}

// ---------------------------------------------------------------------------
// Scripted knowledge answers
// ---------------------------------------------------------------------------

export type AnswerKey =
  | 'greet'
  | 'intro'
  | 'price'
  | 'bowbot'
  | 'bowbot-trial'
  | 'box'
  | 'os-care'
  | 'session-1to1'
  | 'group-class'
  | 'meetup'
  | 'payment'
  | 'delivery'
  | 'thanks'
  | 'forbidden'
  | 'fallback';

export interface KnowledgeAnswer {
  key: AnswerKey;
  lines: string[];
}

const FORBIDDEN_RE =
  /(ignore (?:all |your |the )?(?:previous |prior )?instructions|system prompt|developer mode|jailbreak|api[\s_-]?key|passphrase|process\.env|environment variable|\benv\b|run (?:this |the )?(?:command|script|code)|execute|shell|\bsudo\b|rm -rf|exfiltrat|i am the owner|i'?m the owner|as (?:the )?owner|admin(?:istrator)? (?:here|says)|give me (?:the |your )?(?:key|secret|token|password))/i;

export function bootLines(firstName?: string): AgentLine[] {
  const hi = firstName ? `Hi ${firstName}, I'm` : "Hi, I'm";
  return [
    { who: 'sys', text: '$ connecting to ai-solutions.company / sales ... ok' },
    { who: 'sys', text: `session opened - ${DISCLOSURE}` },
    {
      who: 'agent',
      text: `${hi} the Bow Sales Customer Advisor from the Bow Bot family. This chat is a scripted demo, not live, so I answer from our fixed product sheet and never guess.`,
    },
    {
      who: 'agent',
      text: "Ask about Bow Bot, the AI Solutions Box, 1:1 sessions or classes - or type 'order' to place an order.",
    },
  ];
}

/** Answer one question from the curated knowledge base. Pure + deterministic. */
export function answerFromKnowledge(text: string): KnowledgeAnswer {
  const q = text.trim();
  const t = q.toLowerCase();

  if (FORBIDDEN_RE.test(q)) {
    return {
      key: 'forbidden',
      lines: [
        'I cannot do that. This demo has no tools, account access, secrets or agent execution, and I treat everything typed here as untrusted chat input.',
      ],
    };
  }

  if (/^\s*(hi|hey|hello|good (morning|afternoon|evening))\b/.test(t)) {
    return {
      key: 'greet',
      lines: [
        "Hello. I'm the Bow Sales Customer Advisor from the Bow Bot family. Ask about Bow Bot, the AI Solutions Box, sessions or classes - or type 'order' to place an order.",
      ],
    };
  }

  if (/thank|thanks|cheers|ta\b/.test(t)) {
    return {
      key: 'thanks',
      lines: [
        'Any time. Anything else about Bow Bot, the AI Solutions Box, sessions or classes?',
      ],
    };
  }

  // Product-specific questions first, then general price.
  if (/bow\s?-?\s?bot|whats\s?app|whatsapp/.test(t)) {
    if (/trial|free|try/.test(t)) return bowbotTrialAnswer();
    return bowbotAnswer();
  }
  if (/os\s?care|care plan|maintenance|support plan/.test(t)) return osCareAnswer();
  if (/box\b|vega|altair|rigel|hardware|desktop|machine/.test(t)) return boxAnswer();
  if (/1\s?:\s?1|1\s?-?to-?1|one-to-one|one to one|session/.test(t)) return sessionAnswer();
  if (/group class|group call|class\b|course/.test(t)) return groupClassAnswer();
  if (/meetup|meet-up|meet up/.test(t)) return meetupAnswer();
  if (/trial|free trial/.test(t)) return bowbotTrialAnswer();

  if (/price|pricing|cost|how much|£|\bquote\b|budget|afford/.test(t)) {
    return priceAnswer();
  }
  if (/pay|payment|card|bank transfer|stripe|refund/.test(t)) return paymentAnswer();
  if (/deliver|delivery|shipping|lead time|how long|when will|build time/.test(t)) {
    return deliveryAnswer();
  }
  if (
    /^(what (do|can) you (do|offer|sell)|who are you|what is (ai solutions|this)|tell me about (you|ai solutions|the company)|how does (this|it) work|what is this|help\b|what are you)/.test(
      t,
    )
  ) {
    return introAnswer();
  }

  return {
    key: 'fallback',
    lines: [
      "I don't have that on our fixed product sheet, so I won't guess. I can log it as an enquiry for the team - type 'log enquiry' and I'll take a few details.",
    ],
  };
}

function introAnswer(): KnowledgeAnswer {
  return {
    key: 'intro',
    lines: [
      'We make your business agent-ready. The AI Solutions Box runs your AI on your own desktop, Bow Bot is your own assistant in the Bow Chat web app, and we run 1:1 sessions and classes to get you started.',
      "Ask about Bow Bot, the AI Solutions Box, sessions or classes - or type 'order' to place an order.",
    ],
  };
}

function priceAnswer(): KnowledgeAnswer {
  return {
    key: 'price',
    lines: [
      'Here are our fixed prices, exactly as on the site:',
      '• Bow Bot - £49 today (that is the £29 setup plus your first £20 month), then £20/month, cancel anytime. 3-day free trial, no card.',
      '• AI Solutions Box - Vega £2,995 / Altair (Pro) £3,995 / Rigel (Max) £7,995, custom-built to order with 3-week delivery. AI Solutions OS Care is £99/month.',
      '• 1:1 sessions - £49, or £99 for three.',
      '• Online group class £20; meetups £10.',
      "I don't invent prices or discounts. Anything outside this list, I'll check rather than guess.",
    ],
  };
}

function bowbotAnswer(): KnowledgeAnswer {
  return {
    key: 'bowbot',
    lines: [
      "Bow Bot is your own AI assistant, right here in the Bow Chat web app (Telegram is the fallback if you prefer it). Launch price is £49 today - that covers the £29 setup and your first £20 month - then £20/month, cancel anytime. It starts with a 3-day free trial that needs no card - the trial starts at " +
        BOWBOT_TRIAL_URL +
        '.',
      "It's an AI: it works best at one task at a time, it acts in your accounts only after you connect them, it never handles your money without your approval, and when it's unsure it says so.",
      'For Bow Bot, payment is by card on the existing Stripe checkout (crypto checkout opens soon) - I never take payment details in chat.',
    ],
  };
}

function bowbotTrialAnswer(): KnowledgeAnswer {
  return {
    key: 'bowbot-trial',
    lines: [
      'The Bow Bot 3-day free trial gives you one task at a time, up to 20 messages a day. Bookings and purchases stay switched off during the trial, and no card is needed.',
      'The trial starts at ' + BOWBOT_TRIAL_URL + '.',
    ],
  };
}

function boxAnswer(): KnowledgeAnswer {
  return {
    key: 'box',
    lines: [
      'The AI Solutions Box runs your AI on your own desktop, so your work stays local. It is custom-built to order with 3-week delivery.',
      '• Vega - £2,995 (entry, 24GB GPU)',
      '• Altair (Pro) - £3,995',
      '• Rigel (Max) - £7,995',
      'AI Solutions OS Care is £99/month for updates, monitoring and support. I can take a Box order here and the team will arrange payment by reply email.',
    ],
  };
}

function osCareAnswer(): KnowledgeAnswer {
  return {
    key: 'os-care',
    lines: [
      'AI Solutions OS Care is £99/month. It covers updates, monitoring and support for your AI Solutions Box.',
    ],
  };
}

function sessionAnswer(): KnowledgeAnswer {
  return {
    key: 'session-1to1',
    lines: [
      'The 1:1 sessions are online. A single session is £49, or three for £99.',
      'You book them on our Luma page: ' + SESSION_LUMA_URL + '.',
    ],
  };
}

function groupClassAnswer(): KnowledgeAnswer {
  return {
    key: 'group-class',
    lines: [
      'The online group class is £20. I can log your interest as an order/enquiry and the team will reply by email to arrange it.',
    ],
  };
}

function meetupAnswer(): KnowledgeAnswer {
  return {
    key: 'meetup',
    lines: [
      'Meetups are £10. I can log your interest as an order/enquiry and the team will reply by email to arrange it.',
    ],
  };
}

function paymentAnswer(): KnowledgeAnswer {
  return { key: 'payment', lines: [PAYMENT_NOTE] };
}

function deliveryAnswer(): KnowledgeAnswer {
  return {
    key: 'delivery',
    lines: [
      'AI Solutions Box machines are custom-built to order with 3-week delivery. I can\u2019t promise a faster date than that, and I won\u2019t invent one.',
    ],
  };
}

// ---------------------------------------------------------------------------
// Deterministic order flow
// ---------------------------------------------------------------------------

export type OrderStep =
  | 'product'
  | 'variant'
  | 'quantity'
  | 'name'
  | 'email'
  | 'businessType'
  | 'notes'
  | 'confirm';

export interface OrderDraft {
  product?: OrderProductId;
  variant?: string;
  variantLabel?: string;
  quantity?: number;
  name?: string;
  email?: string;
  businessType?: string;
  notes?: string;
}

export type ChatMode = 'chat' | 'order';

export interface ChatState {
  mode: ChatMode;
  step?: OrderStep;
  draft: OrderDraft;
  /** Free text the visitor asked that we could not answer, kept for enquiries. */
  pendingQuestion?: string;
}

export type AgentAction =
  | { kind: 'mailto'; href: string; label: string }
  | { kind: 'link'; href: string; label: string }
  | { kind: 'submit-order'; payload: OrderRequest }
  | null;

export interface AgentReply {
  lines: AgentLine[];
  state: ChatState;
  action: AgentAction;
}

export function initialChatState(): ChatState {
  return { mode: 'chat', draft: {} };
}

const ORDER_TRIGGER_RE = /^(order|buy|purchase|place an order|i want to (order|buy)|start an order)\b/i;
const ENQUIRY_TRIGGER_RE = /(log (an? )?enquir|enquir)/i;
const CANCEL_RE = /^(cancel|stop|never ?mind|forget it)\b/i;
const SKIP_RE = /^(skip|none|no thanks|-|—|n\/a)$/i;

function agent(text: string): AgentLine {
  return { who: 'agent', text };
}

export function mailtoBookingHref(subject = 'Enquiry - AI Solutions'): string {
  return `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}`;
}

export function orderMailtoHref(payload: OrderRequest, reference: string): string {
  const lines = [
    `Order reference: ${reference}`,
    `Product: ${payload.product}`,
    payload.variant ? `Variant: ${payload.variant}` : '',
    payload.quantity ? `Quantity: ${payload.quantity}` : '',
    `Name: ${payload.name}`,
    `Email: ${payload.email}`,
    payload.businessType ? `Business type: ${payload.businessType}` : '',
    payload.notes ? `Notes: ${payload.notes}` : '',
  ]
    .filter(Boolean)
    .join('\n');
  return `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(
    `AI Solutions order ${reference}`,
  )}&body=${encodeURIComponent(lines)}`;
}

/** Human-readable list of orderable products. */
export function productMenuLines(): string[] {
  return ORDER_PRODUCTS.map((p, i) => `${i + 1}. ${p.name}${p.prices.length ? ` - ${p.prices.join(' / ')}` : ''}`);
}

function matchProduct(text: string): OrderProduct | undefined {
  const t = text.trim().toLowerCase();
  const num = Number.parseInt(t, 10);
  if (Number.isInteger(num) && num >= 1 && num <= ORDER_PRODUCTS.length) {
    return ORDER_PRODUCTS[num - 1];
  }
  if (/bow/.test(t)) return findProduct('bowbot');
  if (/os\s?care|care/.test(t)) return findProduct('os-care');
  if (/box|vega|altair|rigel|hardware|desktop|machine/.test(t)) return findProduct('box');
  if (/1\s?:\s?1|1\s?-?to-?1|one-to-one|session/.test(t)) return findProduct('session-1to1');
  if (/group|class|course/.test(t)) return findProduct('group-class');
  if (/meet/.test(t)) return findProduct('meetup');
  return undefined;
}

function promptForProduct(product: OrderProduct): AgentLine[] {
  const lines = [
    product.variants.length
      ? `Which ${product.name}? ${product.variants.map((v, i) => `${i + 1}. ${v.label} - ${v.price}`).join('  ')}`
      : `Got it - ${product.name}.`,
  ];
  return lines.map(agent);
}

function nextStepAfterProduct(product: OrderProduct, draft: OrderDraft): { step: OrderStep; lines: AgentLine[] } {
  if (product.variants.length && !draft.variant) {
    return { step: 'variant', lines: promptForProduct(product) };
  }
  if (product.allowsQuantity && draft.quantity === undefined) {
    return { step: 'quantity', lines: [agent(`How many ${product.name}s would you like?`)] };
  }
  return { step: 'name', lines: [agent('Thanks. What name should I put on the order?')] };
}

function stepNumber(product: OrderProduct | undefined, step: OrderStep): string {
  if (!product || product.enquiry) {
    // enquiry: name, email, businessType, notes, confirm
    const enquiryOrder: OrderStep[] = ['name', 'email', 'businessType', 'notes', 'confirm'];
    const idx = enquiryOrder.indexOf(step);
    return `Step ${idx + 1} of ${enquiryOrder.length}`;
  }
  const steps: OrderStep[] = ['product'];
  if (product.variants.length) steps.push('variant');
  if (product.allowsQuantity) steps.push('quantity');
  steps.push('name', 'email', 'businessType', 'notes', 'confirm');
  const idx = steps.indexOf(step);
  return `Step ${idx + 1} of ${steps.length}`;
}

function summaryLines(product: OrderProduct, draft: OrderDraft): AgentLine[] {
  const lines = [
    'Please check your order:',
    `• Product: ${product.name}${draft.variantLabel ? ` - ${draft.variantLabel}` : ''}`,
  ];
  if (draft.quantity && draft.quantity > 1) lines.push(`• Quantity: ${draft.quantity}`);
  lines.push(`• Name: ${draft.name}`, `• Email: ${draft.email}`);
  if (draft.businessType) lines.push(`• Business type: ${draft.businessType}`);
  if (draft.notes) lines.push(`• Notes: ${draft.notes}`);
  lines.push("Type 'confirm' to log the order, or 'cancel'.");
  return lines.map(agent);
}

function errorLine(text: string): AgentReply {
  return { lines: [agent(text)], state: { mode: 'chat', draft: {} }, action: null };
}

function resetToChat(): ChatState {
  return { mode: 'chat', draft: {} };
}

/** Success copy + payment handoff once the server returns a reference. */
export function orderResult(payload: OrderRequest, reference: string): AgentReply {
  const lines: AgentLine[] = [
    agent(`Order logged. Your reference is ${reference}.`),
    agent(
      'I\u2019ve taken your name, email and order details. Payment is arranged separately - I never take card details in chat.',
    ),
  ];
  if (payload.product === 'bowbot') {
    lines.push(
      agent(
        `Bow Bot: pay by card on the existing Stripe checkout: ${BOWBOT_CHECKOUT_URL} (open in a new tab). Your trial/order details are in your logged reference.`,
      ),
    );
  } else {
    lines.push(
      agent(
        `We'll email you a secure payment link after confirming your order. Reference ${reference}.`,
      ),
    );
  }
  lines.push(
    agent(
      `You can also email us yourself with this reference: ${CONTACT_EMAIL}. I\u2019ve added a one-click email link below.`,
    ),
  );
  return {
    lines,
    state: resetToChat(),
    action: {
      kind: 'mailto',
      href: orderMailtoHref(payload, reference),
      label: `Email the team about ${reference}`,
    },
  };
}

export function orderFailure(reason: string): AgentReply {
  return {
    lines: [
      agent(
        `I couldn\u2019t log the order just now (${reason}). Nothing was lost - you can try again, or email us directly.`,
      ),
    ],
    state: { mode: 'chat', draft: {} },
    action: { kind: 'mailto', href: mailtoBookingHref(), label: 'Email the team' },
  };
}

export function beginOrder(question?: string): AgentReply {
  const draft: OrderDraft = question ? {} : {};
  const lines: AgentLine[] = [
    agent('Sure - let\u2019s log an order. What would you like to order?'),
    ...productMenuLines().map(agent),
  ];
  if (question) {
    lines.push(agent(`I\u2019ll pass on your question with the order: "${question.slice(0, 300)}"`));
  }
  return { lines, state: { mode: 'order', step: 'product', draft, pendingQuestion: question }, action: null };
}

export function beginEnquiry(question: string): AgentReply {
  const lines: AgentLine[] = [
    agent('Happy to log that as an enquiry for the team. I\u2019ll take a few details and pass your question on.'),
    agent('What name should I put on the enquiry?'),
  ];
  return {
    lines,
    state: { mode: 'order', step: 'name', draft: { product: 'enquiry' }, pendingQuestion: question },
    action: null,
  };
}

/**
 * Advance the deterministic order state machine by one visitor message.
 * Pure: the only side-effect is encoded in `action`.
 */
export function advanceOrder(state: ChatState, text: string): AgentReply {
  const raw = text.trim();
  const product = state.draft.product ? findProduct(state.draft.product) : undefined;
  const draft: OrderDraft = { ...state.draft };

  if (CANCEL_RE.test(raw)) {
    return {
      lines: [agent('Order cancelled - nothing was logged. Ask me about our products any time.')],
      state: resetToChat(),
      action: null,
    };
  }

  switch (state.step) {
    case 'product': {
      const chosen = matchProduct(raw);
      if (!chosen) {
        if (ENQUIRY_TRIGGER_RE.test(raw)) {
          return beginEnquiry(state.pendingQuestion ?? raw);
        }
        return {
          lines: [
            agent("I didn\u2019t catch that. Reply with a number, or the product name:"),
            ...productMenuLines().map(agent),
            agent("Or type 'cancel'."),
          ],
          state,
          action: null,
        };
      }
      draft.product = chosen.id;
      const next = nextStepAfterProduct(chosen, draft);
      const lines = [agent(stepNumber(chosen, next.step)), ...next.lines];
      return { lines, state: { ...state, step: next.step, draft }, action: null };
    }

    case 'variant': {
      if (!product) return errorLine('Something went wrong - let\u2019s start again. Type "order".');
      const t = raw.toLowerCase();
      const num = Number.parseInt(t, 10);
      let variant = product.variants.find((v) => v.id === t || v.label.toLowerCase() === t);
      if (!variant && Number.isInteger(num) && num >= 1 && num <= product.variants.length) {
        variant = product.variants[num - 1];
      }
      if (!variant) {
        variant = product.variants.find((v) => t.includes(v.id) || t.includes(v.label.toLowerCase()));
      }
      if (!variant) {
        return {
          lines: [
            agent('Please choose one:'),
            ...product.variants.map((v, i) => agent(`${i + 1}. ${v.label} - ${v.price}`)),
          ],
          state,
          action: null,
        };
      }
      draft.variant = variant.id;
      draft.variantLabel = `${variant.label} - ${variant.price}`;
      const after = nextStepAfterProduct(product, draft);
      return {
        lines: [agent(stepNumber(product, after.step)), ...after.lines],
        state: { ...state, step: after.step, draft },
        action: null,
      };
    }

    case 'quantity': {
      if (!product) return errorLine('Something went wrong - let\u2019s start again. Type "order".');
      const n = Number.parseInt(raw, 10);
      if (!Number.isInteger(n) || n < 1 || n > 99) {
        return {
          lines: [agent('Please give a whole number between 1 and 99.')],
          state,
          action: null,
        };
      }
      draft.quantity = n;
      return {
        lines: [agent(stepNumber(product, 'name')), agent('Thanks. What name should I put on the order?')],
        state: { ...state, step: 'name', draft },
        action: null,
      };
    }

    case 'name': {
      if (raw.length === 0 || raw.length > 120) {
        return { lines: [agent('Please give a name of up to 120 characters.')], state, action: null };
      }
      draft.name = raw;
      return {
        lines: [
          agent(stepNumber(product, 'email')),
          agent(`Thanks ${raw}. What email should the team reply to?`),
        ],
        state: { ...state, step: 'email', draft },
        action: null,
      };
    }

    case 'email': {
      if (!EMAIL_RE.test(raw) || raw.length > 200) {
        return {
          lines: [agent('That doesn\u2019t look like an email address. Please type it again.')],
          state,
          action: null,
        };
      }
      draft.email = raw;
      return {
        lines: [
          agent(stepNumber(product, 'businessType')),
          agent('What kind of business is this for? (or type "skip")'),
        ],
        state: { ...state, step: 'businessType', draft },
        action: null,
      };
    }

    case 'businessType': {
      draft.businessType = SKIP_RE.test(raw) ? undefined : raw.slice(0, SALES_AGENT_LIMITS.maxFieldChars);
      return {
        lines: [
          agent(stepNumber(product, 'notes')),
          agent('Any notes or details for the order? (or type "skip")'),
        ],
        state: { ...state, step: 'notes', draft },
        action: null,
      };
    }

    case 'notes': {
      if (state.pendingQuestion) {
        const extra = SKIP_RE.test(raw) ? '' : ` ${raw.slice(0, SALES_AGENT_LIMITS.maxFieldChars)}`;
        draft.notes = `${state.pendingQuestion}${extra}`.slice(0, SALES_AGENT_LIMITS.maxFieldChars).trim();
      } else {
        draft.notes = SKIP_RE.test(raw) ? undefined : raw.slice(0, SALES_AGENT_LIMITS.maxFieldChars);
      }
      if (!product) return errorLine('Something went wrong - let\u2019s start again. Type "order".');
      return {
        lines: [
          agent(stepNumber(product, 'confirm')),
          ...summaryLines(product, draft),
        ],
        state: { ...state, step: 'confirm', draft },
        action: null,
      };
    }

    case 'confirm': {
      if (/^(confirm|yes|y|ok|okay|place it|log it)\b/i.test(raw)) {
        if (!product || !draft.name || !draft.email) {
          return errorLine('Something is missing - let\u2019s start again. Type "order".');
        }
        const payload: OrderRequest = {
          kind: 'order',
          product: product.id,
          name: draft.name,
          email: draft.email,
        };
        if (draft.variant) payload.variant = draft.variant;
        if (draft.quantity !== undefined) payload.quantity = draft.quantity;
        if (draft.businessType) payload.businessType = draft.businessType;
        if (draft.notes) payload.notes = draft.notes;
        return {
          lines: [agent('Logging your order ...')],
          state,
          action: { kind: 'submit-order', payload },
        };
      }
      return {
        lines: [agent("Reply 'confirm' to log it, or 'cancel' to stop.")],
        state,
        action: null,
      };
    }

    default:
      return errorLine('Something went wrong - let\u2019s start again. Type "order".');
  }
}

/**
 * One visitor message -> one reply. Pure and deterministic.
 * Order capture and knowledge answers never touch the network.
 */
export function handleMessage(state: ChatState, text: string): AgentReply {
  if (state.mode === 'order') return advanceOrder(state, text);

  const q = text.trim();
  if (ORDER_TRIGGER_RE.test(q)) return beginOrder();
  if (ENQUIRY_TRIGGER_RE.test(q)) return beginEnquiry(state.pendingQuestion ?? q);

  const answer = answerFromKnowledge(q);
  if (answer.key === 'fallback') {
    return {
      lines: answer.lines.map(agent),
      state: { ...state, mode: 'chat', pendingQuestion: q },
      action: null,
    };
  }
  return {
    lines: answer.lines.map(agent),
    state: { ...state, mode: 'chat', pendingQuestion: undefined },
    action: null,
  };
}
