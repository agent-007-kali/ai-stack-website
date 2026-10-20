// Screenshot driver for issue-127 proof: /guide (bundle card + five buttons +
// free-chapter line), /sample and /sample/thanks at 1280 and 390 wide. Uses
// system Chrome via the DevTools Protocol and Node built-ins only.
//
// Usage: node evidence/issue-127/capture.mjs <baseUrl> <outDir>
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const BASE = process.argv[2] || 'http://127.0.0.1:3277';
const OUT = process.argv[3] || 'evidence/issue-127';
const CHROME = '/usr/bin/google-chrome';
const PORT = 9334;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitFor(label, fn, timeout = 15000) {
  const start = Date.now();
  for (;;) {
    try { if (await fn()) return true; } catch { /* poll */ }
    if (Date.now() - start > timeout) throw new Error(`timeout waiting for ${label}`);
    await sleep(150);
  }
}

const chrome = spawn(CHROME, [
  '--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
  `--remote-debugging-port=${PORT}`, '--user-data-dir=/tmp/opencode/chrome-issue127', 'about:blank',
], { stdio: 'ignore' });

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
  await waitFor('devtools', async () => (await fetch(`http://127.0.0.1:${PORT}/json/version`)).ok);
  const target = await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: 'PUT' }).then((r) => r.json());
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
      if (msg.error) reject(new Error(msg.error.message)); else resolve(msg.result);
    }
  });
  await send('Page.enable');
  await send('Runtime.enable');
}
async function setViewport(width, height) {
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 500 });
}
async function evaluate(expression) {
  const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.text || 'eval failed');
  return r.result?.value;
}
async function navigate(url) {
  await send('Page.navigate', { url });
  await waitFor('body', async () => (await evaluate('!!document.body')) === true);
  await sleep(500);
}
async function shot(name) {
  const r = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
  const file = path.join(OUT, `${name}.png`);
  await writeFile(file, Buffer.from(r.data, 'base64'));
  await writeFile(path.join(OUT, `${name}.txt`), String(await evaluate('document.body.innerText')));
  return file;
}

const setSelect = (selector, value) => `(() => {
  const el = document.querySelector(${JSON.stringify(selector)});
  if (!el) return false;
  const setter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set;
  setter.call(el, ${JSON.stringify(value)});
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
  return el.value;
})()`;
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

async function main() {
  await mkdir(OUT, { recursive: true });
  await connect();

  await setViewport(1280, 1000);
  await navigate(`${BASE}/guide`);
  await shot('guide-1280');
  const guideInfo = await evaluate(`(() => {
    const btns = [...document.querySelectorAll('button')].map(b => b.textContent.trim());
    const h2 = [...document.querySelectorAll('h2')].map(h => h.textContent.trim());
    return { buyButtons: btns.filter(t => t.startsWith('Buy now')), headings: h2,
      freeChapter: document.body.innerText.includes('Not sure which one? Try a free chapter'),
      bundleFirst: h2[0] };
  })()`);

  await setViewport(390, 844);
  await navigate(`${BASE}/guide`);
  await shot('guide-390');

  await setViewport(1280, 1000);
  await navigate(`${BASE}/sample`);
  await shot('sample-1280');

  await setViewport(390, 844);
  await navigate(`${BASE}/sample`);
  await shot('sample-390');

  // Fill and submit the form for real (guided by the form itself), land on thanks.
  await setViewport(1280, 1000);
  await evaluate(setInput('input[name="name"]', 'Proof Tester'));
  await evaluate(setInput('input[name="email"]', 'proof@example.com'));
  const selApplied = await evaluate(setSelect('select[name="guide"]', 'prompt-pack'));
  console.log('selectApplied:', selApplied);
  const formInfo = await evaluate(`(() => JSON.stringify({
    names: [...document.querySelectorAll('input,select')].map(e => e.name),
    selectValue: (document.querySelector('select[name="guide"]') || {}).value,
    hasForm: !!document.querySelector('form'),
    formAction: document.querySelector('form') ? document.querySelector('form').getAttribute('action') : null,
  }))()`);
  console.log('formInfo:', formInfo);
  await evaluate(click('form button[type="submit"]'));
  await sleep(1500);
  console.log('afterSubmitUrl:', await evaluate('location.href'));
  console.log('afterSubmitText:', String(await evaluate('document.body.innerText')).slice(0, 300));
  await sleep(500);
  await shot('sample-thanks-1280');
  const thanksInfo = await evaluate(`(() => ({
    href: (document.querySelector('a') || {}).getAttribute ? document.querySelector('a').getAttribute('href') : '',
    text: document.body.innerText.slice(0, 200),
  }))()`);

  await setViewport(390, 844);
  await navigate(`${BASE}${thanksInfo.href ? new URL(thanksInfo.href, BASE).pathname + new URL(thanksInfo.href, BASE).search : '/sample'}`);
  await shot('sample-thanks-390');

  console.log(JSON.stringify({ guideInfo, thanksInfo }, null, 2));
}

main()
  .then(() => { ws?.close(); chrome.kill(); process.exit(0); })
  .catch((err) => { console.error(err); ws?.close(); chrome.kill(); process.exit(1); });
