// Screenshot the new /audit pages plus the /guide bottom band via Chrome DevTools.
// Usage: node scripts/capture-audit.mjs <baseUrl> <outDir>
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const BASE = process.argv[2] || 'http://127.0.0.1:3187';
const OUT = process.argv[3] || 'evidence/issue-137';
const CHROME = '/usr/bin/google-chrome';
const PORT = 9447;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitFor(label, fn, timeout = 20000) {
  const start = Date.now();
  for (;;) {
    try {
      if (await fn()) return;
    } catch { /* retry */ }
    if (Date.now() - start > timeout) throw new Error(`timeout waiting for ${label}`);
    await sleep(200);
  }
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const chrome = spawn(CHROME, [
    '--headless=new',
    `--remote-debugging-port=${PORT}`,
    '--no-sandbox',
    '--disable-gpu',
    '--hide-scrollbars',
    '--force-device-scale-factor=1',
    'about:blank',
  ], { stdio: ['ignore', 'pipe', 'pipe'] });

  let wsUrl = '';
  await waitFor('devtools', async () => {
    const r = await fetch(`http://127.0.0.1:${PORT}/json/version`);
    const j = await r.json();
    wsUrl = j.webSocketDebuggerUrl;
    return !!wsUrl;
  });

  const ws = new WebSocket(wsUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });

  let msgId = 0;
  const pending = new Map();
  const consoleErrors = [];
  ws.onmessage = (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) {
      const { res, rej } = pending.get(m.id);
      pending.delete(m.id);
      m.error ? rej(new Error(JSON.stringify(m.error))) : res(m.result);
    }
    if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') {
      consoleErrors.push(m.params.args.map((a) => a.value ?? a.description ?? '').join(' '));
    }
    if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error') {
      consoleErrors.push(m.params.entry.text);
    }
    if (m.method === 'Runtime.exceptionThrown') {
      consoleErrors.push(JSON.stringify(m.params.exceptionDetails?.text || 'exception'));
    }
  };
  function send(method, params = {}, sessionId) {
    const id = ++msgId;
    ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
    return new Promise((res, rej) => pending.set(id, { res, rej }));
  }

  const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  await send('Page.enable', {}, sessionId);
  await send('Runtime.enable', {}, sessionId);
  await send('Log.enable', {}, sessionId);
  await send('Emulation.setDeviceMetricsOverride', {
    width: 1280, height: 900, deviceScaleFactor: 1, mobile: false,
  }, sessionId);

  const shots = [
    { name: 'audit', url: '/audit', full: true },
    { name: 'audit-start', url: '/audit/start', full: true },
    { name: 'audit-thanks', url: '/audit/thanks', full: true },
    { name: 'guide-with-band', url: '/guide', full: true },
  ];

  const report = { base: BASE, consoleErrors: [], pages: [] };
  for (const s of shots) {
    await send('Page.navigate', { url: `${BASE}${s.url}` }, sessionId);
    await waitFor(`load ${s.name}`, async () => {
      const r = await send('Runtime.evaluate', { expression: 'document.readyState', returnByValue: true }, sessionId);
      return r.result.value === 'complete';
    });
    await sleep(600);
    const text = await send('Runtime.evaluate', { expression: 'document.body.innerText.slice(0, 400)', returnByValue: true }, sessionId);
    const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: s.full }, sessionId);
    const file = path.join(OUT, `${s.name}.png`);
    await writeFile(file, Buffer.from(shot.data, 'base64'));
    report.pages.push({ name: s.name, url: s.url, file, text: text.result.value });
  }

  report.consoleErrors = consoleErrors;
  await writeFile(path.join(OUT, 'capture-report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ ok: true, consoleErrors: consoleErrors.length, pages: report.pages.map((p) => ({ name: p.name, url: p.url })) }, null, 2));

  ws.close();
  chrome.kill('SIGTERM');
}

main().catch((e) => { console.error(e); process.exit(1); });
