import type { Metadata } from 'next';
import { withUsd } from '@/lib/usd';
import { CLUB_FAQ, CLUB_TIERS } from '@/lib/club';

// AI Money Club membership page (issue #52). Two Whop-linked tiers, honest
// framing: no income promises, no fake scarcity, "written by an AI agent"
// said out loud. Static page - server component with inline styles in the
// house dark palette (same visual language as the audit page).
export const metadata: Metadata = {
  title: 'AI Money Club',
  description:
    'A membership for people learning to make money with AI: a Monday idea, a Wednesday tool, a Friday honest market note, and a community chat hosted by Jarvis, our AI. Free tier and £12/month, cancel anytime.',
  openGraph: {
    title: 'AI Money Club',
    description:
      'Monday idea, Wednesday tool, Friday honest market note, plus a community chat hosted by Jarvis, our AI. Free tier and £12/month - cancel anytime.',
    type: 'website',
    url: 'https://ai-solutions.company/club',
    siteName: 'AI Solutions',
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: 'AI Solutions - we make your business agent-ready',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI Money Club',
    description:
      'Monday idea, Wednesday tool, Friday honest market note, plus a community chat hosted by Jarvis, our AI. Free tier and £12/month - cancel anytime.',
  },
};

const card = { border: '1px solid #1d3a4d', borderRadius: 12, padding: '24px 24px 28px', background: '#0c1722' } as const;
const h2 = { fontSize: 22, lineHeight: 1.2, margin: '0 0 12px' } as const;

export default function ClubPage() {
  return (
    <main style={{ maxWidth: 780, margin: '0 auto', padding: '48px 20px', color: '#e8f1f5' }}>
      <h1 style={{ fontSize: 40, lineHeight: 1.1, margin: 0 }}>
        The AI Money Club.
        <br />
        <span style={{ color: '#38d6e6' }}>One idea. One tool. One honest note.</span>
      </h1>
      <p style={{ color: '#9bb', marginTop: 16, lineHeight: 1.55 }}>
        A membership for people learning to make money with AI. Every Monday an idea, every Wednesday a
        tool, every Friday an honest market note - plus a community chat hosted by Jarvis, our AI, with
        Neo (the founder) in the room. Written by an AI agent, published by AI Solutions.
      </p>
      <p style={{ color: '#9bb', marginTop: 10, lineHeight: 1.55 }}>
        Straight offer, no tricks: this is content and community. No income promises, no fake
        scarcity - what members receive is listed below, exactly.
      </p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 18,
          marginTop: 28,
        }}
      >
        {CLUB_TIERS.map((t) => (
          <section key={t.id} style={{ ...card, display: 'flex', flexDirection: 'column' }}>
            <span style={{ color: '#38d6e6', fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>
              {t.name}
            </span>
            <h2 style={{ ...h2, marginTop: 8, fontSize: 28 }}>
              {t.id === 'monthly' ? withUsd('£12') : t.price}
              {t.id === 'monthly' && <span style={{ fontSize: 16, color: '#9bb' }}>/month</span>}
            </h2>
            <span style={{ color: '#9bb', fontSize: 13 }}>{t.priceNote}</span>
            <p style={{ color: '#c3cfe6', fontSize: 15, lineHeight: 1.55, margin: '12px 0 0' }}>{t.blurb}</p>
            <ul style={{ margin: '14px 0 20px', paddingLeft: 20, lineHeight: 1.6, fontSize: 15, flexGrow: 1 }}>
              {t.benefits.map((b) => (
                <li key={b} style={{ marginBottom: 6 }}>
                  {b}
                </li>
              ))}
            </ul>
            <a
              href={t.href}
              target="_blank"
              rel="noreferrer"
              style={{
                display: 'inline-block',
                padding: '14px 24px',
                borderRadius: 8,
                background: t.id === 'monthly' ? '#38d6e6' : 'transparent',
                color: t.id === 'monthly' ? '#06223a' : '#38d6e6',
                border: t.id === 'monthly' ? '0' : '1px solid #38d6e6',
                fontWeight: 700,
                fontSize: 16,
                textAlign: 'center',
                textDecoration: 'none',
              }}
            >
              {t.cta} - opens Whop ↗
            </a>
          </section>
        ))}
      </div>

      <section style={{ ...card, marginTop: 28 }}>
        <h2 style={h2}>Honest details</h2>
        <ul style={{ margin: 0, paddingLeft: 20, lineHeight: 1.6 }}>
          <li>Payments, membership and cancellation are handled through Whop.</li>
          <li>£12/month, cancel anytime - access runs to the end of the paid period.</li>
          <li>The free tier is genuinely free and needs no card.</li>
          <li>Everything is written by an AI agent, checked and published by AI Solutions.</li>
          <li>No income promises: members receive ideas, tools, notes, chat and guides - results are yours, not ours.</li>
        </ul>
      </section>

      <section style={{ ...card, marginTop: 18 }}>
        <h2 style={h2}>Questions</h2>
        {CLUB_FAQ.map((f) => (
          <div key={f.q} style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: 16, margin: '0 0 6px', color: '#38d6e6' }}>{f.q}</h3>
            <p style={{ margin: 0, color: '#c3cfe6', fontSize: 15, lineHeight: 1.6 }}>{f.a}</p>
          </div>
        ))}
        <p style={{ margin: 0, color: '#9bb', fontSize: 13 }}>
          Join through Whop: <a href={CLUB_TIERS[1].href} target="_blank" rel="noreferrer" style={{ color: '#38d6e6' }}>£12/month club</a>{' '}
          or <a href={CLUB_TIERS[0].href} target="_blank" rel="noreferrer" style={{ color: '#38d6e6' }}>free tier</a>.
        </p>
      </section>
    </main>
  );
}
