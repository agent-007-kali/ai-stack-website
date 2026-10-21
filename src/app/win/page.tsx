'use client';
import { useState } from 'react';

type Win = { title: string; explain: string };
type CheckResult = { wins: Win[]; teaser: string; unreadable: boolean };

// Free "3 best AI wins" checker (issue #32). Form posts to /api/win;
// results render as three win cards plus the /audit CTA band. The page never
// 500s on the client: unreachable sites come back with the fallback wins.
export default function WinPage() {
  const [url, setUrl] = useState('');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [result, setResult] = useState<CheckResult | null>(null);

  async function check(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr('');
    setResult(null);
    try {
      const r = await fetch('/api/win', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, email }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'The checker failed — please try again.');
      setResult(j as CheckResult);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  const input = {
    width: '100%',
    boxSizing: 'border-box' as const,
    padding: '13px 14px',
    fontSize: 16,
    borderRadius: 8,
    border: '1px solid #1d3a4d',
    background: '#0c1722',
    color: '#e8f1f5',
  };

  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '48px 20px', color: '#e8f1f5' }}>
      <h1 style={{ fontSize: 40, lineHeight: 1.1, margin: 0 }}>Find your 3 best AI wins</h1>
      <p style={{ color: '#38d6e6', margin: '12px 0 0', fontSize: 19 }}>
        Paste your website. Get the three changes most likely to bring in more work.
      </p>
      <p style={{ color: '#9bb', marginTop: 12 }}>Checked by Jarvis, our AI consultant.</p>

      <form onSubmit={check} style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 28 }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 15, color: '#c3cfe6' }}>
          Your website address
          <input
            style={input}
            type="text"
            inputMode="url"
            placeholder="example.co.uk"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            required
            maxLength={500}
          />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 15, color: '#c3cfe6' }}>
          Where do we send the full breakdown?
          <input
            style={input}
            type="email"
            placeholder="you@yourbusiness.co.uk"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            maxLength={200}
          />
        </label>
        <button
          type="submit"
          disabled={busy}
          style={{
            padding: '14px 28px',
            fontSize: 18,
            borderRadius: 8,
            border: 0,
            background: '#38d6e6',
            color: '#06223a',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          {busy ? 'Checking your site...' : 'Show my 3 wins'}
        </button>
      </form>

      <p style={{ fontSize: 13, color: '#9bb', marginTop: 14 }}>
        We email you the breakdown and one follow-up. No spam, unsubscribe any time.
      </p>

      {err && <p style={{ color: '#ff8a8a', marginTop: 20 }}>{err}</p>}

      {result && (
        <div style={{ marginTop: 32 }}>
          {result.unreadable && (
            <p
              style={{
                padding: '14px 18px',
                borderRadius: 10,
                background: '#0d2a3d',
                border: '1px solid #1d3a4d',
                color: '#c3cfe6',
              }}
            >
              We could not read your site this time — so here are three general wins that suit most
              businesses like yours.
            </p>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 16 }}>
            {result.wins.map((w, i) => (
              <section
                key={w.title}
                style={{
                  border: '1px solid #1d3a4d',
                  borderRadius: 12,
                  padding: '20px 22px',
                  background: '#0c1722',
                }}
              >
                <span style={{ color: '#38d6e6', fontWeight: 800, fontSize: 13, letterSpacing: '0.14em' }}>
                  WIN {i + 1}
                </span>
                <h2 style={{ fontSize: 22, lineHeight: 1.25, margin: '8px 0 0' }}>{w.title}</h2>
                <p style={{ color: '#c3cfe6', margin: '10px 0 0', lineHeight: 1.6 }}>{w.explain}</p>
              </section>
            ))}
          </div>
          <p style={{ color: '#38d6e6', marginTop: 18, fontWeight: 700 }}>{result.teaser}</p>
        </div>
      )}

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
        Get the full written plan - GBP 75 — <strong style={{ color: '#38d6e6' }}>The £75 AI Audit</strong>
      </a>
    </main>
  );
}
