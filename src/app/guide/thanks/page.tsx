import Stripe from 'stripe';
import { BUNDLE, GUIDES, guideByMetaProduct } from '@/lib/guides';

type Purchased = { title: string; items: { slug: string; title: string }[] };

// Best-effort: the paid session's metadata.product tells us what was bought.
// A bundle session fans out to one download link per guide (issue #127).
// Any failure just falls back to the generic text.
async function purchased(id: string): Promise<Purchased> {
  const key = (process.env.STRIPE_SECRET_KEY ?? '').trim();
  if (!key || !id.startsWith('cs_')) return { title: '', items: [] };
  try {
    const stripe = new Stripe(key, { apiVersion: '2026-02-25.clover' });
    const session = await stripe.checkout.sessions.retrieve(id);
    const meta = session.metadata?.product || '';
    if (meta === BUNDLE.metaProduct) {
      return { title: BUNDLE.title, items: GUIDES.map((g) => ({ slug: g.slug, title: g.title })) };
    }
    const guide = guideByMetaProduct(meta);
    return guide ? { title: guide.title, items: [] } : { title: '', items: [] };
  } catch {
    return { title: '', items: [] };
  }
}

export default async function Thanks({ searchParams }: { searchParams: Promise<{ session_id?: string }> }) {
  const { session_id: id = '' } = await searchParams;
  const { title, items } = id ? await purchased(id) : { title: '', items: [] };
  const bundle = items.length > 0;
  return (
    <main style={{ maxWidth: 560, margin: '0 auto', padding: '64px 20px', color: '#e8f1f5' }}>
      <h1>Thank you</h1>
      <p>Your payment is confirmed. Download your guide below. The link only works with your paid checkout session; keep this page open until it has downloaded.</p>
      {title && <p style={{ color: '#38d6e6', fontWeight: 700 }}>{title}</p>}
      {!id && <p>Missing session. Use the link from your payment.</p>}
      {id && !bundle && (
        <a href={`/api/guide/download?session_id=${encodeURIComponent(id)}`} style={{ display: 'inline-block', padding: '14px 28px', borderRadius: 8, background: '#38d6e6', color: '#06223a', fontWeight: 700 }}>Download the PDF</a>
      )}
      {id && bundle && (
        <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {items.map((g) => (
            <li key={g.slug}>
              <a href={`/api/guide/download?session_id=${encodeURIComponent(id)}&item=${encodeURIComponent(g.slug)}`} style={{ display: 'inline-block', padding: '14px 28px', borderRadius: 8, background: '#38d6e6', color: '#06223a', fontWeight: 700 }}>Download: {g.title}</a>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
