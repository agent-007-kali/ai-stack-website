// Screenshot driver for the /sales page. Uses the system Chrome via the
// DevTools Protocol and Node built-ins only (no npm install, no external repo).
//
// Usage: node scripts/capture-sales.mjs <baseUrl> <outDir>

import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const BASE = process.argv[2] || 'http://127.0.0.1:3177';
const OUT = process.argv[3] || 'evidence/sales-agent';
const CHROME = '/usr/bin/google-chrome';
const PORT = 9333;

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
    '--user-data-dir=/tmp/opencode/chrome-issue77',
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
  await waitFor('body', async () => (await evaluate('!!document.body')) === true);
  await sleep(400);
}

async function shot(name) {
  const r = await send('Page.captureScreenshot', {
    format: 'png',
    captureBeyondViewport: true,
  });
  const file = path.join(OUT, `${name}.png`);
  await writeFile(file, Buffer.from(r.data, 'base64'));
  // Persist the rendered text next to the pixels so the capture is auditable
  // without opening the image.
  await writeFile(path.join(OUT, `${name}.txt`), String(await evaluate(bodyText)));
  return file;
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

const bodyText = `document.body.innerText`;
const waitText = async (substr) =>
  waitFor(`text ${substr}`, async () => String(await evaluate(bodyText)).includes(substr));

async function main() {
  await mkdir(OUT, { recursive: true });
  await connect();

  // ---- Desktop 1280 ------------------------------------------------------
  await setViewport(1280, 900);
  await navigate(`${BASE}/sales`);
  await shot('01-desktop-details');

  // Start the chat.
  await evaluate(setInput('input[autocomplete="name"]', 'Priya'));
  await evaluate(setInput('input[autocomplete="email"]', 'priya@example.com'));
  await evaluate(click('.sa-start__form button[type="submit"]'));
  await waitText('AI Sales Consultant');

  // Product question, answered honestly.
  await evaluate(setInput('#sa-input', 'How much does the AI Solutions Box cost?'));
  await evaluate(click('.sa-in button[type="submit"]'));
  await waitText('Rigel (Max) - £7,995');
  await sleep(300);
  await shot('02-desktop-product-answer');

  // Out-of-scope question, handled without guessing.
  await evaluate(setInput('#sa-input', 'Do you offer a free laptop?'));
  await evaluate(click('.sa-in button[type="submit"]'));
  await waitText("won't guess");
  await sleep(300);
  await shot('03-desktop-out-of-scope');

  // Full order end to end (Bow Bot -> reference + payment handoff).
  await evaluate(click('.sa-in button[type="button"]')); // Order button
  await waitText('What would you like to order');
  await evaluate(setInput('#sa-input', '1')); // Bow Bot
  await evaluate(click('.sa-in button[type="submit"]'));
  await waitText('What name should I put');
  await evaluate(setInput('#sa-input', 'Priya Nair'));
  await evaluate(click('.sa-in button[type="submit"]'));
  await waitText('What email');
  await evaluate(setInput('#sa-input', 'priya.nair@example.com'));
  await evaluate(click('.sa-in button[type="submit"]'));
  await waitText('What kind of business');
  await evaluate(setInput('#sa-input', 'Bakery'));
  await evaluate(click('.sa-in button[type="submit"]'));
  await waitText('Any notes');
  await evaluate(setInput('#sa-input', 'skip'));
  await evaluate(click('.sa-in button[type="submit"]'));
  await waitText('Type \'confirm\'');
  await evaluate(setInput('#sa-input', 'confirm'));
  await evaluate(click('.sa-in button[type="submit"]'));
  await waitText('Your reference is');
  await waitText('Stripe checkout');
  await sleep(500);
  await shot('04-desktop-order-complete');

  const reference = await evaluate(
    `(document.body.innerText.match(/AIS-[0-9A-Z-]+/) || [''])[0]`,
  );

  // ---- Mobile 390 --------------------------------------------------------
  await setViewport(390, 844);
  await navigate(`${BASE}/sales`);
  await shot('05-mobile-details');

  await evaluate(setInput('input[autocomplete="name"]', 'Priya'));
  await evaluate(setInput('input[autocomplete="email"]', 'priya@example.com'));
  await evaluate(click('.sa-start__form button[type="submit"]'));
  await waitText('AI Sales Consultant');

  await evaluate(click('.sa-in button[type="button"]')); // Order
  await waitText('What would you like to order');
  await evaluate(setInput('#sa-input', '1'));
  await evaluate(click('.sa-in button[type="submit"]'));
  await waitText('What name should I put');
  await evaluate(setInput('#sa-input', 'Priya Nair'));
  await evaluate(click('.sa-in button[type="submit"]'));
  await waitText('What email');
  await evaluate(setInput('#sa-input', 'priya.nair@example.com'));
  await evaluate(click('.sa-in button[type="submit"]'));
  await waitText('What kind of business');
  await evaluate(setInput('#sa-input', 'skip'));
  await evaluate(click('.sa-in button[type="submit"]'));
  await waitText('Any notes');
  await evaluate(setInput('#sa-input', 'skip'));
  await evaluate(click('.sa-in button[type="submit"]'));
  await waitText("Type 'confirm'");
  await evaluate(setInput('#sa-input', 'confirm'));
  await evaluate(click('.sa-in button[type="submit"]'));
  await waitText('Stripe checkout');
  await sleep(500);
  await shot('06-mobile-order-complete');

  // Scroll overflow check at 390.
  const overflow = await evaluate(
    'document.documentElement.scrollWidth - document.documentElement.clientWidth',
  );

  console.log(JSON.stringify({ reference, mobileOverflowPx: overflow }, null, 2));
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
