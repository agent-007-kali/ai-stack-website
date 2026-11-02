'use client';
import { useState, type FormEvent } from 'react';

export default function RouteFinder() {
  const [job, setJob] = useState('github-file');
  const [result, setResult] = useState<string>('');
  const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy(true); setResult('');
    const data = new FormData(e.currentTarget);
    const params = new URLSearchParams({ job });
    for (const key of (job === 'github-file' ? ['owner', 'repo', 'path', 'ref'] : ['path'])) {
      const value = String(data.get(key) ?? '').trim();
      if (value || key === 'path') params.set(key, value);
    }
    try {
      const response = await fetch('/api/bot/route-finder?' + params);
      setResult(JSON.stringify(await response.json(), null, 2));
    } catch { setResult('Could not reach this preview endpoint. Check your Vercel access and try again.'); }
    finally { setBusy(false); }
  }
  const style = { display: 'block', width: '100%', boxSizing: 'border-box' as const, padding: 10, background: '#151515', color: '#eee', border: '1px solid #555', borderRadius: 6, margin: '6px 0 16px' };
  return <section style={{ border: '1px solid #285a49', borderRadius: 12, padding: 20, marginBottom: 28, background: '#0d1713' }}>
    <h2 style={{ marginTop: 0 }}>Find the official read route</h2>
    <p>Turn a supported job into a ready-to-use API request, with source evidence and limits. This builds the route only. It never visits your target or asks for credentials.</p>
    <form onSubmit={submit}>
      <label htmlFor="route-job">Job</label>
      <select id="route-job" value={job} onChange={e => { setJob(e.target.value); setResult(''); }} style={style}>
        <option value="github-file">Read a public GitHub file or directory</option>
        <option value="govuk-page">Read a GOV.UK page as structured JSON</option>
      </select>
      {job === 'github-file' && <>
        <label htmlFor="route-owner">GitHub owner</label><input id="route-owner" name="owner" defaultValue="octocat" required style={style} />
        <label htmlFor="route-repo">Repository</label><input id="route-repo" name="repo" defaultValue="Hello-World" required style={style} />
      </>}
      <label htmlFor="route-path">{job === 'github-file' ? 'File path (empty for repository root)' : 'GOV.UK page path, beginning with /'}</label>
      <input key={job} id="route-path" name="path" defaultValue={job === 'github-file' ? 'README' : '/vat-rates'} style={style} />
      {job === 'github-file' && <><label htmlFor="route-ref">Branch or commit (optional)</label><input id="route-ref" name="ref" placeholder="Default branch when empty" style={style} /></>}
      <button disabled={busy} type="submit" style={{ padding: '12px 18px', background: '#00ff88', color: '#07110b', border: 0, borderRadius: 6, fontWeight: 700 }}>{busy ? 'Building route...' : 'Build read request'}</button>
    </form>
    <p style={{ color: '#a8b9b0', fontSize: 14 }}>For bots: GET /api/bot/route-finder?job=github-file&amp;owner=octocat&amp;repo=Hello-World&amp;path=README. Or job=govuk-page&amp;path=/vat-rates. Other jobs return an explicit unsupported result, never a guessed route.</p>
    {result && <pre aria-live="polite" style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', background: '#080c0a', padding: 14, borderRadius: 6, fontSize: 13 }}>{result}</pre>}
  </section>;
}
