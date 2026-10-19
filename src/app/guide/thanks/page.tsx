export default async function Thanks({ searchParams }: { searchParams: Promise<{ session_id?: string }> }) {
  const { session_id: id = '' } = await searchParams;
  return (
    <main style={{ maxWidth: 560, margin: '0 auto', padding: '64px 20px', color: '#e8f1f5' }}>
      <h1>Thank you</h1>
      <p>Your payment is confirmed. Download your guide below. The link only works with your paid checkout session; keep this page open until it has downloaded.</p>
      {id ? <a href={`/api/guide/download?session_id=${encodeURIComponent(id)}`} style={{ display: 'inline-block', padding: '14px 28px', borderRadius: 8, background: '#38d6e6', color: '#06223a', fontWeight: 700 }}>Download the PDF</a> : <p>Missing session. Use the link from your payment.</p>}
    </main>
  );
}
