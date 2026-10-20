// Free-chapter signup support for /sample (issue #127). One JSON record per
// signup in the PRIVATE Blob store, plus HMAC-signed, expiring download links.
// Secrets come from env only (SAMPLE_LINK_SECRET, SAMPLE_ADMIN_KEY) and are
// never printed or committed.

import { createHmac, timingSafeEqual } from 'node:crypto';

const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 60 * 60 * 1000;

export type SampleSignup = { name: string; email: string; guide: string; ts: string };

/** token = "<expiryMs>.<hmac-hex>", HMAC-SHA256 over "<slug>:<expiryMs>". */
export function signSampleToken(guide: string, secret: string, now = Date.now()): string {
  const expiry = now + TOKEN_TTL_MS;
  const mac = createHmac('sha256', secret).update(`${guide}:${expiry}`).digest('hex');
  return `${expiry}.${mac}`;
}

export function verifySampleToken(guide: string, token: string, secret: string, now = Date.now()): boolean {
  if (!guide || !token || !secret) return false;
  const dot = token.indexOf('.');
  if (dot <= 0) return false;
  const expiry = Number(token.slice(0, dot));
  const mac = token.slice(dot + 1);
  if (!Number.isFinite(expiry) || expiry <= now || !/^[0-9a-f]{64}$/.test(mac)) return false;
  const expected = createHmac('sha256', secret).update(`${guide}:${expiry}`).digest();
  let given: Buffer;
  try {
    given = Buffer.from(mac, 'hex');
  } catch {
    return false;
  }
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export function sampleFilename(guide: string): string {
  return `sample-${guide}.pdf`;
}

// ---------------------------------------------------------------- rate limit
// Light in-memory per-IP limit: 10 signups/hour. Enough to stop form spam,
// nothing persistent (serverless instances each keep their own counter).
const hits = new Map<string, number[]>();

export function rateAllowed(ip: string, now = Date.now()): boolean {
  const windowStart = now - RATE_WINDOW_MS;
  const list = (hits.get(ip) || []).filter((t) => t > windowStart);
  if (list.length >= RATE_LIMIT) {
    hits.set(ip, list);
    return false;
  }
  list.push(now);
  hits.set(ip, list);
  return true;
}
