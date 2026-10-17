// Order schema for POST /api/leads.
//
// This supersedes the stalled #46 preview lead shape. The /sales chat logs real
// product orders/enquiries here. Raw card or payment details are never part of
// this schema and are rejected as unknown fields.

import {
  ORDER_PRODUCTS,
  findProduct,
  type OrderProductId,
} from '../sales-agent/knowledge.ts';

export const MAX_FIELD_CHARS = 1000;
export const MAX_NAME_CHARS = 120;
export const MAX_EMAIL_CHARS = 200;

export interface OrderRequest {
  kind: 'order';
  product: OrderProductId;
  variant?: string;
  quantity?: number;
  name: string;
  email: string;
  businessType?: string;
  notes?: string;
}

export interface OrderRecord extends OrderRequest {
  reference: string;
  createdAt: string; // UTC ISO
}

export type OrderValidation =
  | { ok: true; value: OrderRequest }
  | { ok: false; error: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ALLOWED_FIELDS = new Set([
  'kind',
  'product',
  'variant',
  'quantity',
  'name',
  'email',
  'businessType',
  'notes',
]);

function validCardField(name: string): boolean {
  return /card|cardnumber|cvc|cvv|expiry|pan|iban|account/i.test(name);
}

export function validateOrderRequest(payload: unknown): OrderValidation {
  if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) {
    return { ok: false, error: 'invalid-body' };
  }
  const p = payload as Record<string, unknown>;

  for (const key of Object.keys(p)) {
    if (validCardField(key)) return { ok: false, error: 'payment-details-not-accepted' };
    if (!ALLOWED_FIELDS.has(key)) return { ok: false, error: 'unknown-field' };
  }

  if (p.kind !== 'order') return { ok: false, error: 'not-an-order' };

  if (typeof p.product !== 'string') return { ok: false, error: 'product-required' };
  const product = findProduct(p.product);
  if (!product) return { ok: false, error: 'unknown-product' };

  let variant: string | undefined;
  if (product.variants.length > 0) {
    if (typeof p.variant !== 'string' || !product.variants.some((v) => v.id === p.variant)) {
      return { ok: false, error: 'variant-required' };
    }
    variant = p.variant;
  } else if (p.variant !== undefined) {
    return { ok: false, error: 'unexpected-variant' };
  }

  let quantity: number | undefined;
  if (p.quantity !== undefined) {
    if (
      typeof p.quantity !== 'number' ||
      !Number.isInteger(p.quantity) ||
      p.quantity < 1 ||
      p.quantity > 99
    ) {
      return { ok: false, error: 'invalid-quantity' };
    }
    quantity = p.quantity;
  }

  if (typeof p.name !== 'string') return { ok: false, error: 'name-required' };
  const name = p.name.trim();
  if (!name || name.length > MAX_NAME_CHARS) return { ok: false, error: 'invalid-name' };

  if (typeof p.email !== 'string') return { ok: false, error: 'email-required' };
  const email = p.email.trim();
  if (!EMAIL_RE.test(email) || email.length > MAX_EMAIL_CHARS) {
    return { ok: false, error: 'invalid-email' };
  }

  let businessType: string | undefined;
  if (p.businessType !== undefined) {
    if (typeof p.businessType !== 'string') return { ok: false, error: 'invalid-business-type' };
    const bt = p.businessType.trim().slice(0, MAX_FIELD_CHARS);
    if (bt) businessType = bt;
  }

  let notes: string | undefined;
  if (p.notes !== undefined) {
    if (typeof p.notes !== 'string') return { ok: false, error: 'invalid-notes' };
    const n = p.notes.trim().slice(0, MAX_FIELD_CHARS);
    if (n) notes = n;
  }

  const value: OrderRequest = { kind: 'order', product: product.id, name, email };
  if (variant !== undefined) value.variant = variant;
  if (quantity !== undefined) value.quantity = quantity;
  if (businessType !== undefined) value.businessType = businessType;
  if (notes !== undefined) value.notes = notes;
  return { ok: true, value };
}

/** Export the catalogue ids for tests / callers. */
export function knownProductIds(): OrderProductId[] {
  return ORDER_PRODUCTS.map((p) => p.id);
}
