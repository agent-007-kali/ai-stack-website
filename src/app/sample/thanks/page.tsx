// Landing page after a successful free-chapter signup (issue #127). The
// download link is HMAC-signed and expires in 7 days. If the sample PDF is
// not in the private Blob store yet the API answers 404 — the page still
// reads fine and the link works once the chapter exists.

export default async function SampleThanks({
  searchParams,
}: {
  searchParams: Promise<{ guide?: string; t?: string }>;
}) {
  const { guide = '', t = '' } = await searchParams;
  const href = guide && t
    ? `/api/sample/download?guide=${encodeURIComponent(guide)}&t=${encodeURIComponent(t)}`
    : '';
  return (
    <main style={{ maxWidth: 560, margin: '0 auto', padding: '64px 20px', color: '#e8f1f5' }}>
      <h1>Done. Here is your sample.</h1>
      {href ? (
        <>
          <a href={href} style={{ display: 'inline-block', marginTop: 20, padding: '14px 28px', borderRadius: 8, background: '#38d6e6', color: '#06223a', fontWeight: 700 }}>
            Download my free chapter
          </a>
          <p style={{ fontSize: 13, color: '#9bb', marginTop: 16 }}>
            Your sample chapter is on its way. The link is yours for 7 days and will work once the chapter is ready.
          </p>
        </>
      ) : (
        <p style={{ color: '#9bb', marginTop: 16 }}>Your sample chapter is on its way. Check the link from your signup.</p>
      )}
    </main>
  );
}
