// SSRF-guarded homepage fetch for /win (issue #32). Node runtime only.
// Rules: http -> https upgrade, https only, no embedded credentials, every
// DNS answer (and every redirect hop, max 5) checked against private/reserved
// IP ranges, 10s total deadline, 2MB response cap. Nothing else is requested.

import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

const MAX_BYTES = 2 * 1024 * 1024;
const DEADLINE_MS = 10_000;
const MAX_HOPS = 5;

const USER_AGENT = 'AISolutionsWinCheck/1.0 (+https://ai-solutions.company/win)';

export type FetchOutcome = { ok: true; html: string } | { ok: false; reason: string };

function ipv4Blocked(ip: string): boolean {
  const p = ip.split('.').map(Number);
  if (p.length !== 4 || p.some((n) => !Number.isInteger(n))) return true;
  const [a, b] = p;
  return (
    a === 0 || // "this" network
    a === 10 || // 10/8
    a === 127 || // loopback
    (a === 100 && b >= 64 && b <= 127) || // 100.64/10 CGNAT
    (a === 169 && b === 254) || // link-local / cloud metadata
    (a === 172 && b >= 16 && b <= 31) || // 172.16/12
    (a === 192 && b === 0) || // 192.0.0/24 + 192.0.2/24 documentation
    (a === 192 && b === 168) || // 192.168/16
    (a === 198 && (b === 18 || b === 19)) || // benchmarking
    (a === 198 && b === 51) || // documentation
    (a === 203 && b === 0) || // documentation
    a >= 224 // multicast, reserved, broadcast
  );
}

function ipv6Blocked(ip: string): boolean {
  const v6 = ip.toLowerCase().split('%')[0];
  const mapped = v6.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/);
  if (mapped) return ipv4Blocked(mapped[1]);
  if (v6 === '::1' || v6 === '::') return true;
  const first = v6.split(':')[0] || '';
  if (/^f[cd]/.test(first)) return true; // fc00::/7 unique local
  if (/^fe[89ab]/.test(first)) return true; // fe80::/10 link-local
  if (first === 'ff') return true; // multicast
  if (v6.startsWith('2001:db8')) return true; // documentation
  return false;
}

export function ipBlocked(ip: string): boolean {
  const kind = isIP(ip);
  if (kind === 4) return ipv4Blocked(ip);
  if (kind === 6) return ipv6Blocked(ip);
  return true; // unparseable = blocked
}

async function assertSafeHost(hostname: string): Promise<void> {
  const host = hostname.toLowerCase().replace(/\.$/, '');
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local')) {
    throw new Error('blocked-host');
  }
  const addrs = await lookup(host, { all: true });
  if (!addrs.length) throw new Error('dns-empty');
  for (const { address } of addrs) {
    if (ipBlocked(address)) throw new Error('blocked-address');
  }
}

function upgradeHttps(url: URL): URL | null {
  if (url.protocol === 'http:') url.protocol = 'https:';
  if (url.protocol !== 'https:') return null;
  if (url.username || url.password) return null;
  return url;
}

export async function fetchHomepage(rawUrl: string): Promise<FetchOutcome> {
  const deadline = Date.now() + DEADLINE_MS;

  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return { ok: false, reason: 'bad-url' };
  }
  if (!upgradeHttps(url)) return { ok: false, reason: 'protocol' };

  for (let hop = 0; hop <= MAX_HOPS; hop++) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) return { ok: false, reason: 'timeout' };

    try {
      await assertSafeHost(url.hostname);
    } catch (e) {
      return { ok: false, reason: e instanceof Error ? e.message : 'blocked-host' };
    }

    let res: Response;
    try {
      res = await fetch(url, {
        redirect: 'manual',
        signal: AbortSignal.timeout(remaining),
        headers: {
          'user-agent': USER_AGENT,
          accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.5',
          'accept-language': 'en',
        },
      });
    } catch {
      return { ok: false, reason: 'fetch-failed' };
    }

    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get('location');
      if (!loc) return { ok: false, reason: 'redirect-without-location' };
      let next: URL;
      try {
        next = new URL(loc, url);
      } catch {
        return { ok: false, reason: 'redirect-without-location' };
      }
      if (!upgradeHttps(next)) return { ok: false, reason: 'protocol' };
      url = next;
      continue;
    }

    if (!res.ok) return { ok: false, reason: `http-${res.status}` };

    const reader = res.body?.getReader();
    if (!reader) return { ok: false, reason: 'empty-body' };

    const parts: Uint8Array[] = [];
    let total = 0;
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        if (!value) continue;
        const room = MAX_BYTES - total;
        const take = value.byteLength > room ? value.subarray(0, room) : value;
        parts.push(take);
        total += take.byteLength;
        if (total >= MAX_BYTES) {
          try {
            await reader.cancel();
          } catch {
            /* stream closing anyway */
          }
          break;
        }
      }
    } catch {
      if (!total) return { ok: false, reason: 'read-failed' };
    }

    const buf = Buffer.concat(parts.map((p) => Buffer.from(p)), total);
    return { ok: true, html: buf.toString('utf8') };
  }

  return { ok: false, reason: 'too-many-redirects' };
}
