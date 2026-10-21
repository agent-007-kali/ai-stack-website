import Stripe from 'stripe';

// Post-checkout page for the £75 AI audit (issue #25). Delivery is not
// instant - the report is written per customer - so this page confirms the
// payment, sets the 24-hour expectation and points at the ten intake
// questions. Best-effort payment check, same as /guide/thanks.
async function paymentConfirmed(id: string): Promise<boolean> {
  const key = (process.env.STRIPE_SECRET_KEY ?? '').trim();
  if (!key || !id.startsWith('cs_')) return false;
  try {
    const stripe = new Stripe(key, { apiVersion: '2026-02-25.clover' });
    const session = await stripe.checkout.sessions.retrieve(id);
    return session.payment_status === 'paid' && session.metadata?.product === 'audit';
  } catch {
    return false;
  }
}

export default async function AuditThanks({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string; intake?: string }>;
}) {
  const { session_id: id = '', intake = '' } = await searchParams;
  const paid = id ? await paymentConfirmed(id) : false;

  const input = {
    display: 'inline-block',
    padding: '14px 28px',
    borderRadius: 8,
    background: '#38d6e6',
    color: '#06223a',
    fontWeight: 700,
    marginTop: 8,
  } as const;

  return (
    <main style={{ maxWidth: 560, margin: '0 auto', padding: '64px 20px', color: '#e8f1f5' }}>
      <h1 style={{ marginTop: 0 }}>Thank you</h1>
      {paid ? (
        <p style={{ color: '#38d6e6', fontWeight: 700 }}>Your £75 payment is confirmed.</p>
      ) : id ? (
        <p>Your payment is being confirmed by Stripe. If your card was charged, you are all set.</p>
      ) : (
        <p>Payment received.</p>
      )}

      {intake === '1' ? (
        <>
          <p style={{ marginTop: 20 }}>
            Your answers are in. I read them alongside your website, write the report and email it to you
            within 24 hours.
          </p>
          <p>Nothing more to do - just watch your inbox. — Jarvis</p>
        </>
      ) : (
        <>
          <p style={{ marginTop: 20 }}>
            Your intake questions are below - your report lands within 24 hours of your answers. Ten
            questions, about five minutes.
          </p>
          <a href="/audit/start" style={input}>Answer the ten questions</a>
          <p style={{ marginTop: 24, color: '#9bb' }}>
            The report is written from your answers and your website, so the more honest the answers, the
            more useful the plan. — Jarvis
          </p>
        </>
      )}

      <div
        style={{
          marginTop: 36,
          padding: '18px 22px',
          borderRadius: 12,
          background: '#0d2a3d',
          border: '1px solid #1d3a4d',
          textAlign: 'center',
        }}
      >
        <p style={{ margin: 0, color: '#e8f1f5' }}>
          Your plan is on its way. Want the wins built for you?
        </p>
        <a
          href="/build"
          style={{
            display: 'inline-block',
            marginTop: 12,
            padding: '13px 26px',
            borderRadius: 8,
            background: '#38d6e6',
            color: '#06223a',
            fontWeight: 700,
            textDecoration: 'none',
          }}
        >
          See the build options
        </a>
      </div>
    </main>
  );
}
