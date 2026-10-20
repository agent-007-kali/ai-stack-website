// CDP checks for the new storefront homepage: section order, console errors,
// horizontal overflow at 390px, guides rail scrolling, header search.
// Usage: node evidence/issue-133/storefront-check.mjs <baseUrl> <outDir>
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const BASE = process.argv[2] || 'http://127.0.0.1:3199';
const OUT = process.argv[3] || 'evidence/issue-133';
const CHROME = '/usr/bin/google-chrome';
const PORT = 9447;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitFor(label, fn, timeout = 25000) {
  const start = Date.now();
  for (;;) {
    try {
      if (await fn()) return;
    } catch { /* retry */ }
    if (Date.now() - start > timeout) throw new Error(`timeout waiting for ${label}`);
    await sleep(250);
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

  let target;
  await waitFor('devtools', async () => {
    const r = await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: 'PUT' });
    if (!r.ok) throw new Error(`json/new ${r.status}`);
    target = await r.json();
    return !!target.webSocketDebuggerUrl;
  });

  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });

  let msgId = 0;
  const pending = new Map();
  const consoleErrors = [];
  ws.onmessage = (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) {
      const { resolve, reject } = pending.get(m.id);
      pending.delete(m.id);
      if (m.error) reject(new Error(m.error.message));
      else resolve(m.result);
      return;
    }
    if (m.method === 'Runtime.exceptionThrown') {
      consoleErrors.push(`exception: ${m.params.exceptionDetails.text}`);
    }
    if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') {
      consoleErrors.push(`console.error: ${m.params.args.map((a) => a.value ?? a.description ?? '').join(' ')}`);
    }
    if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error') {
      consoleErrors.push(`log: ${m.params.entry.text} (${m.params.entry.url || ''})`);
    }
  };
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++msgId;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });

  const evaluate = async (expression) => {
    const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.text);
    return r.result.value;
  };

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Log.enable');

  const report = {};

  async function audit(name, width, height, mobile) {
    consoleErrors.length = 0;
    await send('Emulation.setDeviceMetricsOverride', {
      width, height, deviceScaleFactor: 1, mobile, screenWidth: width, screenHeight: height,
    });
    await send('Page.navigate', { url: BASE + '/' });
    await waitFor(`${name} load`, async () => (await evaluate('document.readyState')) === 'complete');
    await sleep(2200);
    await evaluate('window.scrollTo(0, document.body.scrollHeight)');
    await sleep(1200);
    await evaluate('window.scrollTo(0, 0)');
    await sleep(600);

    const result = await evaluate(`(() => {
      const doc = document.documentElement;
      const inner = window.innerWidth;
      const overflowing = [];
      for (const el of document.querySelectorAll('body *')) {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.right <= inner + 1) continue;
        let p = el.parentElement, skip = false;
        while (p && p !== document.body) {
          const ox = getComputedStyle(p).overflowX;
          if (ox === 'auto' || ox === 'scroll' || ox === 'hidden' || ox === 'clip') { skip = true; break; }
          p = p.parentElement;
        }
        if (!skip) overflowing.push(el.tagName.toLowerCase() + (el.className ? '.' + String(el.className).split(' ').join('.') : ''));
      }
      const rail = document.querySelector('.sf-rail');
      const before = rail ? rail.scrollLeft : null;
      if (rail) rail.scrollLeft = 320;
      const after = rail ? rail.scrollLeft : null;
      if (rail) rail.scrollLeft = 0;
      const input = document.querySelector('.sf-search input');
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(input, 'rigel');
      input.dispatchEvent(new Event('input', { bubbles: true }));
      return {
        innerWidth: inner,
        docScrollWidth: doc.scrollWidth,
        docClientWidth: doc.clientWidth,
        bodyScrollWidth: document.body.scrollWidth,
        overflowing: overflowing.slice(0, 12),
        sectionOrder: [...document.querySelectorAll('section[id]')].map(s => s.id),
        railScrollable: rail ? { scrollWidth: rail.scrollWidth, clientWidth: rail.clientWidth, scrolledTo: after, couldScroll: after > (before || 0) } : null,
        title: document.title,
        h1: document.querySelector('h1') ? document.querySelector('h1').textContent.trim() : null,
        stripeLinks: document.querySelectorAll('a[href*="buy.stripe.com"]').length,
        mailtoLinks: document.querySelectorAll('a[href^="mailto:"]').length,
        lobbyLinks: [...document.querySelectorAll('a[href="/lobby"]')].length,
        brokenImages: [...document.images].filter(i => !i.complete || i.naturalWidth === 0).map(i => i.currentSrc || i.src),
        imageCount: document.images.length,
        heroBg: getComputedStyle(document.querySelector('.sf-hero')).backgroundImage.slice(0, 40),
        btnBg: getComputedStyle(document.querySelector('.sf-btn-primary')).backgroundColor,
        guideCards: document.querySelectorAll('.sf-rail .sf-card').length,
        boxCards: document.querySelectorAll('.sf-box').length,
      };
    })()`);

    await sleep(400);
    const searchStage = await evaluate(`(() => {
      const hits = [...document.querySelectorAll('.sf-hits .sf-hit')].map(h => h.textContent.trim());
      const firstHit = document.querySelector('.sf-hits .sf-hit');
      const scrolledBefore = window.scrollY;
      if (firstHit) firstHit.click();
      return { hits, clicked: !!firstHit, scrolledBefore };
    })()`);
    await sleep(700);
    const searchAfter = await evaluate(`(() => {
      const input = document.querySelector('.sf-search input');
      return {
        scrollY: window.scrollY,
        pulseApplied: !!document.querySelector('.sf-pulse'),
        searchCleared: input.value === '',
        boxesInView: (() => { const el = document.getElementById('boxes'); if (!el) return false; const r = el.getBoundingClientRect(); return r.top > -50 && r.top < 300; })(),
      };
    })()`);

    result.searchHits = searchStage.hits;
    result.searchJumped = searchStage.clicked && searchAfter.scrollY > searchStage.scrolledBefore;
    result.searchCleared = searchAfter.searchCleared;
    result.pulseApplied = searchAfter.pulseApplied;
    result.boxesInViewAfterSearch = searchAfter.boxesInView;

    result.consoleErrors = [...consoleErrors];
    result.pass = result.docScrollWidth <= result.docClientWidth + 1
      && result.overflowing.length === 0
      && result.sectionOrder.join(',') === 'hero,guides,bowbot,boxes,academy,agents'
      && result.consoleErrors.length === 0
      && result.searchHits.length > 0
      && result.searchJumped
      && result.searchCleared
      && result.brokenImages.length === 0
      && result.guideCards === 5
      && result.boxCards === 3;
    report[name] = result;

    if (railShot) {
      await evaluate(`(() => { const r = document.querySelector('.sf-rail'); if (r) r.scrollLeft = 340; return true; })()`);
      await sleep(500);
      const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
      await writeFile(path.join(OUT, railShot), Buffer.from(shot.data, 'base64'));
    }

    const full = await evaluate('document.documentElement.scrollHeight');
    const shot = await send('Page.captureScreenshot', {
      format: 'png',
      captureBeyondViewport: true,
      clip: { x: 0, y: 0, width, height: Math.min(full, 16000), scale: 1 },
    });
    await writeFile(path.join(OUT, file), Buffer.from(shot.data, 'base64'));
  }

  let file = 'home-desktop-1280.png';
  let railShot = null;
  await audit('desktop1280', 1280, 900, false);

  file = 'home-mobile-390.png';
  railShot = 'home-mobile-390-guides-scrolled.png';
  await audit('mobile390', 390, 844, true);

  await writeFile(path.join(OUT, 'checks.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  ws.close();
  chrome.kill();
  const ok = Object.values(report).every((r) => r.pass);
  process.exit(ok ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
