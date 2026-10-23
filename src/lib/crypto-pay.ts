// Solana Pay, Option B (issue #36, restarted 21 Oct): fully automatic on-page
// USDC payment with server-side verification and instant delivery, zero
// processing fee. The buyer's wallet talks to /api/crypto-pay (transaction
// request per the Solana Pay spec); the browser polls /api/crypto-pay/status,
// which finds the on-chain reference and validates recipient, amount, mint and
// reference before anything is delivered. No third party, no spend, no bank
// details anywhere on the page - the address only ever lives in server code
// and in the transaction the wallet shows the buyer.

import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import {
  AccountRole,
  appendTransactionMessageInstructions,
  compileTransaction,
  createNoopSigner,
  createTransactionMessage,
  getBase58Decoder,
  getBase64EncodedWireTransaction,
  setTransactionMessageFeePayer,
  address,
  type Address,
  type Instruction,
} from '@solana/kit';
import {
  getCreateAssociatedTokenIdempotentInstruction,
  getTransferCheckedInstruction,
  findAssociatedTokenPda,
  TOKEN_PROGRAM_ADDRESS,
} from '@solana-program/token';
import { usdFor } from './usd.ts';
import { BUNDLE_SLUGS, guideBySlug, pricePence } from './guides.ts';

// Cesar's wallet, hard-coded (same rule as the original issue: never fetched
// from any external/API source at runtime - address-substitution risk).
export const SOLANA_RECIPIENT = 'BxrbFrJvVKpqxYVkxGgXw2eQwbX3zj8hrSQmN2qtsfTx';
// Canonical USDC mint on Solana mainnet.
export const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
export const USDC_DECIMALS = 6;

/** References expire after 15 minutes (issue #36 spec item 4). */
export const REFERENCE_TTL_MS = 15 * 60 * 1000;
/** Download links stay valid 7 days, like the free-sample tokens. */
export const DOWNLOAD_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export type CryptoProduct = {
  /** Identifier carried through tokens and links. */
  product: string;
  kind: 'guide' | 'bundle' | 'audit' | 'build';
  /** Human name for the wallet's transaction-request label/message. */
  name: string;
  /** Whole-pound GBP price the USD amount was derived from. */
  pounds: number;
  /** USDC charge amount in whole dollars (from the fixed USD table). */
  usd: number;
};

/**
 * Numeric USD amount from the fixed display table in usd.ts. The table holds
 * labels like '$1,250' - for this fixed format stripping non-digits is exact,
 * and it keeps PR #50's file untouched (this branch stacks on it).
 * Returns null when the GBP amount has no USD entry (same rule as withUsd:
 * the page shows no USD there, so there is nothing to charge in crypto).
 */
export function usdNumberFor(pounds: number): number | null {
  const label = usdFor(pounds);
  if (!label) return null;
  const n = parseInt(label.replace(/[^0-9]/g, ''), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function poundsFromPence(pence: number): number | null {
  if (!Number.isFinite(pence) || pence <= 0 || pence % 100 !== 0) return null;
  return pence / 100;
}

/**
 * Resolve a product identifier to its crypto charge, or null when the item
 * has no fixed USD price (unset env, price outside the USD table, unknown
 * product). Amounts come from the same env/table sources as Stripe checkout.
 */
export function resolveCryptoProduct(product: string): CryptoProduct | null {
  if (!product) return null;

  if (product === 'audit') {
    const pounds = poundsFromPence(7500);
    const usd = pounds === null ? null : usdNumberFor(pounds);
    if (pounds === null || usd === null) return null;
    return { product, kind: 'audit', name: 'The GBP75 AI Audit', pounds, usd };
  }

  if (product === 'build-setup' || product === 'build-build') {
    const env = product === 'build-setup' ? 'BUILD_SETUP_PRICE_PENCE' : 'BUILD_PRICE_PENCE';
    const pence = parseInt(process.env[env] ?? '', 10);
    const pounds = poundsFromPence(pence);
    const usd = pounds === null ? null : usdNumberFor(pounds);
    if (pounds === null || usd === null) return null;
    return { product, kind: 'build', name: product === 'build-setup' ? 'Setup tier' : 'Build tier', pounds, usd };
  }

  const guide = guideBySlug(product);
  if (!guide) return null;
  const pounds = poundsFromPence(pricePence(guide));
  const usd = pounds === null ? null : usdNumberFor(pounds);
  if (pounds === null || usd === null) return null;
  const kind = product === 'bundle-all-four' ? 'bundle' : 'guide';
  return { product, kind, name: guide.title, pounds, usd };
}

/** Slugs delivered for the bundle (mirrors the Stripe thanks-page fan-out). */
export function bundleItems(): readonly string[] {
  return BUNDLE_SLUGS;
}

// ---------------------------------------------------------------- secrets
/**
 * HMAC secret for reference + download tokens. Production needs one of these
 * envs set (CRYPTO_PAY_SECRET preferred); local dev/tests fall back to a
 * per-process random so flows work in a single process.
 */
export function cryptoSecret(): string {
  const s = (
    process.env.CRYPTO_PAY_SECRET
    || process.env.SAMPLE_LINK_SECRET
    || process.env.JARVIS_CHAT_PASSWORD
    || ''
  ).trim();
  if (s) return s;
  if (process.env.NODE_ENV === 'production') return '';
  return randomBytes(32).toString('hex');
}

// ------------------------------------------------------------- references
/** Fresh random 32-byte reference public key (base58). */
export function newReference(): string {
  return getBase58Decoder().decode(randomBytes(32));
}

/**
 * Reference token: proves which product/amount a reference was minted for
 * without any server-side store (the mapping lives in the signed token the
 * browser carries, so any serverless instance can verify it). Token format:
 * "<expiryMs>.<hmac-hex>" over "ref:product:usd:expiry".
 */
export function signReference(
  ref: string,
  product: string,
  usd: number,
  secret: string,
  now = Date.now(),
): { token: string; expiry: number } {
  const expiry = now + REFERENCE_TTL_MS;
  const mac = createHmac('sha256', secret).update(`${ref}:${product}:${usd}:${expiry}`).digest('hex');
  return { token: `${expiry}.${mac}`, expiry };
}

export type ReferenceCheck =
  | { ok: true; expiry: number }
  | { ok: false; reason: 'malformed' | 'expired' | 'bad-signature' };

export function verifyReference(
  ref: string,
  product: string,
  usd: number,
  token: string,
  secret: string,
  now = Date.now(),
): ReferenceCheck {
  if (!ref || !product || !token || !secret || !Number.isFinite(usd) || usd <= 0) {
    return { ok: false, reason: 'malformed' };
  }
  const dot = token.indexOf('.');
  if (dot <= 0) return { ok: false, reason: 'malformed' };
  const expiry = Number(token.slice(0, dot));
  const mac = token.slice(dot + 1);
  if (!Number.isFinite(expiry) || !/^[0-9a-f]{64}$/.test(mac)) return { ok: false, reason: 'malformed' };
  if (expiry <= now) return { ok: false, reason: 'expired' };
  const expected = createHmac('sha256', secret).update(`${ref}:${product}:${usd}:${expiry}`).digest();
  let given: Buffer;
  try {
    given = Buffer.from(mac, 'hex');
  } catch {
    return { ok: false, reason: 'bad-signature' };
  }
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    return { ok: false, reason: 'bad-signature' };
  }
  return { ok: true, expiry };
}

// -------------------------------------------------------- download tokens
/**
 * Download tokens are minted only after on-chain validation succeeds. The
 * payload binds product + confirmed signature + expiry, so a token cannot be
 * reused for another product and is worthless without the secret. Format:
 * "<expiryMs>.<hmac-hex>" over "product:signature:expiry".
 */
export function signDownload(product: string, signature: string, secret: string, now = Date.now()): string {
  const expiry = now + DOWNLOAD_TTL_MS;
  const mac = createHmac('sha256', secret).update(`${product}:${signature}:${expiry}`).digest('hex');
  return `${expiry}.${mac}`;
}

export function verifyDownload(
  product: string,
  signature: string,
  token: string,
  secret: string,
  now = Date.now(),
): boolean {
  if (!product || !signature || !token || !secret) return false;
  const dot = token.indexOf('.');
  if (dot <= 0) return false;
  const expiry = Number(token.slice(0, dot));
  const mac = token.slice(dot + 1);
  if (!Number.isFinite(expiry) || expiry <= now || !/^[0-9a-f]{64}$/.test(mac)) return false;
  const expected = createHmac('sha256', secret).update(`${product}:${signature}:${expiry}`).digest();
  let given: Buffer;
  try {
    given = Buffer.from(mac, 'hex');
  } catch {
    return false;
  }
  return given.length === expected.length && timingSafeEqual(given, expected);
}

// -------------------------------------------------- transaction building
/**
 * Serialize the unsigned payment transaction per the Solana Pay transaction
 * request spec: the wallet POSTs its account, we return base64, the wallet
 * injects a recent blockhash, signs and sends (that round trip is built into
 * @solana/pay's fetchTransaction - the server never signs anything).
 *
 * Two instructions: create the recipient's USDC account idempotently (the
 * first buyer may be the first ever USDC payment to this wallet), then a
 * checked USDC transfer with the reference appended as an extra read-only
 * account - exactly what validateTransfer expects (required accounts first,
 * references after, in order). The transfer must stay last: validation pops
 * the last instruction.
 *
 * All ATA addresses are derived locally; only the wallet's own blockhash
 * fetch touches the network from the buyer's side.
 */
export async function buildPaymentTransaction(buyerRaw: string, refRaw: string, usd: number): Promise<string> {
  if (!Number.isInteger(usd) || usd <= 0) {
    throw new Error('amount invalid');
  }
  const buyer = address(buyerRaw);
  const ref = address(refRaw);
  const mint = address(USDC_MINT);
  const recipient = address(SOLANA_RECIPIENT);
  const noopBuyer = createNoopSigner(buyer);

  const [buyerAta] = await findAssociatedTokenPda({ owner: buyer, mint, tokenProgram: TOKEN_PROGRAM_ADDRESS });
  const [merchantAta] = await findAssociatedTokenPda({ owner: recipient, mint, tokenProgram: TOKEN_PROGRAM_ADDRESS });

  const createIx = getCreateAssociatedTokenIdempotentInstruction({
    payer: noopBuyer,
    ata: merchantAta,
    owner: recipient,
    mint,
  });

  const transferIx = getTransferCheckedInstruction({
    source: buyerAta,
    mint,
    destination: merchantAta,
    authority: noopBuyer,
    amount: BigInt(usd) * BigInt(10 ** USDC_DECIMALS),
    decimals: USDC_DECIMALS,
  });

  const transferWithReference: Instruction = {
    ...transferIx,
    accounts: [
      ...(transferIx.accounts ?? []),
      { address: ref, role: AccountRole.READONLY },
    ],
  };

  const message = setTransactionMessageFeePayer(
    buyer,
    appendTransactionMessageInstructions([createIx, transferWithReference], createTransactionMessage({ version: 0 })),
  );
  return getBase64EncodedWireTransaction(compileTransaction(message));
}

// ------------------------------------------------- on-chain verification
export type PaymentDeps = {
  findReference: (ref: Address) => Promise<{ signature: string }>;
  validateTransfer: (
    signature: string,
    fields: { recipient: string; amount: number; splToken: string; reference: string },
  ) => Promise<unknown>;
};

export type PaymentCheck =
  | { status: 'pending' }
  | { status: 'confirmed'; signature: string }
  | { status: 'unverifiable'; reason: string };

function errorName(e: unknown): string {
  return (e as { name?: string })?.name || '';
}

/**
 * Server-side verification (issue #36 spec items 3-4): find a transaction
 * mentioning the reference, then validate recipient + amount + mint +
 * reference. ANY failure means no delivery - underpayment, wrong token or
 * wrong recipient never unlock anything (safe by construction).
 */
export async function checkPayment(
  deps: PaymentDeps,
  refRaw: string,
  usd: number,
): Promise<PaymentCheck> {
  const ref = address(refRaw);
  let signature: string;
  try {
    const found = await deps.findReference(ref);
    signature = found.signature;
  } catch (e) {
    if (errorName(e) === 'FindReferenceError') return { status: 'pending' };
    return { status: 'unverifiable', reason: e instanceof Error ? e.message : String(e) };
  }
  try {
    await deps.validateTransfer(signature, {
      recipient: SOLANA_RECIPIENT,
      amount: usd,
      splToken: USDC_MINT,
      reference: refRaw,
    });
    return { status: 'confirmed', signature };
  } catch (e) {
    if (errorName(e) === 'ValidateTransferError') {
      // Reference touched but the transfer is invalid (wrong amount, token or
      // recipient): keep waiting until expiry - never deliver.
      return { status: 'pending' };
    }
    return { status: 'unverifiable', reason: e instanceof Error ? e.message : String(e) };
  }
}
