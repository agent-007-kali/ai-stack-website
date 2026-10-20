'use client';
import { useState } from 'react';
import { GUIDES, priceLabel } from '@/lib/guides';

export default function GuidePage() {
  const [busy, setBusy] = useState('');
  const [err, setErr] = useState('');
  async function buy(slug: string) {
    setBusy(slug); setErr('');
    try {
      const r = await fetch('/api/guide/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product: slug }),
      });
      const j = await r.json();
      if (j.url) window.location.href = j.url; else throw new Error(j.error || 'Checkout failed');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) { setErr(e.message); setBusy(''); }
  }
  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '48px 20px', color: '#e8f1f5' }}>
      <style>{`
        .guide-card-row { display: flex; flex-direction: column; align-items: center; }
        .guide-cover { width: 220px; max-width: 100%; height: auto; border-radius: 8px; display: block; }
        .guide-card-body { width: 100%; min-width: 0; }
        @media (min-width: 721px) {
          .guide-card-row { flex-direction: row; align-items: flex-start; gap: 24px; }
          .guide-cover { width: 200px; flex: 0 0 200px; }
          .guide-card-body { flex: 1; }
        }
      `}</style>
      <h1 style={{ fontSize: 40, lineHeight: 1.1 }}>Guides for small businesses</h1>
      <p style={{ color: '#9bb', marginTop: 12 }}>
        Honest, practical PDF guides written by an AI agent — pick one below, pay by card, download instantly.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24, marginTop: 32 }}>
        {GUIDES.map((g) => {
          const label = priceLabel(g);
          return (
            <section
              key={g.slug}
              style={{ border: '1px solid #1d3a4d', borderRadius: 12, padding: '24px 24px 28px', background: '#0c1722' }}
            >
              <div className="guide-card-row">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={g.cover}
                  width={g.coverWidth}
                  height={g.coverHeight}
                  loading="lazy"
                  alt={`${g.title} cover`}
                  className="guide-cover"
                />
                <div className="guide-card-body">
                  <h2 style={{ fontSize: 26, lineHeight: 1.2, margin: 0 }}>{g.title}</h2>
                  <p style={{ color: '#38d6e6', margin: '8px 0 12px' }}>Written by an AI agent</p>
                  <p style={{ margin: '0 0 12px' }}>{g.description}</p>
                  <ul style={{ margin: '0 0 18px', paddingLeft: 20 }}>
                    {g.bullets.map((b) => <li key={b} style={{ marginBottom: 6 }}>{b}</li>)}
                  </ul>
                  <button
                    onClick={() => buy(g.slug)}
                    disabled={busy === g.slug}
                    style={{ padding: '14px 28px', fontSize: 18, borderRadius: 8, border: 0, background: '#38d6e6', color: '#06223a', fontWeight: 700 }}
                  >
                    {busy === g.slug ? 'Opening checkout...' : `Buy now${label ? ' - ' + label : ''}`}
                  </button>
                </div>
              </div>
            </section>
          );
        })}
      </div>

      {err && <p style={{ color: '#ff8a8a' }}>{err}</p>}
      <p style={{ fontSize: 13, color: '#9bb', marginTop: 28 }}>Secure card payment by Stripe. Digital product. Contact us if there is a problem with your download.</p>
    </main>
  );
}
