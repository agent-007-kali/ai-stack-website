'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { BUNDLE_SLUGS } from '@/lib/guides';

// "Pay with crypto" block, issue #36 Option B: a Solana Pay transaction
// request. Opening the disclosure mints a reference (POST /create), the QR
// encodes solana:<endpoint>, the browser polls /status every 2 seconds, and
// on-chain validation unlocks the download/handoff. The wallet is given the
// amount, recipient and network by the signed transaction itself - this page
// never renders bank details or even the wallet address (it lives only in
// server code and the tx the wallet shows for approval).

type Session = {
  ref: string;
  token: string;
  product: string;
  kind: string;
  name: string;
  usd: number;
  expiresAt: number;
  solanaUrl: string;
  statusUrl: string;
};

type Phase = 'idle' | 'creating' | 'ready' | 'confirmed' | 'expired' | 'unavailable';

type StatusResponse = {
  status: 'pending' | 'confirmed' | 'expired' | 'unverifiable';
  signature?: string;
  downloadToken?: string;
  usd?: number;
};

const MAILTO = 'mailto:tradersbooking@gmail.com?subject=Crypto%20payment%20help';

export default function CryptoPay({ product }: { product: string }) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [session, setSession] = useState<Session | null>(null);
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const startedRef = useRef(false);
  const phaseRef = useRef<Phase>('idle');
  phaseRef.current = phase;

  const start = useCallback(async () => {
    if (startedRef.current) return;
    startedRef.current = true;
    setPhase('creating');
    try {
      const r = await fetch('/api/crypto-pay/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product }),
      });
      const j = await r.json();
      if (!r.ok || !j.solanaUrl) throw new Error(j.error || 'Payment request failed');
      setSession(j as Session);
      setPhase('ready');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      // No fixed USD price / not configured: hide the block entirely (the
      // card keeps its normal Stripe/mailto behaviour). Loud, not silent.
      console.error('[crypto-pay] create failed', product, e?.message || e);
      setPhase('unavailable');
    }
  }, [product]);

  // Poll status every 2s while ready; stop on confirmed/expired/unmount.
  useEffect(() => {
    if (phase !== 'ready' || !session) return;
    let alive = true;
    const tick = async () => {
      if (!alive) return;
      if (Date.now() >= session.expiresAt) {
        if (phaseRef.current === 'ready') setPhase('expired');
        return;
      }
      try {
        const r = await fetch(session.statusUrl);
        const j = (await r.json()) as StatusResponse;
        if (!alive) return;
        if (j.status === 'confirmed') {
          setStatus(j);
          setPhase('confirmed');
        } else if (j.status === 'expired') {
          setPhase('expired');
        } else if (j.status === 'unverifiable') {
          console.error('[crypto-pay] status unverifiable, still polling');
        }
      } catch (e) {
        console.error('[crypto-pay] status poll failed', e);
      }
    };
    const iv = setInterval(tick, 2000);
    tick();
    return () => {
      alive = false;
      clearInterval(iv);
    };
  }, [phase, session]);

  if (phase === 'unavailable') return null;

  const sig = status?.signature || '';
  const dl = (extra?: string) =>
    `/api/crypto-pay/download?product=${encodeURIComponent(session?.product || product)}&sig=${encodeURIComponent(sig)}&t=${encodeURIComponent(status?.downloadToken || '')}${extra || ''}`;

  const reset = () => {
    startedRef.current = false;
    setSession(null);
    setStatus(null);
    setPhase('idle');
    void start();
  };

  return (
    <details
      onToggle={(e) => {
        if ((e.target as HTMLDetailsElement).open && phase === 'idle') void start();
      }}
      style={{
        marginTop: 16,
        border: '1px solid #1d3a4d',
        borderRadius: 10,
        background: '#0a1420',
        padding: '12px 14px',
      }}
    >
      <summary style={{ cursor: 'pointer', color: '#38d6e6', fontWeight: 700, fontSize: 15 }}>
        Prefer crypto? Pay with USDC on Solana
      </summary>

      <div style={{ marginTop: 12, fontSize: 14, lineHeight: 1.55, color: '#cfe4ec' }}>
        {phase === 'creating' && <p style={{ margin: 0, color: '#9bb' }}>Preparing a payment request…</p>}

        {phase === 'ready' && session && (
          <>
            <p style={{ margin: '0 0 10px' }}>
              <strong style={{ color: '#e8f1f5' }}>{session.name}</strong> —{' '}
              <strong style={{ color: '#38d6e6' }}>{session.usd} USDC</strong> on Solana (USDC).
              Scan with your wallet, or open it on your phone:
            </p>
            <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ background: '#fff', padding: 8, borderRadius: 8 }}>
                <QRCodeSVG value={session.solanaUrl} size={112} level="M" />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
                <a
                  href={session.solanaUrl}
                  style={{
                    display: 'inline-block',
                    padding: '10px 18px',
                    borderRadius: 8,
                    background: '#38d6e6',
                    color: '#06223a',
                    fontWeight: 700,
                    textDecoration: 'none',
                    fontSize: 15,
                  }}
                >
                  Open in wallet
                </a>
                <span style={{ color: '#9bb', fontSize: 13 }}>Waiting for payment — checking every 2 seconds.</span>
                <span style={{ color: '#9bb', fontSize: 13 }}>
                  Needs a Solana wallet with USDC (e.g. Phantom). Request expires in 15 minutes.
                </span>
              </div>
            </div>
          </>
        )}

        {phase === 'confirmed' && session && (
          <div>
            <p style={{ margin: '0 0 8px', color: '#7fe3a0', fontWeight: 700 }}>
              Payment confirmed on-chain — {session.usd} USDC received.
            </p>
            {sig && (
              <p style={{ margin: '0 0 12px', color: '#9bb', fontSize: 12 }}>
                Receipt: <code title={sig}>{sig.slice(0, 16)}…</code>
              </p>
            )}
            {session.kind === 'guide' && status?.downloadToken && (
              <a
                href={dl()}
                style={{
                  display: 'inline-block',
                  padding: '12px 22px',
                  borderRadius: 8,
                  background: '#38d6e6',
                  color: '#06223a',
                  fontWeight: 700,
                  textDecoration: 'none',
                }}
              >
                Download your guide (PDF)
              </a>
            )}
            {session.kind === 'bundle' && status?.downloadToken && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-start' }}>
                <span style={{ color: '#9bb' }}>Your four guides:</span>
                {BUNDLE_SLUGS.map((s) => (
                  <a key={s} href={dl(`&item=${s}`)} style={{ color: '#38d6e6' }}>
                    {s.replace(/-/g, ' ')} — download PDF
                  </a>
                ))}
              </div>
            )}
            {session.kind === 'audit' && (
              <p style={{ margin: 0 }}>
                Your payment is recorded. Next step:{' '}
                <a href="/audit/start" style={{ color: '#38d6e6' }}>
                  answer the ten questions
                </a>{' '}
                and your written report follows by email within 24 hours.
              </p>
            )}
            {session.kind === 'build' && (
              <p style={{ margin: 0 }}>
                Payment received — we will be in touch within one working day to kick off.
              </p>
            )}
          </div>
        )}

        {phase === 'expired' && (
          <div>
            <p style={{ margin: '0 0 8px' }}>This payment request expired (15 minutes). No charge was made.</p>
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center' }}>
              <button
                onClick={reset}
                style={{
                  padding: '10px 18px',
                  borderRadius: 8,
                  border: 0,
                  background: '#38d6e6',
                  color: '#06223a',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontSize: 14,
                }}
              >
                New QR code
              </button>
              <a href={MAILTO} style={{ color: '#38d6e6', fontSize: 14 }}>
                Or email us to arrange payment
              </a>
            </div>
          </div>
        )}

        <p style={{ margin: '12px 0 0', color: '#9bb', fontSize: 12, lineHeight: 1.5 }}>
          Your wallet shows the exact amount, recipient and network before you approve. On-chain payments are
          final; card payments keep the usual support. Questions:{' '}
          <a href={MAILTO} style={{ color: '#38d6e6' }}>
            tradersbooking@gmail.com
          </a>
        </p>
      </div>
    </details>
  );
}
