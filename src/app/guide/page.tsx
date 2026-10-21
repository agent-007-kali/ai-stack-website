'use client';
import { useState } from 'react';
import { BUNDLE, GUIDES, priceLabel } from '@/lib/guides';
import { withUsd } from '@/lib/usd';
import CryptoPay from '@/components/CryptoPay';

const SAMPLE_MAILTO =
  'mailto:tradersbooking@gmail.com?subject=Sample%20chapter%20request&body=Hi%2C%20please%20send%20me%20a%20free%20sample%20chapter.%20Guide%20I%27d%20like%3A%20';

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
  const products = [BUNDLE, ...GUIDES];
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
      {process.env.NEXT_PUBLIC_SAMPLE_ENABLED === 'true' && (
        <p style={{ marginTop: 12 }}>
          <a href="/sample" style={{ color: '#38d6e6' }}>Not sure which one? Try a free chapter</a>
        </p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24, marginTop: 32 }}>
        {products.map((g) => {
          const label = withUsd(priceLabel(g));
          return (
            <section
              key={g.slug}
              style={{ border: '1px solid #1d3a4d', borderRadius: 12, padding: '24px 24px 28px', background: '#0c1722' }}
            >
              <div className="guide-card-row">
                {g.cover && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={g.cover}
                    width={g.coverWidth}
                    height={g.coverHeight}
                    loading="lazy"
                    alt={`${g.title} cover`}
                    className="guide-cover"
                  />
                )}
                <div className="guide-card-body">
                  <h2 style={{ fontSize: 26, lineHeight: 1.2, margin: 0 }}>{g.title}</h2>
                  <p style={{ color: '#38d6e6', margin: '8px 0 12px' }}>Written by an AI agent</p>
                  <p style={{ margin: '0 0 12px' }}>{withUsd(g.description)}</p>
                  <ul style={{ margin: '0 0 18px', paddingLeft: 20 }}>
                    {g.bullets.map((b) => <li key={b} style={{ marginBottom: 6 }}>{b}</li>)}
                  </ul>
                  {label ? (
                    <>
                      <button
                        onClick={() => buy(g.slug)}
                        disabled={busy === g.slug}
                        style={{ padding: '14px 28px', fontSize: 18, borderRadius: 8, border: 0, background: '#38d6e6', color: '#06223a', fontWeight: 700 }}
                      >
                        {busy === g.slug ? 'Opening checkout...' : `Buy now${label ? ' - ' + label : ''}`}
                      </button>
                      <CryptoPay />
                    </>
                  ) : (
                    <a href={SAMPLE_MAILTO} style={{ display: 'inline-block', padding: '14px 28px', fontSize: 18, borderRadius: 8, border: '1px solid #38d6e6', color: '#38d6e6', fontWeight: 700, textDecoration: 'none' }}>
                      Request a free sample chapter
                    </a>
                  )}
                </div>
              </div>
            </section>
          );
        })}
      </div>

      {err && <p style={{ color: '#ff8a8a' }}>{err}</p>}
      <p style={{ fontSize: 13, color: '#9bb', marginTop: 28 }}>Secure card payment by Stripe. Digital product. Contact us if there is a problem with your download.</p>

      <a
        href="/audit"
        style={{
          display: 'block',
          marginTop: 28,
          padding: '16px 22px',
          borderRadius: 12,
          background: '#0d2a3d',
          border: '1px solid #1d3a4d',
          color: '#e8f1f5',
          textAlign: 'center',
          fontSize: 17,
          textDecoration: 'none',
        }}
      >
        Want it done for you? <strong style={{ color: '#38d6e6' }}>{withUsd('The £75 AI Audit.')}</strong>
      </a>
    </main>
  );
}
