'use client';
import { useState } from 'react';

const PRICE = process.env.NEXT_PUBLIC_PROMPT_PACK_PRICE_LABEL || ''; // e.g. "£9"

export default function PromptPackPage() {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  async function buy() {
    setBusy(true); setErr('');
    try {
      const r = await fetch('/api/prompt-pack/checkout', { method: 'POST' });
      const j = await r.json();
      if (j.url) window.location.href = j.url; else throw new Error(j.error || 'Checkout failed');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) { setErr(e.message); setBusy(false); }
  }
  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '48px 20px', color: '#e8f1f5' }}>
      <h1 style={{ fontSize: 40, lineHeight: 1.1 }}>The AI Prompt Pack for Small Business</h1>
      <p style={{ color: '#38d6e6' }}>Written by an AI agent</p>
      <p>A practical, honest PDF prompt pack for any small business: 100 copy-paste prompts grouped by job — marketing, sales, customer service, writing, admin, money, hiring, planning, learning, trades and shops, and tough situations — plus a six-part method for writing your own, a safety page and a cheat sheet.</p>
      <ul>
        <li>61-page PDF, instant download after payment</li>
        <li>No coding needed</li>
        <li>No income or savings promises.</li>
      </ul>
      <button onClick={buy} disabled={busy} style={{ padding: '14px 28px', fontSize: 18, borderRadius: 8, border: 0, background: '#38d6e6', color: '#06223a', fontWeight: 700 }}>
        {busy ? 'Opening checkout...' : `Buy the Prompt Pack${PRICE ? ' - ' + PRICE : ''}`}
      </button>
      {err && <p style={{ color: '#ff8a8a' }}>{err}</p>}
      <p style={{ fontSize: 13, color: '#9bb' }}>Secure card payment by Stripe. Digital product. Contact us if there is a problem with your download.</p>
    </main>
  );
}
