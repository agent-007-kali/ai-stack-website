// Test-only OpenAI-compatible stub for the Groq-first tier.
//
// The agent does not hold a GROQ_API_KEY (Cesar adds it in the Vercel
// dashboard), so to exercise the tier end to end locally the server is run
// with GROQ_API_KEY=<dummy> and GROQ_API_BASE=http://127.0.0.1:<port>, pointing
// at this stub. It records every request it receives (var/groq-stub/, a
// gitignored runtime log) and replies with a deterministic OpenAI-shaped
// completion that echoes the persona and the number of prior user turns it was
// sent - the marker used to prove per-session history isolation.
//
// Usage: node scripts/groq-stub.mjs <port>

import { createServer } from 'node:http';
import { appendFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

const port = Number(process.argv[2] || 3400);
const logDir = path.join(process.cwd(), 'var', 'groq-stub');

createServer(async (req, res) => {
  if (req.method !== 'POST' || !req.url.endsWith('/chat/completions')) {
    res.writeHead(404).end('not found');
    return;
  }
  let raw = '';
  for await (const chunk of req) raw += chunk;
  let body = {};
  try {
    body = JSON.parse(raw);
  } catch {
    res.writeHead(400).end('bad json');
    return;
  }
  const messages = Array.isArray(body.messages) ? body.messages : [];
  const system = String(messages.find((m) => m?.role === 'system')?.content || '');
  const persona = system.includes('Bow Sales') ? 'Bow Sales Customer Advisor' : 'Bow Bot';
  const priorUserTurns = messages.filter((m) => m?.role === 'user').length - 1;
  const reply = `${persona} here. (ctx=${priorUserTurns}) The site states a 3-day free trial with no card needed.`;

  const record = {
    model: body.model,
    persona,
    priorUserTurns,
    systemHead: system.slice(0, 40),
    hasKeyHeader: Boolean(req.headers.authorization),
    at: new Date().toISOString(),
  };
  console.log(`[stub] ${JSON.stringify(record)}`);
  try {
    await mkdir(logDir, { recursive: true });
    await appendFile(path.join(logDir, 'requests.jsonl'), JSON.stringify(record) + '\n', 'utf8');
  } catch {
    /* best effort */
  }

  res.writeHead(200, { 'content-type': 'application/json' });
  res.end(
    JSON.stringify({
      id: 'stub-' + Date.now(),
      object: 'chat.completion',
      model: body.model,
      choices: [{ index: 0, message: { role: 'assistant', content: reply }, finish_reason: 'stop' }],
    }),
  );
}).listen(port, () => console.log(`[stub] listening on ${port}`));
