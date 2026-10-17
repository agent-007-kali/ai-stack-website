// Bow chat screenshot driver for the Groq-first tier proof.
//
// Same CDP plumbing as scripts/capture-relay.mjs (system Chrome, Node built-ins),
// but it can send several messages in one session and waits for a caller-chosen
// substring after each, so both an instant tier reply and the labelled scripted
// fallback can be captured deterministically.
//
// Usage:
//   node scripts/capture-bow-groq.mjs <base> <out> <tag> <port> <page> <visitor> <msg>::<wait> [<msg>::<wait> ...]
// Example:
//   node scripts/capture-bow-groq.mjs http://127.0.0.1:3301 docs/bow-groq-proof tryA 9351 /try Alex "hello::ctx=0" "tell me more::ctx=1"

import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const [, , BASE = 'http://127.0.0.1:3300', OUT = 'docs/bow-groq-proof', TAG = 'tryA', PORT = '9351', PAGE = '/try', VISITOR = 'Alex', ...MSG_SPECS] = process.argv;
const CHROME = '/usr/bin/google-chrome';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitFor(label, fn, timeout = 30000) {
  const start = Date.now();
  for (;;) {
    try {
      if (await fn()) return true;
    } catch {
      /* keep polling */
    }
    if (Date.now() - start > timeout) throw new Error(`timeout waiting for ${label}`);
    await sleep(200);
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
    `--user-data-dir=/tmp/opencode/chrome-bowgroq-${TAG}`,
    'about:blank',
  ],
  { stdio: 'ignore' },
);

let ws;
let nextId = 1;
const pending = new Map();
const send = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const id = nextId++;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });

async function connect() {
  await waitFor('devtools', async () => (await fetch(`http://127.0.0.1:${PORT}/json/version`)).ok);
  const target = await fetch(`http://127.0.0.1:${PORT}/json/new?${encodeURIComponent('about:blank')}`, { method: 'PUT' }).then((r) => r.json());
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
  await send('Emulation.setDeviceMetricsOverride', { width: 1000, height: 900, deviceScaleFactor: 1, mobile: false });
}

async function evaluate(expression) {
  const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.text || 'eval failed');
  return r.result?.value;
}

async function navigate(url) {
  await send('Page.navigate', { url });
  await waitFor('body', async () => (await evaluate('!!document.body')) === true);
  await sleep(800);
}

const bodyText = 'document.body.innerText';
async function shot(name) {
  const r = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
  await writeFile(path.join(OUT, `${name}.png`), Buffer.from(r.data, 'base64'));
  await writeFile(path.join(OUT, `${name}.txt`), String(await evaluate(bodyText)));
}

async function typeInto(selector, value) {
  const ok = await evaluate(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); if (!el) return false; el.focus(); el.select && el.select(); return true; })()`);
  if (!ok) return false;
  for (const ch of value) {
    await send('Input.dispatchKeyEvent', { type: 'keyDown', text: ch, key: ch });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: ch });
  }
  return true;
}

const click = (selector) => `(() => {
  const el = document.querySelector(${JSON.stringify(selector)});
  if (!el) return false;
  el.click();
  return true;
})()`;
const waitText = async (substr, timeout = 30000) =>
  waitFor(`text ${substr}`, async () => String(await evaluate(bodyText)).includes(substr), timeout);

async function main() {
  await mkdir(OUT, { recursive: true });
  await connect();
  await navigate(`${BASE}${PAGE}`);
  await evaluate(click('.bow-install-x'));
  await sleep(300);

  const sales = PAGE.startsWith('/sales');
  await typeInto('input[autocomplete="name"]', VISITOR);
  await typeInto('input[autocomplete="email"]', 'visitor@example.com');
  if (sales) {
    await evaluate(click('.sa-start__form button[type="submit"]'));
    await waitText('Bow Sales Customer Advisor');
  } else {
    await sleep(300);
    await evaluate(click('.gate button'));
    await waitFor('composer', async () => (await evaluate('!!document.querySelector(".composer input")')) === true);
  }

  let index = 0;
  for (const spec of MSG_SPECS.length ? MSG_SPECS : ['hello::Bow Bot']) {
    if (index > 0) await sleep(4200); // clear the 1-msg / 3s per-session guard
    const [message, wait = ''] = spec.split('::');
    if (sales) {
      await typeInto('#sa-input', message);
      await evaluate(click('.sa-in button[type="submit"]'));
    } else {
      await typeInto('.composer input', message);
      await evaluate(click('.composer button'));
    }
    if (wait) await waitText(wait);
    else await sleep(1500);
    index += 1;
    await sleep(400);
    await shot(`${TAG}-m${index}`);
  }

  const text = String(await evaluate(bodyText));
  console.log(JSON.stringify({ tag: TAG, page: PAGE, text }, null, 2));
}

main()
  .then(() => {
    ws?.close();
    chrome.kill();
    process.exit(0);
  })
  .catch((err) => {
    console.error(String(err));
    ws?.close();
    chrome.kill();
    process.exit(1);
  });
