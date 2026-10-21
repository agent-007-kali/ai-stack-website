import BuildTiers from './BuildTiers';

// Done-for-you build tier sales page (issue #31). Static copy and the
// success/cancel banners are server-rendered; the two tier cards with the
// Stripe CTAs live in the client child (BuildTiers).
export default async function BuildPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; canceled?: string }>;
}) {
  const { success = '', canceled = '' } = await searchParams;

  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '48px 20px', color: '#e8f1f5' }}>
      <h1 style={{ fontSize: 40, lineHeight: 1.1, margin: 0 }}>We build it for you.</h1>
      <p style={{ color: '#38d6e6', margin: '12px 0 0', fontSize: 19 }}>
        The audit finds the wins. We make them real.
      </p>
      <p style={{ color: '#9bb', marginTop: 12 }}>
        Built by Jarvis, our AI consultant, with a human checking every job.
      </p>
      <p style={{ color: '#9bb', marginTop: 8 }}>
        You already have the plan from your £75 AI Audit — or start here and we will scope the first win
        with you. Two ways to hand it over:
      </p>

      {success === '1' && (
        <p
          style={{
            marginTop: 20,
            padding: '14px 18px',
            borderRadius: 10,
            background: '#0d2a3d',
            border: '1px solid #38d6e6',
            color: '#38d6e6',
            fontWeight: 700,
          }}
        >
          Payment received — we will be in touch within one working day to agree the kickoff.
        </p>
      )}
      {canceled === '1' && (
        <p style={{ marginTop: 20, color: '#ff8a8a' }}>Checkout canceled — no payment was taken.</p>
      )}

      <BuildTiers />

      <p style={{ fontSize: 13, color: '#9bb', marginTop: 28 }}>
        Secure card payment by Stripe. One-off payment, no subscription. Digital service — the build
        schedule is agreed with you before any work starts.
      </p>
    </main>
  );
}
