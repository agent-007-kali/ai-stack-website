// Verify the homepage guide band (issue #119) via the system Chrome DevTools
// Protocol using Node built-ins only. Captures full-page screenshots plus a
// clipped shot of the band, and prints layout metrics as JSON.
//
// Usage: node scripts/verify-guide-band.mjs <baseUrl> <outDir>

import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const BASE = process.argv[2] || 'http://127.0.0.1:3199';
const OUT = process.argv[3] || 'evidence/issue-119';
const CHROME = '/usr/bin/google-chrome';
const PORT = 9341;
const COPY =
  'New: Hire Your First AI Employee - a 62-page PDF guide, written by an AI agent';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitFor(label, fn, timeout = 15000) {
  const start = Date.now();
  for (;;) {
    try {
      if (await fn()) return true;
    } catch {
      /* keep polling */
    }
    if (Date.now() - start > timeout) throw new Error(`timeout waiting for ${label}`);
    await sleep(150);
  }
}

const chrome = spawn(
  CHROME,
  [
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu',
    '--disable-dev-shm-usage',
    `--remote-debugging-port=${PORT}`,
    '--user-data-dir=/tmp/opencode/chrome-issue119',
    'about:blank',
  ],
  { stdio: 'ignore' },
);

let ws;
let nextId = 1;
const pending = new Map();

function send(method, params = {}) {
  const id = nextId++;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
}

async function connect() {
  await waitFor('devtools endpoint', async () => {
    const r = await fetch(`http://127.0.0.1:${PORT}/json/version`);
    return r.ok;
  });
  const target = await fetch(`http://127.0.0.1:${PORT}/json/new?${encodeURIComponent('about:blank')}`, {
    method: 'PUT',
  }).then((r) => r.json());
  ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((res, rej) => {
    ws.addEventListener('open', res, { once: true });
    ws.addEventListener('error', rej, { once: true });
  });
  ws.addEventListener('message', (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(msg.error.message));
      else resolve(msg.result);
    }
  });
  await send('Page.enable');
  await send('Runtime.enable');
}

async function setViewport(width, height) {
  await send('Emulation.setDeviceMetricsOverride', {
    width,
    height,
    deviceScaleFactor: 1,
    mobile: width < 500,
  });
}

async function evaluate(expression) {
  const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.text || 'eval failed');
  return r.result?.value;
}

async function navigate(url) {
  await send('Page.navigate', { url });
  await waitFor('guide band', async () => (await evaluate('!!document.querySelector(".guide-band")')) === true);
  await sleep(600);
}

async function shot(name) {
  const r = await send('Page.captureScreenshot', {
    format: 'png',
    captureBeyondViewport: true,
  });
  const file = path.join(OUT, `${name}.png`);
  await writeFile(file, Buffer.from(r.data, 'base64'));
  await writeFile(path.join(OUT, `${name}.txt`), String(await evaluate('document.body.innerText')));
  return file;
}

async function shotClip(name, x, y, width, height) {
  const r = await send('Page.captureScreenshot', {
    format: 'png',
    captureBeyondViewport: true,
    clip: { x, y, width, height, scale: 1 },
  });
  const file = path.join(OUT, `${name}.png`);
  await writeFile(file, Buffer.from(r.data, 'base64'));
  return file;
}

const metricsExpr = `(() => {
  const band = document.querySelector('.guide-band');
  const copy = document.querySelector('.guide-band-copy');
  const btn = document.querySelector('.guide-band-btn');
  const app = document.querySelector('.jl-page');
  if (!band || !copy || !btn) return { missing: true };
  const br = band.getBoundingClientRect();
  const btnR = btn.getBoundingClientRect();
  const copyR = copy.getBoundingClientRect();
  const appR = app ? app.getBoundingClientRect() : null;
  const cs = getComputedStyle(band);
  const btnCs = getComputedStyle(btn);
  const doc = document.documentElement;
  return {
    missing: false,
    copyText: copy.textContent,
    btnText: btn.textContent,
    btnHref: btn.getAttribute('href'),
    bandRect: { top: br.top, bottom: br.bottom, width: br.width, height: br.height },
    bandDocTop: br.top + window.scrollY,
    bandBackground: cs.backgroundColor,
    btnRect: { top: btnR.top, bottom: btnR.bottom, width: btnR.width, height: btnR.height, left: btnR.left, right: btnR.right },
    copyRect: { top: copyR.top, bottom: copyR.bottom, width: copyR.width, left: copyR.left, right: copyR.right },
    btnBackground: btnCs.backgroundColor,
    btnColor: btnCs.color,
    btnRadius: btnCs.borderRadius,
    appBottom: appR ? appR.bottom : null,
    overlapPx: appR ? Math.round(appR.bottom - br.top) : null,
    docHeight: doc.scrollHeight,
    docWidth: doc.scrollWidth,
    clientWidth: doc.clientWidth,
    horizontalOverflowPx: doc.scrollWidth - doc.clientWidth,
    docBottom: (doc.scrollHeight - window.scrollY),
  };
})()`;

async function capture(label, width, height) {
  await setViewport(width, height);
  await navigate(`${BASE}/`);
  const metrics = await evaluate(metricsExpr);

  // Baseline scroll width of the page WITHOUT the band (the pre-existing
  // landing page bleeds 24px past the viewport by design). The band must not
  // add any overflow beyond that.
  const baselineScrollWidth = await evaluate(`(() => {
    const b = document.querySelector('.guide-band');
    const prev = b.style.display;
    b.style.display = 'none';
    const w = document.documentElement.scrollWidth;
    b.style.display = prev;
    return w;
  })()`);
  metrics.baselineScrollWidth = baselineScrollWidth;
  metrics.scrollWidthWithBand = await evaluate('document.documentElement.scrollWidth');

  // Scroll to the bottom: the band must be reachable in a normal viewport.
  await evaluate('window.scrollTo(0, document.documentElement.scrollHeight)');
  await sleep(300);
  const visibleAtBottom = await evaluate(`(() => {
    const b = document.querySelector('.guide-band');
    const r = b.getBoundingClientRect();
    return { top: r.top, bottom: r.bottom, viewportH: window.innerHeight, inView: r.top < window.innerHeight && r.bottom > 0 };
  })()`);

  await shot(`${label}-homepage`);

  if (!metrics.missing) {
    const pad = 16;
    const y = Math.max(0, metrics.bandDocTop - pad);
    const clipH = Math.min(metrics.bandRect.height + pad * 2, metrics.docHeight - y);
    await shotClip(`${label}-guide-band`, 0, y, width, clipH);
  }

  return { label, viewport: { width, height }, metrics, visibleAtBottom };
}

async function main() {
  await mkdir(OUT, { recursive: true });
  await connect();

  const desktop = await capture('desktop', 1440, 900);
  const mobile = await capture('mobile', 390, 844);

  const checks = [];
  for (const run of [desktop, mobile]) {
    const m = run.metrics;
    checks.push({ check: `${run.label}: band present`, pass: !m.missing });
    checks.push({ check: `${run.label}: copy exact`, pass: m.copyText === COPY });
    checks.push({ check: `${run.label}: button text`, pass: m.btnText === 'See the guide' });
    checks.push({ check: `${run.label}: button href /guide`, pass: m.btnHref === '/guide' });
    checks.push({ check: `${run.label}: band adds no horizontal overflow`, pass: m.scrollWidthWithBand <= m.baselineScrollWidth });
    checks.push({ check: `${run.label}: band contents stay inside band`, pass: m.copyRect.right <= m.bandRect.width + 1 && m.btnRect.right <= m.bandRect.width + 1 });
    checks.push({ check: `${run.label}: band bottom within document`, pass: m.bandRect.bottom <= m.docHeight + 1 });
    checks.push({ check: `${run.label}: band visible at page bottom`, pass: run.visibleAtBottom.inView });
    checks.push({ check: `${run.label}: button min height >= 44`, pass: m.btnRect.height >= 44 });
    checks.push({ check: `${run.label}: no price in band copy`, pass: !/[0-9]+[.,][0-9]|£|\$|€/.test(m.copyText + ' ' + m.btnText) });
    checks.push({ check: `${run.label}: band inside viewport width`, pass: m.bandRect.width <= run.viewport.width + 1 && m.bandRect.width > 0 });
  }

  const report = { checks, desktop, mobile };
  await writeFile(path.join(OUT, 'layout-checks.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  if (checks.some((c) => !c.pass)) process.exitCode = 1;
}

main()
  .then(() => {
    ws?.close();
    chrome.kill();
    process.exit(process.exitCode || 0);
  })
  .catch((err) => {
    console.error(err);
    ws?.close();
    chrome.kill();
    process.exit(1);
  });
