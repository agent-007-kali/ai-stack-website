// Screenshot /guide at desktop (1280) and mobile (390) widths via Chrome DevTools.
// Usage: node scripts/capture-guide-covers.mjs <baseUrl> <outDir>
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const BASE = process.argv[2] || 'http://127.0.0.1:3188';
const OUT = process.argv[3] || 'evidence/issue-125';
const CHROME = '/usr/bin/google-chrome';
const PORT = 9441;

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

async function cdp(wsUrl, method, params = {}, sessionId) {
  const res = await fetch(`${wsUrl}/json/version`);
  // Use HTTP endpoint when available; otherwise speak WebSocket via fetch is not possible.
  // We drive Chrome over the HTTP + WebSocket-free path using /json/new and Page commands
  // through the DevTools HTTP endpoints where possible; for full control use WS.
  throw new Error('unused');
}

// Minimal WebSocket client (Node 22 has global WebSocket).
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

  const viewports = [
    { name: 'desktop-1280', width: 1280, height: 900 },
    { name: 'mobile-390', width: 390, height: 844 },
  ];

  const report = { base: BASE, consoleErrors: [], pages: [] };
  for (const vp of viewports) {
    await send('Emulation.setDeviceMetricsOverride', {
      width: vp.width, height: vp.height, deviceScaleFactor: 1, mobile: vp.width < 500,
    }, sessionId);
    await send('Page.navigate', { url: `${BASE}/guide` }, sessionId);
    await waitFor(`load ${vp.name}`, async () => {
      const r = await send('Runtime.evaluate', { expression: 'document.readyState', returnByValue: true }, sessionId);
      return r.result.value === 'complete';
    });
    await sleep(1200); // let lazy images below fold load after layout settles
    // force-load all lazy images then wait for decode
    await send('Runtime.evaluate', {
      expression: `Promise.all([...document.images].map(i => { i.loading='eager'; return i.decode().catch(()=>{}); }))`,
      awaitPromise: true,
    }, sessionId);
    await sleep(400);
    const metrics = await send('Runtime.evaluate', {
      expression: `JSON.stringify({
        imgs: [...document.images].map(i => ({ src: i.getAttribute('src'), w: i.naturalWidth, h: i.naturalHeight, cw: Math.round(i.getBoundingClientRect().width), complete: i.complete })),
        scrollW: document.documentElement.scrollWidth,
        clientW: document.documentElement.clientWidth,
      })`,
      returnByValue: true,
    }, sessionId);
    const info = JSON.parse(metrics.result.value);
    const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true }, sessionId);
    const file = path.join(OUT, `guide-${vp.name}.png`);
    await writeFile(file, Buffer.from(shot.data, 'base64'));
    report.pages.push({ viewport: vp.name, file, ...info });
  }

  report.consoleErrors = consoleErrors;
  await writeFile(path.join(OUT, 'capture-report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ ok: true, consoleErrors: report.consoleErrors.length, pages: report.pages.map(p => ({ viewport: p.viewport, imgs: p.imgs.length, scrollW: p.scrollW, clientW: p.clientW })) }, null, 2));

  ws.close();
  chrome.kill('SIGTERM');
}

main().catch((e) => { console.error(e); process.exit(1); });
