'use client';

// Client transport for the Bow live relay. The visitor's message is POSTed to
// /api/bow-relay and advisor replies are polled while the chat is open and the
// tab is visible. Nothing provider- or token-related touches the browser: the
// route only ever returns { ok, messages } or a generic error code.

import { useCallback, useEffect, useRef, useState } from 'react';
import type { RelayChannel } from './relay';

const POLL_MS = 4500;

export type RelayStatus = 'scripted' | 'live' | 'unavailable';

type RelayMessage = { from: 'visitor' | 'advisor'; text: string; ts: number };

export function useRelay(
  channel: RelayChannel,
  sessionId: string,
  active: boolean,
  onAdvisor: (text: string) => void,
) {
  const [status, setStatus] = useState<RelayStatus>('scripted');
  const seenAdvisor = useRef(0);
  const onAdvisorRef = useRef(onAdvisor);

  useEffect(() => {
    onAdvisorRef.current = onAdvisor;
  }, [onAdvisor]);

  const absorb = useCallback((messages: RelayMessage[]) => {
    const advisor = messages.filter((m) => m.from === 'advisor');
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
        const data = (await res.json().catch(() => null)) as
          | { ok?: boolean; messages?: RelayMessage[] }
          | null;
        if (!res.ok || !data?.ok) {
          setStatus('unavailable');
          return false;
        }
        absorb(data.messages ?? []);
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
    if (!active || status !== 'live') return;
    let stopped = false;
    const tick = async () => {
      if (stopped || document.visibilityState !== 'visible') return;
      try {
        const res = await fetch(
          `/api/bow-relay?channel=${channel}&sessionId=${encodeURIComponent(sessionId)}`,
          { cache: 'no-store' },
        );
        const data = (await res.json().catch(() => null)) as
          | { ok?: boolean; messages?: RelayMessage[] }
          | null;
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
  }, [active, status, channel, sessionId, absorb]);

  return { status, send };
}
