'use client';
import { useState } from 'react';
import { withUsd } from '@/lib/usd';

// Offer page for the £75 one-hour AI audit (issue #25). House style: dark
// page, inline styles, no income claims. Copy is fixed by the issue spec -
// "written by an AI" is part of the pitch, keep it.
export default function AuditPage() {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const canceled = typeof window !== 'undefined' && window.location.search.includes('canceled=1');

  async function buy() {
    setBusy(true); setErr('');
    try {
      const r = await fetch('/api/audit-checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' } });
      const j = await r.json();
      if (j.url) window.location.href = j.url; else throw new Error(j.error || 'Checkout failed');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) { setErr(e.message); setBusy(false); }
  }

  const card = { border: '1px solid #1d3a4d', borderRadius: 12, padding: '24px 24px 28px', background: '#0c1722' } as const;
  const h2 = { fontSize: 22, lineHeight: 1.2, margin: '0 0 12px' } as const;
  const btn = {
    padding: '14px 28px', fontSize: 18, borderRadius: 8, border: 0,
    background: '#38d6e6', color: '#06223a', fontWeight: 700, cursor: 'pointer',
  } as const;

  const faq = [
    { q: 'Is this a call?', a: 'No. Everything is written. No calls, no meetings.' },
    { q: 'Who does the audit?', a: 'Jarvis, the AI consultant at AI Solutions. Yes, an AI - that is why it costs £75 and not £750.' },
    { q: 'What if the report is generic?', a: 'Every report is written from your answers and your website, and cites both.' },
  ];

  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '48px 20px', color: '#e8f1f5' }}>
      <h1 style={{ fontSize: 40, lineHeight: 1.1, margin: 0 }}>
        The {withUsd('£75 AI Audit')}.
        <br />
        <span style={{ color: '#38d6e6' }}>One hour. A written plan for your business.</span>
      </h1>
      <p style={{ color: '#9bb', marginTop: 16, lineHeight: 1.55 }}>
        You answer ten questions. I spend one hour inside your answers and your website. You get a short
        written report: what to automate first, what to ignore, and the exact tools to use. Written by an
        AI, checked against your real business.
      </p>

      <section style={{ ...card, marginTop: 28 }}>
        <h2 style={h2}>What you get</h2>
        <ul style={{ margin: 0, paddingLeft: 20, lineHeight: 1.6 }}>
          <li>A short written report (PDF by email within 24 hours)</li>
          <li>Your top 3 time-wasters, ranked by hours saved</li>
          <li>The one thing to automate first, with the exact steps</li>
          <li>Which tools fit your business (free tiers where possible)</li>
          <li>What NOT to bother with</li>
        </ul>
      </section>

      <section style={{ ...card, marginTop: 20 }}>
        <h2 style={h2}>How it works</h2>
        <ol style={{ margin: 0, paddingLeft: 20, lineHeight: 1.6 }}>
          <li>{withUsd('Pay £75 (secure checkout by Stripe)')}</li>
          <li>Answer ten questions about your business (5 minutes)</li>
          <li>Get your written report by email within 24 hours</li>
        </ol>
      </section>

      <section style={{ ...card, marginTop: 20 }}>
        <h2 style={h2}>Who it&apos;s for</h2>
        <p style={{ margin: 0, lineHeight: 1.6 }}>
          Small businesses - trades, salons, cafes, accountants, dealers, anyone drowning in admin. No
          technical knowledge needed.
        </p>
      </section>

      <section style={{ ...card, marginTop: 20 }}>
        <h2 style={h2}>FAQ</h2>
        {faq.map((f) => (
          <div key={f.q} style={{ marginBottom: 14 }}>
            <p style={{ margin: '0 0 4px', fontWeight: 700 }}>{f.q}</p>
            <p style={{ margin: 0, color: '#9bb' }}>{withUsd(f.a)}</p>
          </div>
        ))}
      </section>

      <div style={{ marginTop: 28 }}>
        <button onClick={buy} disabled={busy} style={btn}>
          {busy ? 'Opening checkout...' : 'Buy the audit - ' + withUsd('£75')}
        </button>
        {canceled && (
          <p style={{ color: '#9bb', marginTop: 12 }}>
            Checkout canceled - no charge was made. Start again whenever you are ready.
          </p>
        )}
        {err && <p style={{ color: '#ff8a8a', marginTop: 12 }}>{err}</p>}
        <p style={{ fontSize: 13, color: '#9bb', marginTop: 16 }}>
          Secure card payment by Stripe. One-off {withUsd('£75.00 GBP')}. Your written report arrives by email
          within 24 hours of your intake answers.
        </p>
      </div>
    </main>
  );
}
