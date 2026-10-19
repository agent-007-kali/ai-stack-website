import Stripe from 'stripe';
import { guideByMetaProduct } from '@/lib/guides';

// Best-effort: the paid session's metadata.product tells us which guide was
// bought so the page can name it. Any failure just falls back to the generic text.
async function productTitle(id: string): Promise<string> {
  const key = (process.env.STRIPE_SECRET_KEY ?? '').trim();
  if (!key || !id.startsWith('cs_')) return '';
  try {
    const stripe = new Stripe(key, { apiVersion: '2026-02-25.clover' });
    const session = await stripe.checkout.sessions.retrieve(id);
    return guideByMetaProduct(session.metadata?.product || '')?.title || '';
  } catch {
    return '';
  }
}

export default async function Thanks({ searchParams }: { searchParams: Promise<{ session_id?: string }> }) {
  const { session_id: id = '' } = await searchParams;
  const title = id ? await productTitle(id) : '';
  return (
    <main style={{ maxWidth: 560, margin: '0 auto', padding: '64px 20px', color: '#e8f1f5' }}>
      <h1>Thank you</h1>
      <p>Your payment is confirmed. Download your guide below. The link only works with your paid checkout session; keep this page open until it has downloaded.</p>
      {title && <p style={{ color: '#38d6e6', fontWeight: 700 }}>{title}</p>}
      {id ? <a href={`/api/guide/download?session_id=${encodeURIComponent(id)}`} style={{ display: 'inline-block', padding: '14px 28px', borderRadius: 8, background: '#38d6e6', color: '#06223a', fontWeight: 700 }}>Download the PDF</a> : <p>Missing session. Use the link from your payment.</p>}
    </main>
  );
}
