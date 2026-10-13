// Adapter boundary between the browser demo and the (inactive) backend route.
//
// DOCUMENTED BOUNDARY
// -------------------
// The UI never talks to a model provider. It only talks to `POST
// /api/sales-chat` through `requestSalesReply`. Until activation is separately
// approved, that route returns `{ fallback: true }` and the UI answers from the
// scripted engine in ./script.
//
// Activation is intentionally blocked on owner decisions that are NOT made
// here and must be recorded before any live call:
//   1. provider choice and who pays
//   2. an ENFORCED budget / global spending cap
//      (per-instance memory is NOT an enforceable global cap on multi-instance
//      hosting, so no KV/Upstash or paid call is provisioned)
//   3. privacy notice and data-processing terms
//   4. secure key delivery (a key merely existing does NOT authorise paid calls
//      and does NOT silently activate this route)
//   5. explicit activation approval
//
// Failure behaviour: any timeout, non-2xx status, malformed body or unexpected
// shape is reported as a fallback, never thrown. The caller keeps its own
// scripted reply so the demo stays truthful and available.

import type { SalesChatInput } from './script';

export type AdapterFailureReason = 'timeout' | 'network' | 'http' | 'malformed' | 'shape';

export type AdapterResult =
  | { ok: true; fallback: true; active: false }
  | { ok: false; fallback: true; reason: AdapterFailureReason };

export type SalesChatFetch = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

export type AdapterDeps = {
  /** Injectable for offline/mocked tests. Defaults to the global fetch. */
  fetchImpl?: SalesChatFetch;
  /** Abort the request after this many ms. */
  timeoutMs?: number;
};

const ROUTE = '/api/sales-chat';
const DEFAULT_TIMEOUT_MS = 8000;

export async function requestSalesReply(
  input: SalesChatInput,
  deps: AdapterDeps = {},
): Promise<AdapterResult> {
  const doFetch =
    deps.fetchImpl ?? (typeof fetch === 'function' ? fetch : undefined);
  if (!doFetch) return { ok: false, fallback: true, reason: 'network' };

  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    deps.timeoutMs ?? DEFAULT_TIMEOUT_MS,
  );

  try {
    const res = await doFetch(ROUTE, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(input),
      signal: controller.signal,
    });

    if (!res.ok) return { ok: false, fallback: true, reason: 'http' };

    let data: unknown;
    try {
      data = await res.json();
    } catch {
      return { ok: false, fallback: true, reason: 'malformed' };
    }

    if (
      typeof data === 'object' &&
      data !== null &&
      (data as { fallback?: unknown }).fallback === true
    ) {
      return { ok: true, fallback: true, active: false };
    }
    return { ok: false, fallback: true, reason: 'shape' };
  } catch (err) {
    const aborted = err instanceof Error && err.name === 'AbortError';
    return { ok: false, fallback: true, reason: aborted ? 'timeout' : 'network' };
  } finally {
    clearTimeout(timer);
  }
}
