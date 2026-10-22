'use client';
import { useState } from 'react';
import { withUsd } from '@/lib/usd';

// Exact PR #30 fallback: shown instead of a Buy CTA while the tier's price
// label env is unset, so a card can never offer a purchase that would fail.
const SAMPLE_MAILTO =
  'mailto:tradersbooking@gmail.com?subject=Sample%20chapter%20request&body=Hi%2C%20please%20send%20me%20a%20free%20sample%20chapter.%20Guide%20I%27d%20like%3A%20';

type Tier = {
  id: 'setup' | 'build';
  name: string;
  line: string;
  priceLabel: string;
  delivery: string;
  bullets: string[];
};

const TIERS: Tier[] = [
  {
    id: 'setup',
    name: 'Setup',
    line: 'One win, built end to end.',
    priceLabel: (process.env.NEXT_PUBLIC_BUILD_SETUP_PRICE_LABEL || '').trim(),
    delivery: 'Live in 5 working days from kickoff',
    bullets: [
      'One AI win built end-to-end for your business',
      'Your pick: enquiry auto-reply, booking reminders, review replies or quote templates',
      'Handover video so your team can run it',
      'One-off payment, no subscription',
    ],
  },
  {
    id: 'build',
    name: 'Build',
    line: 'Three wins, plus a month of tweaks.',
    priceLabel: (process.env.NEXT_PUBLIC_BUILD_PRICE_LABEL || '').trim(),
    delivery: 'Built in stages — schedule agreed at kickoff',
    bullets: [
      'Three AI wins built and working in your business',
      '30 days of tweaks after launch',
      'The £75 audit price credited against this tier',
      'One-off payment, no subscription',
    ],
  },
];

export default function BuildTiers() {
  const [busy, setBusy] = useState('');
  const [err, setErr] = useState('');
  async function buy(tier: string) {
    setBusy(tier);
    setErr('');
    try {
      const r = await fetch('/api/build/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier }),
      });
      const j = await r.json();
      if (j.url) window.location.href = j.url;
      else throw new Error(j.error || 'Checkout failed');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      setErr(e.message);
      setBusy('');
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, marginTop: 32 }}>
      {TIERS.map((t) => (
        <section
          key={t.id}
          style={{ border: '1px solid #1d3a4d', borderRadius: 12, padding: '24px 24px 28px', background: '#0c1722' }}
        >
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: '6px 16px' }}>
            <h2 style={{ fontSize: 26, lineHeight: 1.2, margin: 0 }}>{t.name}</h2>
            <span style={{ color: '#9bb' }}>{t.line}</span>
          </div>
          <ul style={{ margin: '16px 0 14px', paddingLeft: 20 }}>
            {t.bullets.map((b) => (
              <li key={b} style={{ marginBottom: 6 }}>
                {withUsd(b)}
              </li>
            ))}
          </ul>
          <p style={{ color: '#38d6e6', margin: '0 0 16px' }}>{t.delivery}</p>
          {t.priceLabel ? (
            <button
              onClick={() => buy(t.id)}
              disabled={busy === t.id}
              style={{
                padding: '14px 28px',
                fontSize: 18,
                borderRadius: 8,
                border: 0,
                background: '#38d6e6',
                color: '#06223a',
                fontWeight: 700,
              }}
            >
              {busy === t.id ? 'Opening checkout...' : `Buy now — ${t.name} - ${withUsd(t.priceLabel)}`}
            </button>
          ) : (
            <a
              href={SAMPLE_MAILTO}
              style={{
                display: 'inline-block',
                padding: '14px 28px',
                fontSize: 18,
                borderRadius: 8,
                border: '1px solid #38d6e6',
                color: '#38d6e6',
                fontWeight: 700,
                textDecoration: 'none',
              }}
            >
              Request a free sample chapter
            </a>
          )}
        </section>
      ))}
      {err && <p style={{ color: '#ff8a8a' }}>{err}</p>}
    </div>
  );
}
