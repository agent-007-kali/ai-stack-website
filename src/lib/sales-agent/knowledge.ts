// Curated, in-repo product knowledge for the /sales agent.
//
// RULE: this file may only contain facts the site already states. It is the
// single source of truth for the scripted sales agent. If a fact is not here,
// the agent says it will check and takes the question as an enquiry - it never
// guesses, invents a price, a discount, a stock level or a guarantee.
//
// Prices and links below are copied from the live site:
//   - Bow Bot pricing + 3-day trial + Stripe checkout: public/bowbot (homepage)
//   - AI Solutions Box tiers + OS Care: /box, /box-pro, /box-max
//   - 1:1 sessions / group class / meetups: booking + session copy on the site
// Do not alter these values without an owner decision.

export const CONTACT_EMAIL = 'tradersbooking@gmail.com';

/** Existing Bow Bot checkout link. Copied verbatim - do not modify. */
export const BOWBOT_CHECKOUT_URL =
  'https://buy.stripe.com/14A7sL90o1Qn6YVf3b4Rq00';

/** Where the free Bow Bot trial starts. */
export const BOWBOT_TRIAL_URL = '/try';

/** Existing Luma booking link used for the online 1:1 sessions. */
export const SESSION_LUMA_URL = 'https://luma.com/c47g3foa';

export const PERSONA_NAME = 'Bow Sales Customer Advisor';
export const PERSONA_TITLE = 'Bow Bot family';
export const PERSONA_LABEL = `bow-sales@ai-solutions`;

/**
 * Honest disclosure. The agent is a scripted demo until a live provider is
 * separately approved and configured, so every surface must say so.
 */
export const DISCLOSURE = 'scripted demo, not live';

export type OrderProductId =
  | 'bowbot'
  | 'box'
  | 'os-care'
  | 'session-1to1'
  | 'group-class'
  | 'meetup'
  | 'enquiry';

export interface ProductVariant {
  /** Stable id sent to the server. */
  id: string;
  /** Human label shown in chat. */
  label: string;
  /** Exact price string as stated on the site (empty for non-priced choices). */
  price: string;
}

export interface OrderProduct {
  id: OrderProductId;
  name: string;
  /** Exact prices, as stated on the site. Empty when the item is an enquiry. */
  prices: string[];
  variants: ProductVariant[];
  /** Whether more than one can be ordered. */
  allowsQuantity: boolean;
  /** A free-form enquiry rather than a catalogue product. */
  enquiry?: boolean;
}

/**
 * Products the order flow can capture. Every entry maps to something the site
 * already offers. `enquiry` is the catch-all for questions outside this file.
 */
export const ORDER_PRODUCTS: OrderProduct[] = [
  {
    id: 'bowbot',
    name: 'Bow Bot',
    prices: ['£49 today (£29 setup + first £20 month)', '£20/month'],
    variants: [],
    allowsQuantity: false,
  },
  {
    id: 'box',
    name: 'AI Solutions Box',
    prices: ['£2,995', '£3,995', '£7,995'],
    variants: [
      { id: 'vega', label: 'Vega', price: '£2,995' },
      { id: 'altair', label: 'Altair (Pro)', price: '£3,995' },
      { id: 'rigel', label: 'Rigel (Max)', price: '£7,995' },
    ],
    allowsQuantity: true,
  },
  {
    id: 'os-care',
    name: 'AI Solutions OS Care',
    prices: ['£99/month'],
    variants: [],
    allowsQuantity: false,
  },
  {
    id: 'session-1to1',
    name: '1:1 session (online)',
    prices: ['£49', '£99'],
    variants: [
      { id: 'single', label: 'Single session', price: '£49' },
      { id: 'three', label: 'Three sessions', price: '£99' },
    ],
    allowsQuantity: false,
  },
  {
    id: 'group-class',
    name: 'Online group class',
    prices: ['£20'],
    variants: [],
    allowsQuantity: true,
  },
  {
    id: 'meetup',
    name: 'Meetup',
    prices: ['£10'],
    variants: [],
    allowsQuantity: true,
  },
  {
    id: 'enquiry',
    name: 'General enquiry',
    prices: [],
    variants: [],
    allowsQuantity: false,
    enquiry: true,
  },
];

export function findProduct(id: string): OrderProduct | undefined {
  return ORDER_PRODUCTS.find((p) => p.id === id);
}

/** Payment handoff copy. The chat NEVER collects payment details. */
export const PAYMENT_NOTE =
  'I never take card or payment details in chat. ' +
  'Bow Bot: pay by card on the existing Stripe checkout, or in crypto when checkout opens. ' +
  "We'll email you a secure payment link after confirming your order.";
