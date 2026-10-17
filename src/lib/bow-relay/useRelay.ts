'use client';

// Client transport for the Bow live relay. The visitor's message is POSTed to
// /api/bow-relay and advisor replies are polled while the chat is open and the
// tab is visible. Nothing provider- or token-related touches the browser: the
// route only ever returns { ok, messages } or a generic error code.

import { useCallback, useEffect, useRef, useState } from 'react';
import type { RelayChannel } from './relay';

const POLL_MS = 4500;

export type RelayStatus = 'scripted' | 'live' | 'unavailable';
/** Which tier answered: Groq (instant), holding line (escalation) or relay (polled). */
export type RelayMode = 'groq' | 'holding' | 'relay';

type RelayMessage = { from: 'visitor' | 'advisor'; text: string; ts: number };
type RelayResponse = { ok?: boolean; messages?: RelayMessage[]; mode?: RelayMode };

export function useRelay(
  channel: RelayChannel,
  sessionId: string,
  active: boolean,
  onAdvisor: (text: string) => void,
) {
  const [status, setStatus] = useState<RelayStatus>('scripted');
  const [mode, setMode] = useState<RelayMode | null>(null);
  const seenAdvisor = useRef(0);
  const onAdvisorRef = useRef(onAdvisor);

  useEffect(() => {
    onAdvisorRef.current = onAdvisor;
  }, [onAdvisor]);

  const absorb = useCallback((messages: RelayMessage[], sync = false) => {
    const advisor = messages.filter((m) => m.from === 'advisor');
    if (sync) {
      // Groq / holding tier: every response is a fresh reply for this message,
      // so it is always new (the relay counter below must not swallow it).
      for (const m of advisor) onAdvisorRef.current(m.text);
      return;
    }
    if (advisor.length > seenAdvisor.current) {
      for (const m of advisor.slice(seenAdvisor.current)) onAdvisorRef.current(m.text);
      seenAdvisor.current = advisor.length;
    }
  }, []);

  const send = useCallback(
    async (text: string): Promise<boolean> => {
      try {
        const res = await fetch('/api/bow-relay', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ channel, sessionId, text }),
        });
        const data = (await res.json().catch(() => null)) as RelayResponse | null;
        if (!res.ok || !data?.ok) {
          setStatus('unavailable');
          return false;
        }
        // Only the GitHub-issue relay returns an async reply to poll for. A
        // Groq answer (or holding line) already arrives in this response.
        const nextMode: RelayMode =
          data.mode === 'groq' || data.mode === 'holding' ? data.mode : 'relay';
        setMode(nextMode);
        absorb(data.messages ?? [], nextMode !== 'relay');
        setStatus('live');
        return true;
      } catch {
        setStatus('unavailable');
        return false;
      }
    },
    [channel, sessionId, absorb],
  );

  useEffect(() => {
    if (!active || status !== 'live' || mode !== 'relay') return;
    let stopped = false;
    const tick = async () => {
      if (stopped || document.visibilityState !== 'visible') return;
      try {
        const res = await fetch(
          `/api/bow-relay?channel=${channel}&sessionId=${encodeURIComponent(sessionId)}`,
          { cache: 'no-store' },
        );
        const data = (await res.json().catch(() => null)) as RelayResponse | null;
        if (!res.ok || !data?.ok) {
          setStatus('unavailable');
          return;
        }
        absorb(data.messages ?? []);
      } catch {
        setStatus('unavailable');
      }
    };
    const id = window.setInterval(tick, POLL_MS);
    const onVis = () => {
      if (document.visibilityState === 'visible') void tick();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      stopped = true;
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [active, status, mode, channel, sessionId, absorb]);

  return { status, mode, send };
}
