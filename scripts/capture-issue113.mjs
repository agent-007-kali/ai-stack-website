// Screenshot driver for issue #113: /sales and /try scripted fallback
// price/payment answers + the shared "scripted demo, not live" label, with no
// GROQ/relay key configured. System Chrome via CDP, Node built-ins only.
//
// Usage: node scripts/capture-issue113.mjs <baseUrl> <outDir>

import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const BASE = process.argv[2] || 'http://127.0.0.1:3213';
const OUT = process.argv[3] || 'screenshots';
const CHROME = '/usr/bin/google-chrome';
const PORT = 9344;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitFor(label, fn, timeout = 20000) {
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
    '--user-data-dir=/tmp/opencode/chrome-issue113',
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
    mobile: false,
  });
}

async function evaluate(expression) {
  const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.text || 'eval failed');
  return r.result?.value;
}

async function navigate(url) {
  await send('Page.navigate', { url });
  await waitFor('body', async () => (await evaluate('!!document.body')) === true);
  await sleep(600);
}

const bodyText = `document.body.innerText`;

async function shot(name) {
  const r = await send('Page.captureScreenshot', {
    format: 'png',
    captureBeyondViewport: true,
  });
  const file = path.join(OUT, `${name}.png`);
  await writeFile(file, Buffer.from(r.data, 'base64'));
  await writeFile(path.join(OUT, `${name}.txt`), String(await evaluate(bodyText)));
  const { size } = await import('node:fs/promises').then((fs) => fs.stat(file));
  console.log(`shot ${name}.png (${size} bytes)`);
  if (size < 5000) throw new Error(`${name}.png too small (${size})`);
}

// React-safe input setter.
const setInput = (selector, value) => `(() => {
  const el = document.querySelector(${JSON.stringify(selector)});
  if (!el) return false;
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  setter.call(el, ${JSON.stringify(value)});
  el.dispatchEvent(new Event('input', { bubbles: true }));
  return true;
})()`;

const click = (selector) => `(() => {
  const el = document.querySelector(${JSON.stringify(selector)});
  if (!el) return false;
  el.click();
  return true;
})()`;

const waitText = async (substr) =>
  waitFor(`text ${substr}`, async () => String(await evaluate(bodyText)).includes(substr));

const assertText = async (substr, label) => {
  const text = String(await evaluate(bodyText));
  if (!text.includes(substr)) throw new Error(`${label}: expected "${substr}" on page`);
};

async function main() {
  await mkdir(OUT, { recursive: true });
  await connect();
  await setViewport(1280, 1000);

  // ---- /sales: price + payment from the fixed sheet, label visible --------
  await navigate(`${BASE}/sales`);
  await evaluate(setInput('input[autocomplete="name"]', 'Alex'));
  await evaluate(setInput('input[autocomplete="email"]', 'alex@example.com'));
  await evaluate(click('.sa-start__form button[type="submit"]'));
  await waitText('session opened - scripted demo, not live');

  await evaluate(setInput('#sa-input', 'How much is it?'));
  await evaluate(click('.sa-in button[type="submit"]'));
  await waitText('Here are our fixed prices');
  await assertText('£49 setup', 'sales price');
  await assertText('scripted demo, not live', 'sales price label');
  await sleep(400);
  await shot('issue-113-sales-price');

  await evaluate(setInput('#sa-input', 'How do I pay?'));
  await evaluate(click('.sa-in button[type="submit"]'));
  await waitText('secure Stripe checkout on our site - never in chat');
  await assertText('scripted demo, not live', 'sales pay label');
  await sleep(400);
  await shot('issue-113-sales-pay');

  // ---- /try: same sheet answers, shared label -----------------------------
  await navigate(`${BASE}/try`);
  await assertText('scripted demo, not live', 'try page foot label');
  await evaluate(setInput('input[placeholder="Your name"]', 'Alex'));
  await evaluate(setInput('input[placeholder="you@company.com"]', 'alex@example.com'));
  await evaluate(click('.gate button'));
  await waitText('session opened - scripted demo, not live');
  await assertText('scripted demo, not live', 'try chat-head label');

  await evaluate(
    setInput('.composer input', 'How much is it?') +
      '; true',
  );
  await evaluate(click('.composer button[aria-label="Send"]'));
  await waitText('Here are our fixed prices');
  await assertText('£49 setup', 'try price');
  await assertText('[scripted demo, not live]', 'try price inline label');
  await sleep(400);
  await shot('issue-113-try-price');

  await evaluate(setInput('.composer input', 'How do I pay?'));
  await evaluate(click('.composer button[aria-label="Send"]'));
  await waitText('secure Stripe checkout on our site - never in chat');
  await assertText('[scripted demo, not live]', 'try pay inline label');
  await sleep(400);
  await shot('issue-113-try-pay');

  console.log('OK: all four captures verified against the rendered pages');
}

main()
  .then(() => {
    ws?.close();
    chrome.kill();
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    ws?.close();
    chrome.kill();
    process.exit(1);
  });
