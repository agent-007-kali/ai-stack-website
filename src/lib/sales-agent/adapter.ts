// Browser adapter boundary for the /sales agent.
//
// The UI only talks to `POST /api/sales-agent` through `requestAgentReply`. The
// route is fail-closed: until a live provider is separately approved it returns
// `{ fallback: true }` and the UI answers from the deterministic engine.
//
// Failure behaviour: any timeout, non-2xx status, malformed body or unexpected
// shape is reported as a fallback, never thrown. The caller keeps its scripted
// reply so the chat stays truthful and available.

import type { AgentInput } from './engine';

export type AdapterFailureReason = 'timeout' | 'network' | 'http' | 'malformed' | 'shape';

export type AdapterResult =
  | { ok: true; fallback: true; active: false }
  | { ok: false; fallback: true; reason: AdapterFailureReason };

export type AgentFetch = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

export type AdapterDeps = {
  /** Injectable for offline/mocked tests. Defaults to the global fetch. */
  fetchImpl?: AgentFetch;
  /** Abort the request after this many ms. */
  timeoutMs?: number;
};

const ROUTE = '/api/sales-agent';
const DEFAULT_TIMEOUT_MS = 8000;

export async function requestAgentReply(
  input: AgentInput,
  deps: AdapterDeps = {},
): Promise<AdapterResult> {
  const doFetch = deps.fetchImpl ?? (typeof fetch === 'function' ? fetch : undefined);
  if (!doFetch) return { ok: false, fallback: true, reason: 'network' };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), deps.timeoutMs ?? DEFAULT_TIMEOUT_MS);

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
