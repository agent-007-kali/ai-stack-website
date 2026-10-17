// Tests for the order schema and server-side order storage used by POST /api/leads.
// Run: npm run test:leads. No Next server needed.

import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { after, before, describe, it } from 'node:test';

import {
  MAX_FIELD_CHARS,
  MAX_NAME_CHARS,
  knownProductIds,
  validateOrderRequest,
} from './schema.ts';
import { findProduct } from '../sales-agent/knowledge.ts';
import { generateReference, storeOrder, toOrderRecord } from './storage.ts';

const validBox = () => ({
  kind: 'order',
  product: 'box',
  variant: 'vega',
  name: 'Priya Nair',
  email: 'priya@example.com',
});

describe('validateOrderRequest', () => {
  it('accepts a Bow Bot order', () => {
    const r = validateOrderRequest({
      kind: 'order',
      product: 'bowbot',
      name: 'Ada',
      email: 'ada@example.com',
    });
    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.value.product, 'bowbot');
  });

  it('requires a variant for the AI Solutions Box and keeps it', () => {
    const missing = validateOrderRequest({ ...validBox(), variant: undefined });
    assert.deepEqual(missing, { ok: false, error: 'variant-required' });

    const ok = validateOrderRequest({ ...validBox(), variant: 'rigel' });
    assert.equal(ok.ok, true);
    if (ok.ok) assert.equal(ok.value.variant, 'rigel');
  });

  it('accepts every catalogue product id', () => {
    for (const id of knownProductIds()) {
      const product = findProduct(id);
      const base: Record<string, unknown> = {
        kind: 'order',
        product: id,
        name: 'Ada',
        email: 'ada@example.com',
      };
      if (product && product.variants.length > 0) base.variant = product.variants[0].id;
      const r = validateOrderRequest(base);
      assert.equal(r.ok, true, `expected ${id} to validate`);
    }
  });

  it('rejects card and payment fields outright', () => {
    for (const field of ['cardNumber', 'card', 'cvc', 'expiry', 'pan', 'iban', 'accountNumber']) {
      const r = validateOrderRequest({ ...validBox(), [field]: 'anything' });
      assert.deepEqual(r, { ok: false, error: 'payment-details-not-accepted' }, field);
    }
  });

  it('rejects unknown fields, bad email, bad quantity, non-order kinds', () => {
    assert.deepEqual(validateOrderRequest({ ...validBox(), coupon: 'SAVE' }), {
      ok: false,
      error: 'unknown-field',
    });
    assert.deepEqual(validateOrderRequest({ ...validBox(), product: 'nova' }), {
      ok: false,
      error: 'unknown-product',
    });
    assert.deepEqual(validateOrderRequest({ ...validBox(), kind: 'lead' }), {
      ok: false,
      error: 'not-an-order',
    });
    assert.deepEqual(validateOrderRequest({ ...validBox(), email: 'nope' }), {
      ok: false,
      error: 'invalid-email',
    });
    assert.deepEqual(validateOrderRequest({ ...validBox(), email: undefined }), {
      ok: false,
      error: 'email-required',
    });
    assert.deepEqual(validateOrderRequest({ ...validBox(), name: '   ' }), {
      ok: false,
      error: 'invalid-name',
    });
    assert.deepEqual(validateOrderRequest({ ...validBox(), quantity: 0 }), {
      ok: false,
      error: 'invalid-quantity',
    });
    assert.deepEqual(validateOrderRequest({ ...validBox(), quantity: 1.5 }), {
      ok: false,
      error: 'invalid-quantity',
    });
    assert.deepEqual(validateOrderRequest({ ...validBox(), quantity: 100 }), {
      ok: false,
      error: 'invalid-quantity',
    });
    assert.deepEqual(validateOrderRequest({ ...validBox(), variant: 'max' }), {
      ok: false,
      error: 'variant-required',
    });
    assert.deepEqual(validateOrderRequest({ ...validBox(), variant: 'silver' }), {
      ok: false,
      error: 'variant-required',
    });
    assert.deepEqual(validateOrderRequest('order'), { ok: false, error: 'invalid-body' });
  });

  it('bounds free-text fields and trims name/email/notes', () => {
    const r = validateOrderRequest({
      ...validBox(),
      name: '  Priya  ',
      email: '  priya@example.com  ',
      notes: ` ${'n'.repeat(MAX_FIELD_CHARS + 50)} `,
      businessType: ` ${'b'.repeat(200)} `,
    });
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(r.value.name, 'Priya');
    assert.equal(r.value.email, 'priya@example.com');
    assert.ok((r.value.notes ?? '').length <= MAX_FIELD_CHARS);
    assert.equal(r.value.name.length <= MAX_NAME_CHARS, true);
  });
});

describe('order storage', () => {
  let dir: string;

  before(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'leads-'));
    process.env.LEADS_LOG_DIR = dir;
  });

  after(async () => {
    delete process.env.LEADS_LOG_DIR;
    await rm(dir, { recursive: true, force: true });
  });

  it('generates a stable-looking reference', () => {
    const ref = generateReference(new Date(Date.UTC(2026, 9, 16)));
    assert.match(ref, /^AIS-261016-[0-9A-F]{4}$/);
    assert.notEqual(generateReference(new Date(Date.UTC(2026, 9, 16))), ref);
  });

  it('appends one JSON line per order and never stores payment fields', async () => {
    const logged: string[] = [];
    const originalLog = console.log;
    console.log = (line: string) => {
      logged.push(String(line));
    };
    try {
      const order = validateOrderRequest(validBox());
      assert.equal(order.ok, true);
      if (!order.ok) return;
      const record = toOrderRecord(order.value, 'AIS-261016-TEST');
      const result = await storeOrder(record);
      assert.equal(result.persisted, true);

      const file = path.join(dir, 'orders.jsonl');
      const lines = (await readFile(file, 'utf8')).trim().split('\n');
      assert.equal(lines.length, 1);
      const stored = JSON.parse(lines[0]);
      assert.equal(stored.reference, 'AIS-261016-TEST');
      assert.equal(stored.product, 'box');
      assert.equal(stored.email, 'priya@example.com');
      assert.equal(typeof stored.createdAt, 'string');
      // The structured host log line carries the same record.
      const hostLine = logged.find((l) => l.startsWith('[order] '));
      assert.ok(hostLine, 'expected a structured [order] log line');
      assert.equal(JSON.parse(hostLine!.slice('[order] '.length)).reference, 'AIS-261016-TEST');
      // No payment-shaped keys anywhere in the stored record.
      for (const key of Object.keys(stored)) {
        assert.equal(/card|cvc|cvv|expiry|pan|iban|payment/i.test(key), false, key);
      }
    } finally {
      console.log = originalLog;
    }
  });
});
