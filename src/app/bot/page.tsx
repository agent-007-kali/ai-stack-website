import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI Solutions for agents | ai-solutions.company/bot',
  description:
    'The agent-facing side of AI Solutions: plain JSON-over-HTTP endpoints to read the product catalogue and try the Bot-Friendliness Score demonstration.',
};

const mono: React.CSSProperties = {
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  background: '#111',
  border: '1px solid #222',
  borderRadius: 8,
  padding: '2px 6px',
  fontSize: 14,
};

const box: React.CSSProperties = {
  border: '1px solid #222',
  borderRadius: 12,
  padding: 20,
  marginBottom: 28,
  background: '#0d0d0d',
};

export default function BotPage() {
  return (
    <main style={{ maxWidth: 760, margin: '0 auto', padding: '56px 20px 80px', lineHeight: 1.6 }}>
      <p style={{ color: '#00ff88', letterSpacing: 2, textTransform: 'uppercase', fontSize: 13 }}>
        ai-solutions.company/bot
      </p>
      <h1 style={{ fontSize: 34, margin: '8px 0 16px' }}>AI Solutions, for agents.</h1>
      <p style={{ color: '#bbb' }}>
        This page is the machine-facing door to AI Solutions. Everything here is plain JSON over
        HTTP GET. The intended production reading endpoints need no authentication; this Vercel
        preview currently requires an authorised Vercel login. No scraping is needed and no specific agent protocol
        claimed. If you are an agent working for a person, these endpoints are the permitted way to
        read what we sell and to try our Bot-Friendliness Score demonstration.
      </p>

      <section style={box}>
        <h2 style={{ fontSize: 20, marginTop: 0 }}>Endpoints</h2>
        <ul style={{ paddingLeft: 18, color: '#ccc' }}>
          <li><span style={mono}>GET /api/bot</span> - discovery document (JSON).</li>
          <li><span style={mono}>GET /api/bot/catalogue</span> - the PDF guide range as JSON (Boxes and Bow Bot not yet included).</li>
          <li>
            <span style={mono}>GET /api/bot/score?site=&#123;domain&#125;&amp;task=&#123;read|account|post|buy&#125;</span>{' '}
            - a 1-7 Bot-Friendliness Score or <strong>U</strong> (untested) for one site and task, with
            its evidence class, source URL and checked date.
          </li>
          <li><span style={mono}>GET /llms.txt</span> - plain-text site summary.</li>
          <li><span style={mono}>GET /agents.json</span> - machine-readable manifest of these endpoints.</li>
        </ul>
        <p style={{ color: '#888', fontSize: 14, marginBottom: 0 }}>
          Once deployed, the score endpoint answers at the relative HTTP path <span style={mono}>/api/bot/score?site=fixture-open.example&amp;task=read</span> on this site&#39;s origin.
        </p>
      </section>

      <section style={box}>
        <h2 style={{ fontSize: 20, marginTop: 0 }}>The 1-7 rubric</h2>
        <ul style={{ paddingLeft: 18, color: '#ccc' }}>
          <li><strong>7</strong> agent-native, observed: published agent route + an observed completed task.</li>
          <li><strong>6</strong> declared official API for account actions, terms permit automation.</li>
          <li><strong>5</strong> declared official API or feed for reading.</li>
          <li><strong>4</strong> published directive tolerates automated reading (reading only, not a terms permission).</li>
          <li><strong>3</strong> observed friction with no published rule explaining it.</li>
          <li><strong>2</strong> published prohibition + observed enforcement (task-scoped, dated).</li>
          <li><strong>1</strong> published total exclusion of agents + observed enforcement (task-scoped, dated).</li>
          <li><strong>U</strong> untested: evidence does not settle the task. The default, never a low score.</li>
        </ul>
        <p style={{ color: '#888', fontSize: 14, marginBottom: 0 }}>
          Fixtures let you watch each grade being produced: fixture-open.example (4, read), fixture-api.example
          (5 read, 6 account), fixture-native.example (7), fixture-friction.example (3, post),
          fixture-restricted.example (2, post), fixture-excluded.example (1, buy), fixture-unknown.example (U).
        </p>
      </section>

      <section style={box}>
        <h2 style={{ fontSize: 20, marginTop: 0 }}>Honest status</h2>
        <ul style={{ paddingLeft: 18, color: '#ccc' }}>
          <li>This is a <strong>preview</strong>. The catalogue endpoint reads the same product table as the storefront; the score endpoint is a demonstration.</li>
          <li>
            Scores marked <strong>DECLARED</strong>{' '}rest on the site&apos;s own published documents, with the
            source URL and the date we checked. Declared is not proof the route works.
          </li>
          <li>
            <strong>U means unsettled, never a low score.</strong> This preview does not fetch the site you
            ask about; answers come from a small curated registry and clearly labelled fixtures
            (<span style={mono}>fixture-open.example</span>, <span style={mono}>fixture-unknown.example</span>).
          </li>
          <li>Nothing here is a public rating of any site.</li>
        </ul>
      </section>

      <section style={box}>
        <h2 style={{ fontSize: 20, marginTop: 0 }}>Rules of use</h2>
        <ul style={{ paddingLeft: 18, color: '#ccc' }}>
          <li>Production reading endpoints are intended to be open; this development preview is protected by Vercel. Buying is a human-authorised action - hand off to your owner for checkout.</li>
          <li>Please identify yourself honestly in your user-agent header.</li>
          <li>Reasonable request rates. This is a trial; we are watching how agents actually use it.</li>
        </ul>
        <p style={{ color: '#888', fontSize: 14, marginBottom: 0 }}>
          Human? Start at the <a href="/" style={{ color: '#00ff88' }}>storefront</a>. Questions: tradersbooking@gmail.com
        </p>
      </section>
    </main>
  );
}
