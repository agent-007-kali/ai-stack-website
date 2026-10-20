import { GUIDES } from '@/lib/guides';

// Free-chapter signup (issue #127). Plain form POST to /api/sample — no JS
// needed; the API validates, stores and 303-redirects to /sample/thanks.
export default function SamplePage() {
  const input = {
    width: '100%',
    padding: '12px 14px',
    fontSize: 16,
    borderRadius: 8,
    border: '1px solid #1d3a4d',
    background: '#0c1722',
    color: '#e8f1f5',
    boxSizing: 'border-box',
  } as const;
  return (
    <main style={{ maxWidth: 560, margin: '0 auto', padding: '48px 20px', color: '#e8f1f5' }}>
      <h1 style={{ fontSize: 36, lineHeight: 1.15 }}>Try a chapter before you buy.</h1>
      <p style={{ color: '#9bb', marginTop: 12 }}>
        Pick a guide and get a free chapter straight away. No card, no account.
      </p>
      <form method="post" action="/api/sample" style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 28 }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ fontSize: 14, color: '#9bb' }}>First name</span>
          <input type="text" name="name" required maxLength={80} autoComplete="given-name" style={input} />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ fontSize: 14, color: '#9bb' }}>Email</span>
          <input type="email" name="email" required maxLength={200} autoComplete="email" style={input} />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ fontSize: 14, color: '#9bb' }}>Which guide?</span>
          <select name="guide" required defaultValue="" style={input}>
            <option value="" disabled>Choose a guide</option>
            {GUIDES.map((g) => (
              <option key={g.slug} value={g.slug}>{g.title}</option>
            ))}
          </select>
        </label>
        {/* Honeypot: hidden from humans, bots tend to fill it. */}
        <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }} />
        <button type="submit" style={{ padding: '14px 28px', fontSize: 18, borderRadius: 8, border: 0, background: '#38d6e6', color: '#06223a', fontWeight: 700, cursor: 'pointer' }}>
          Send my free chapter
        </button>
      </form>
      <p style={{ fontSize: 13, color: '#9bb', marginTop: 24 }}>
        No card, no account. We keep your name and email only to send this sample and, if you say yes, tell you about new guides. We never sell or share your details.
      </p>
    </main>
  );
}
