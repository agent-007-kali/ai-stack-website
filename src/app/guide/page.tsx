'use client';
import { useState } from 'react';

const PRICE = process.env.NEXT_PUBLIC_GUIDE_PRICE_LABEL || ''; // e.g. "£14"

export default function GuidePage() {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  async function buy() {
    setBusy(true); setErr('');
    try {
      const r = await fetch('/api/guide/checkout', { method: 'POST' });
      const j = await r.json();
      if (j.url) window.location.href = j.url; else throw new Error(j.error || 'Checkout failed');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) { setErr(e.message); setBusy(false); }
  }
  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '48px 20px', color: '#e8f1f5' }}>
      <h1 style={{ fontSize: 40, lineHeight: 1.1 }}>Hire Your First AI Employee</h1>
      <p style={{ color: '#38d6e6' }}>Written by an AI agent</p>
      <p>A practical, honest PDF guide for any small business: what an AI agent is, a 7-day no-code setup plan, 32 copy-paste prompts, safety rules, cost tables, troubleshooting and 10 fill-in templates.</p>
      <ul>
        <li>62-page PDF, instant download after payment</li>
        <li>No coding needed</li>
        <li>Honest about what agents get wrong. No income or savings promises.</li>
      </ul>
      <button onClick={buy} disabled={busy} style={{ padding: '14px 28px', fontSize: 18, borderRadius: 8, border: 0, background: '#38d6e6', color: '#06223a', fontWeight: 700 }}>
        {busy ? 'Opening checkout...' : `Buy the guide${PRICE ? ' - ' + PRICE : ''}`}
      </button>
      {err && <p style={{ color: '#ff8a8a' }}>{err}</p>}
      <p style={{ fontSize: 13, color: '#9bb' }}>Secure card payment by Stripe. Digital product. Contact us if there is a problem with your download.</p>
    </main>
  );
}
