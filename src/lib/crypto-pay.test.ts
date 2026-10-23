// Tests for the Solana Pay crypto-payment core (issue #36 Option B).
// Offline negatives only - no network: token tampering, expiry, wrong product,
// and the "wrong amount must NOT unlock" rule via injected fake PaymentDeps.
// Run: npm run test:crypto.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  getCompiledTransactionMessageDecoder,
  getTransactionDecoder,
} from '@solana/kit';

import {
  REFERENCE_TTL_MS,
  SOLANA_RECIPIENT,
  USDC_DECIMALS,
  USDC_MINT,
  buildPaymentTransaction,
  checkPayment,
  newReference,
  resolveCryptoProduct,
  signDownload,
  signReference,
  usdNumberFor,
  verifyDownload,
  verifyReference,
  type PaymentDeps,
} from './crypto-pay.ts';

const SECRET = 'test-secret';
const BUYER = '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM';

describe('usdNumberFor', () => {
  it('parses fixed-table labels', () => {
    assert.equal(usdNumberFor(14), 18);
    assert.equal(usdNumberFor(1000), 1250);
  });
  it('returns null outside the table', () => {
    assert.equal(usdNumberFor(13), null);
    assert.equal(usdNumberFor(0), null);
  });
});

describe('resolveCryptoProduct', () => {
  it('audit is hardcoded GBP75 -> $95 regardless of env', () => {
    const p = resolveCryptoProduct('audit');
    assert.ok(p);
    assert.equal(p.kind, 'audit');
    assert.equal(p.pounds, 75);
    assert.equal(p.usd, 95);
  });
  it('guide needs its price env; unset means no crypto offer', () => {
    const saved = process.env.GUIDE_PRICE_PENCE;
    delete process.env.GUIDE_PRICE_PENCE;
    assert.equal(resolveCryptoProduct('hire-first-ai-employee'), null);
    process.env.GUIDE_PRICE_PENCE = '1400';
    const p = resolveCryptoProduct('hire-first-ai-employee');
    assert.ok(p);
    assert.equal(p.kind, 'guide');
    assert.equal(p.pounds, 14);
    assert.equal(p.usd, 18);
    if (saved === undefined) delete process.env.GUIDE_PRICE_PENCE;
    else process.env.GUIDE_PRICE_PENCE = saved;
  });
  it('bundle maps to kind bundle', () => {
    const saved = process.env.BUNDLE_PRICE_PENCE;
    process.env.BUNDLE_PRICE_PENCE = '3500';
    const p = resolveCryptoProduct('bundle-all-four');
    assert.ok(p);
    assert.equal(p.kind, 'bundle');
    assert.equal(p.usd, 44);
    if (saved === undefined) delete process.env.BUNDLE_PRICE_PENCE;
    else process.env.BUNDLE_PRICE_PENCE = saved;
  });
  it('build tiers follow env; missing or odd pence -> null', () => {
    const savedSetup = process.env.BUILD_SETUP_PRICE_PENCE;
    delete process.env.BUILD_SETUP_PRICE_PENCE;
    assert.equal(resolveCryptoProduct('build-setup'), null);
    process.env.BUILD_SETUP_PRICE_PENCE = '14999';
    assert.equal(resolveCryptoProduct('build-setup'), null, 'non-whole pounds must not be charged');
    process.env.BUILD_SETUP_PRICE_PENCE = '30000';
    const p = resolveCryptoProduct('build-setup');
    assert.ok(p);
    assert.equal(p.kind, 'build');
    assert.equal(p.usd, 380);
    if (savedSetup === undefined) delete process.env.BUILD_SETUP_PRICE_PENCE;
    else process.env.BUILD_SETUP_PRICE_PENCE = savedSetup;
  });
  it('unknown product -> null', () => {
    assert.equal(resolveCryptoProduct('not-a-product'), null);
    assert.equal(resolveCryptoProduct(''), null);
  });
});

describe('reference tokens', () => {
  const ref = newReference();
  it('round-trips within the TTL', () => {
    const { token, expiry } = signReference(ref, 'audit', 95, SECRET);
    assert.ok(expiry - Date.now() > REFERENCE_TTL_MS - 5000);
    assert.deepEqual(verifyReference(ref, 'audit', 95, token, SECRET), { ok: true, expiry });
  });
  it('rejects tampered amount, product, reference and wrong secret', () => {
    const { token } = signReference(ref, 'audit', 95, SECRET);
    assert.equal(verifyReference(ref, 'audit', 1, token, SECRET).ok, false, 'wrong amount must fail');
    assert.equal(verifyReference(ref, 'other', 95, token, SECRET).ok, false);
    assert.equal(verifyReference(newReference(), 'audit', 95, token, SECRET).ok, false);
    assert.equal(verifyReference(ref, 'audit', 95, token, 'other-secret').ok, false);
  });
  it('rejects expired and malformed tokens', () => {
    const past = Date.now() - REFERENCE_TTL_MS - 1000;
    const { token } = signReference(ref, 'audit', 95, SECRET, past);
    assert.deepEqual(verifyReference(ref, 'audit', 95, token, SECRET), { ok: false, reason: 'expired' });
    assert.equal(verifyReference(ref, 'audit', 95, 'garbage', SECRET).ok, false);
    assert.equal(verifyReference(ref, 'audit', 95, '', SECRET).ok, false);
    assert.equal(verifyReference(ref, 'audit', 95, `${Date.now() + 100000}.${'z'.repeat(64)}`, SECRET).ok, false);
  });
});

describe('download tokens', () => {
  it('round-trips and binds product + signature', () => {
    const token = signDownload('audit', 'sig-abc', SECRET);
    assert.equal(verifyDownload('audit', 'sig-abc', token, SECRET), true);
    assert.equal(verifyDownload('hire-first-ai-employee', 'sig-abc', token, SECRET), false, 'other product must fail');
    assert.equal(verifyDownload('audit', 'sig-xyz', token, SECRET), false, 'other signature must fail');
    assert.equal(verifyDownload('audit', 'sig-abc', token, 'other-secret'), false);
    assert.equal(verifyDownload('audit', 'sig-abc', '', SECRET), false);
  });
  it('expires after the TTL', () => {
    const past = Date.now() - 7 * 24 * 60 * 60 * 1000 - 1000;
    const token = signDownload('audit', 'sig-abc', SECRET, past);
    assert.equal(verifyDownload('audit', 'sig-abc', token, SECRET), false);
  });
});

describe('checkPayment (fake deps, offline)', () => {
  const ref = newReference();
  const deps = (over: Partial<PaymentDeps> = {}): PaymentDeps => ({
    findReference: async () => ({ signature: 'sig-found' }),
    validateTransfer: async () => undefined,
    ...over,
  });

  it('pending while the reference is not on chain yet', async () => {
    const e = new Error('not found');
    e.name = 'FindReferenceError';
    const r = await checkPayment(deps({ findReference: async () => { throw e; } }), ref, 95);
    assert.deepEqual(r, { status: 'pending' });
  });

  it('CONFIRMED only after full validation passes', async () => {
    const seen: Record<string, unknown> = {};
    const r = await checkPayment(
      deps({
        validateTransfer: async (sig, fields) => {
          seen.sig = sig;
          Object.assign(seen, fields);
        },
      }),
      ref,
      95,
    );
    assert.deepEqual(r, { status: 'confirmed', signature: 'sig-found' });
    assert.equal(seen.recipient, SOLANA_RECIPIENT);
    assert.equal(seen.amount, 95, 'whole USDC dollars go to validateTransfer');
    assert.equal(seen.splToken, USDC_MINT);
    assert.equal(seen.reference, ref);
  });

  it('wrong amount (ValidateTransferError) stays pending - never delivers', async () => {
    const e = new Error('amount mismatch');
    e.name = 'ValidateTransferError';
    const r = await checkPayment(deps({ validateTransfer: async () => { throw e; } }), ref, 95);
    assert.deepEqual(r, { status: 'pending' });
  });

  it('RPC failures surface as unverifiable, not as a delivery', async () => {
    const r = await checkPayment(deps({ findReference: async () => { throw new Error('429 rate limited'); } }), ref, 95);
    assert.equal(r.status, 'unverifiable');
    const r2 = await checkPayment(
      deps({ validateTransfer: async () => { throw new Error('boom'); } }),
      ref,
      95,
    );
    assert.equal(r2.status, 'unverifiable');
  });
});

describe('buildPaymentTransaction (structural, offline)', () => {
  it('compiles: transfer last, reference appended, exact USDC amount', async () => {
    const ref = newReference();
    const b64 = await buildPaymentTransaction(BUYER, ref, 18);
    assert.equal(typeof b64, 'string');
    const bytes = Buffer.from(b64, 'base64');
    assert.ok(bytes.length > 200, 'wire transaction should not be trivially small');

    const tx = getTransactionDecoder().decode(new Uint8Array(bytes));
    assert.equal(Object.keys(tx.signatures)[0], BUYER, 'fee payer = buyer, signature left empty for the wallet');
    const compiled = getCompiledTransactionMessageDecoder().decode(tx.messageBytes);
    const instrs = compiled.instructions;
    assert.equal(instrs.length, 2, 'create ATA + transferChecked');
    assert.ok(instrs[0], 'instruction 1 present');
    assert.ok(instrs[1], 'instruction 2 present');

    const keys = compiled.staticAccounts;
    assert.equal(keys.filter((k) => k === ref).length, 1, 'reference appears exactly once as an account');
    const refIndex = keys.indexOf(ref);
    const transfer = instrs[1];
    assert.ok(
      transfer.accountIndices[transfer.accountIndices.length - 1] === refIndex,
      'transfer accounts must end with the reference (validateTransfer pops the last ix)',
    );
    assert.ok(
      instrs[0].accountIndices.every((i) => i !== refIndex),
      'reference belongs only to the transfer instruction',
    );

    // transferChecked data: u8 discriminator 12, u64 LE amount, u8 decimals.
    const data = transfer.data;
    assert.equal(data[0], 12, 'TransferChecked instruction');
    const amount = new DataView(data.buffer, data.byteOffset).getBigUint64(1, true);
    assert.equal(amount, BigInt(18) * BigInt(10 ** USDC_DECIMALS));
    assert.equal(data[9], USDC_DECIMALS);

    // Unsigned: buyer is the only signer slot, blockhash is the placeholder
    // @solana/pay's fetchTransaction replaces before the wallet signs.
    assert.equal(keys[0], BUYER);
    assert.ok(keys.includes(SOLANA_RECIPIENT), 'recipient in the account list');
    assert.ok(keys.includes(USDC_MINT), 'USDC mint in the account list');
  });
});
