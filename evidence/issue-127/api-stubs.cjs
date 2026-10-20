// LOCAL PROOF ONLY (issue-127): in-process stubs so the guide/sample routes
// can be exercised over real HTTP without Stripe or Vercel Blob credentials.
// Loaded only through NODE_OPTIONS=--require for the local `next start` used
// for evidence; nothing here runs in any deployment.
//
// 1) Patches node:https / node:http so api.stripe.com calls hit an in-process
//    Stripe stub (checkout session create + retrieve), logging method/path/
//    body (never headers/keys) to stripe-requests.log.
// 2) Patches require('undici').fetch — @vercel/blob's only transport — so
//    PUT/GET/list against the blob API and private blob URLs are served from
//    a local directory (BLOB_STORE_DIR), emulating addRandomSuffix.
'use strict';

const https = require('node:https');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { EventEmitter } = require('node:events');

const DIR = __dirname;
const STRIPE_LOG = path.join(DIR, 'stripe-requests.log');
const BLOB_STORE_DIR = process.env.BLOB_STORE_DIR || '/tmp/opencode/blob-store';
fs.mkdirSync(BLOB_STORE_DIR, { recursive: true });

// ---------------------------------------------------------------- Stripe ---
const SESSIONS = {
  cs_test_unpaid1: { payment_status: 'unpaid', product: 'guide-hire-first-ai-employee' },
  cs_test_paidguide1: { payment_status: 'paid', product: 'guide-hire-first-ai-employee' },
  cs_test_paidprompt1: { payment_status: 'paid', product: 'prompt-pack-small-business' },
  cs_test_paidadmin1: { payment_status: 'paid', product: 'admin-weekend-automation' },
  cs_test_paidacc1: { payment_status: 'paid', product: 'ai-for-accountants' },
  cs_test_paidbundle1: { payment_status: 'paid', product: 'bundle-all-four' },
  cs_test_paidunknown1: { payment_status: 'paid', product: 'not-a-known-product' },
};

function stripeRoute(method, reqPath) {
  if (method === 'POST' && reqPath.startsWith('/v1/checkout/sessions')) {
    return [200, { id: 'cs_test_stubcreated1', url: 'https://checkout.stripe.com/c/pay/cs_test_stubcreated1' }];
  }
  const m = /^\/v1\/checkout\/sessions\/([^/?]+)$/.exec(reqPath);
  if (method === 'GET' && m) {
    const found = SESSIONS[m[1]];
    if (!found) return [404, { error: { message: `Unrecognized request URL: GET /v1/checkout/sessions/${m[1]}` } }];
    return [200, { id: m[1], payment_status: found.payment_status, metadata: { product: found.product } }];
  }
  return [404, { error: { message: `Unrecognized request URL: ${method} ${reqPath}` } }];
}

function makeResponse(statusCode, body) {
  const payload = JSON.stringify(body);
  const res = new EventEmitter();
  res.statusCode = statusCode;
  res.headers = { 'content-type': 'application/json', 'stripe-should-retry': 'false' };
  res.setEncoding = () => res;
  res.pause = () => res;
  res.resume = () => res;
  setImmediate(() => {
    res.emit('data', payload);
    res.emit('end');
  });
  return res;
}

function stubRequest(options, callback) {
  const opts = typeof options === 'string' ? new URL(options) : options;
  const host = opts.host || opts.hostname;
  const method = (opts.method || 'GET').toUpperCase();
  const reqPath = opts.path || '/';
  const req = new EventEmitter();
  req.method = method;
  req.path = reqPath;
  req.setTimeout = () => req;
  let captured = '';
  req.write = (chunk) => { if (chunk !== undefined && chunk !== null) captured += String(chunk); return true; };
  req.end = () => {
    const [status, body] = stripeRoute(method, reqPath);
    try {
      fs.appendFileSync(STRIPE_LOG, `${new Date().toISOString()} ${method} ${reqPath} ${captured}\n`);
    } catch { /* best-effort */ }
    process.nextTick(() => {
      const res = makeResponse(status, body);
      req.emit('response', res);
      if (typeof callback === 'function') callback(res);
    });
    return req;
  };
  req.destroy = (err) => { if (err) process.nextTick(() => req.emit('error', err)); return req; };
  process.nextTick(() => req.emit('socket', { connecting: false }));
  return req;
}

for (const mod of [https, http]) {
  const original = mod.request.bind(mod);
  mod.request = function patched(input, ...rest) {
    const opts = typeof input === 'string' || input instanceof URL ? new URL(input) : input;
    const host = opts.host || opts.hostname;
    if (host === 'api.stripe.com') return stubRequest(typeof input === 'string' || input instanceof URL ? input : opts, rest[0]);
    return original(input, ...rest);
  };
}

// ------------------------------------------------------------------ Blob ---
// @vercel/blob is bundled into the Next server (so patching require('undici')
// has no effect); instead we run REAL local servers and redirect only the
// blob transport: the REST API via VERCEL_BLOB_API_URL (plain HTTP) and the
// private blob host via a node:tls.connect redirect to a local HTTPS server.
const tls = require('node:tls');
const { execFileSync } = require('node:child_process');
const TLS_DIR = '/tmp/opencode/blob-tls';
const TLS_PORT = 9443;
const API_PORT = 4987;
fs.mkdirSync(TLS_DIR, { recursive: true });

if (!fs.existsSync(path.join(TLS_DIR, 'key.pem'))) {
  execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '1',
    '-subj', '/CN=*.blob.vercel-storage.com',
    '-keyout', path.join(TLS_DIR, 'key.pem'),
    '-out', path.join(TLS_DIR, 'cert.pem')], { stdio: 'ignore' });
}

function blobPathFor(pathname) {
  return path.join(BLOB_STORE_DIR, pathname);
}

function jsonRes(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, { 'content-type': 'application/json', 'content-length': Buffer.byteLength(body) });
  res.end(body);
}

function collect(req, cb) {
  const chunks = [];
  req.on('data', (c) => chunks.push(c));
  req.on('end', () => cb(Buffer.concat(chunks)));
}

// REST API: put (PUT /?pathname=...), list (GET /?prefix=...), delete (POST /delete).
const apiServer = http.createServer((req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${API_PORT}`);
  if (req.method === 'PUT' && url.searchParams.has('pathname')) {
    collect(req, (bytes) => {
      let pathname = url.searchParams.get('pathname');
      if ((req.headers['x-add-random-suffix'] || '') === '1') {
        const ext = path.extname(pathname);
        pathname = `${pathname.slice(0, pathname.length - ext.length)}-${Math.random().toString(36).slice(2, 8)}${ext}`;
      }
      const full = blobPathFor(pathname);
      fs.mkdirSync(path.dirname(full), { recursive: true });
      fs.writeFileSync(full, bytes);
      const u = `https://mockstore01.private.blob.vercel-storage.com/${pathname}`;
      jsonRes(res, 200, {
        url: u, downloadUrl: `${u}?download=1`, pathname, size: bytes.length,
        uploadedAt: new Date().toISOString(), etag: `"${bytes.length}"`,
        contentType: 'application/json', contentDisposition: 'attachment',
      });
    });
    return;
  }
  if (req.method === 'GET') {
    const prefix = url.searchParams.get('prefix') || '';
    const blobs = [];
    const walk = (dir, base) => {
      for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, ent.name);
        const rel = base ? `${base}/${ent.name}` : ent.name;
        if (ent.isDirectory()) walk(p, rel);
        else if (rel.startsWith(prefix)) {
          const st = fs.statSync(p);
          blobs.push({
            url: `https://mockstore01.private.blob.vercel-storage.com/${rel}`,
            downloadUrl: `https://mockstore01.private.blob.vercel-storage.com/${rel}?download=1`,
            pathname: rel, size: st.size, uploadedAt: st.mtime.toISOString(),
            etag: `"${st.size}-${st.mtimeMs}"`,
          });
        }
      }
    };
    walk(BLOB_STORE_DIR, '');
    jsonRes(res, 200, { cursor: '', hasMore: false, blobs });
    return;
  }
  if (req.method === 'POST' && url.pathname === '/delete') {
    collect(req, () => jsonRes(res, 200, {}));
    return;
  }
  jsonRes(res, 404, { error: { code: 'not_found', message: 'not found' } });
});
apiServer.on('error', () => {});
apiServer.listen(API_PORT, '127.0.0.1');

// Private blob host: serve stored files over HTTPS on TLS_PORT.
const blobServer = https.createServer(
  {
    key: fs.readFileSync(path.join(TLS_DIR, 'key.pem')),
    cert: fs.readFileSync(path.join(TLS_DIR, 'cert.pem')),
  },
  (req, res) => {
    const pathname = decodeURIComponent(new URL(req.url, 'https://x').pathname.replace(/^\//, ''));
    const full = blobPathFor(pathname);
    if (!fs.existsSync(full)) {
      res.writeHead(404, { 'content-type': 'text/plain' });
      res.end('not found');
      return;
    }
    const bytes = fs.readFileSync(full);
    res.writeHead(200, { 'content-type': 'application/pdf', 'content-length': bytes.length });
    res.end(req.method === 'HEAD' ? undefined : bytes);
  },
);
blobServer.on('error', () => {});
blobServer.listen(TLS_PORT, '127.0.0.1');

const realTlsConnect = tls.connect.bind(tls);
tls.connect = function patchedConnect(options, ...rest) {
  const opts = typeof options === 'number' ? { port: options } : { ...(options || {}) };
  const host = String(opts.host || opts.servername || '');
  if (host.endsWith('.blob.vercel-storage.com') || host === 'mockstore01') {
    opts.host = '127.0.0.1';
    opts.port = TLS_PORT;
    opts.rejectUnauthorized = false;
    opts.servername = host.endsWith('.blob.vercel-storage.com') ? host : 'mockstore01.private.blob.vercel-storage.com';
  }
  return realTlsConnect(opts, ...rest);
};

console.log('[api-stubs] stripe -> in-process stub; vercel blob -> local api :4987 + tls :9443 (local proof only)');
