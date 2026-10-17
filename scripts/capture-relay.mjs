// Relay screenshot driver. Uses system Chrome via DevTools Protocol (Node built-ins).
// Usage: node scripts/capture-relay.mjs <base> <out> <tag> <port> <page> <visitorName> <message>
// Example:
//   node scripts/capture-relay.mjs http://127.0.0.1:3100 docs/bow-relay-proof tryA 9341 /try Alex "Session A: hello from Bow Chat"

import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const [, , BASE = 'http://127.0.0.1:3100', OUT = 'docs/bow-relay-proof', TAG = 'tryA', PORT = '9341', PAGE = '/try', VISITOR = 'Alex', MESSAGE = 'hello'] = process.argv;
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
    `--user-data-dir=/tmp/opencode/chrome-relay-${TAG}`,
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
    if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
      console.log('CONSOLE', (msg.params.args || []).map((a) => a.value ?? a.description).join(' '));
    }
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(msg.error.message));
      else resolve(msg.result);
    }
  });
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Network.enable');
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
  await sleep(600);
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
  // Dismiss the PWA install banner if it is covering the chat.
  await evaluate(click('.bow-install-x'));
  await sleep(300);

  if (PAGE.startsWith('/sales')) {
    await typeInto('input[autocomplete="name"]', VISITOR);
    await typeInto('input[autocomplete="email"]', 'visitor@example.com');
    await evaluate(click('.sa-start__form button[type="submit"]'));
    await waitText('Bow Sales Customer Advisor');
    await typeInto('#sa-input', MESSAGE);
    await evaluate(click('.sa-in button[type="submit"]'));
  } else {
    await typeInto('input[autocomplete="name"]', VISITOR);
    await typeInto('input[autocomplete="email"]', 'visitor@example.com');
    await sleep(300);
    await evaluate(click('.gate button'));
    await waitFor('composer', async () => (await evaluate('!!document.querySelector(".composer input")')) === true);
    await typeInto('.composer input', MESSAGE);
    await evaluate(click('.composer button'));
  }

  // Pending state (typing) is shown while we wait for the polled advisor reply.
  await sleep(1200);
  await shot(`${TAG}-pending`);

  // Wait for a live relay reply to appear.
  let sawReply = true;
  try {
    await waitText('[live]', 25000);
  } catch {
    sawReply = false;
  }
  await sleep(600);
  await shot(`${TAG}-live`);

  const text = String(await evaluate(bodyText));
  console.log(JSON.stringify({ tag: TAG, page: PAGE, sawReply, text }, null, 2));
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
