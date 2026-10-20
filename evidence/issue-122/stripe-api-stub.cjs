// LOCAL PROOF ONLY (issue-122): redirects the Stripe SDK's HTTPS calls to an
// in-process stub so the guide checkout/download handlers can be exercised
// over real HTTP without any Stripe credentials. Nothing here runs in any
// deployment: it is loaded only through NODE_OPTIONS=--require when starting
// the local `next start` used for the evidence screenshots/status checks.
//
// It patches node:https and delegates to the real module for every host other
// than api.stripe.com.
'use strict';

const https = require('node:https');
const fs = require('node:fs');
const path = require('node:path');
const { EventEmitter } = require('node:events');

// Append every intercepted request (method, path, body — never headers, so no
// credentials land in the log) to a file used as proof of what the route sent.
const LOG = path.join(__dirname, 'stripe-requests.log');

const HOST = 'api.stripe.com';

const SESSIONS = {
  cs_test_unpaid1: { payment_status: 'unpaid', product: 'guide-hire-first-ai-employee' },
  cs_test_paidguide1: { payment_status: 'paid', product: 'guide-hire-first-ai-employee' },
  cs_test_paidprompt1: { payment_status: 'paid', product: 'prompt-pack-small-business' },
  cs_test_paidadmin1: { payment_status: 'paid', product: 'admin-weekend-automation' },
  cs_test_paidacc1: { payment_status: 'paid', product: 'ai-for-accountants' },
  cs_test_paidunknown1: { payment_status: 'paid', product: 'not-a-known-product' },
};

function route(method, path) {
  if (method === 'POST' && path.startsWith('/v1/checkout/sessions')) {
    return [200, { id: 'cs_test_stubcreated1', url: 'https://checkout.stripe.com/c/pay/cs_test_stubcreated1' }];
  }
  const m = /^\/v1\/checkout\/sessions\/([^/?]+)$/.exec(path);
  if (method === 'GET' && m) {
    const found = SESSIONS[m[1]];
    if (!found) {
      return [404, { error: { message: `Unrecognized request URL: GET /v1/checkout/sessions/${m[1]}` } }];
    }
    return [200, { id: m[1], payment_status: found.payment_status, metadata: { product: found.product } }];
  }
  return [404, { error: { message: `Unrecognized request URL: ${method} ${path}` } }];
}

function makeResponse(statusCode, body) {
  const payload = JSON.stringify(body);
  const res = new EventEmitter();
  res.statusCode = statusCode;
  res.headers = { 'content-type': 'application/json', 'stripe-should-retry': 'false' };
  res.setEncoding = () => res;
  res.pause = () => res;
  res.resume = () => res;
  // setImmediate (not nextTick) so the SDK's promise chain attaches its
  // 'data'/'end' listeners before the body is delivered.
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
  const path = opts.path || '/';
  const req = new EventEmitter();
  req.method = method;
  req.path = path;
  req.setTimeout = () => req;
  let captured = '';
  req.write = (chunk) => { if (chunk !== undefined && chunk !== null) captured += String(chunk); return true; };
  req.end = () => {
    const [status, body] = route(method, path);
    try {
      fs.appendFileSync(LOG, `${new Date().toISOString()} ${method} ${path} ${captured}\n`);
    } catch { /* proof log is best-effort */ }
    process.nextTick(() => {
      const res = makeResponse(status, body);
      req.emit('response', res);
      if (typeof callback === 'function') callback(res);
    });
    return req;
  };
  req.destroy = (err) => {
    if (err) process.nextTick(() => req.emit('error', err));
    return req;
  };
  process.nextTick(() => req.emit('socket', { connecting: false }));
  return req;
}

for (const mod of [https, require('node:http')]) {
  const original = mod.request.bind(mod);
  mod.request = function patched(input, ...rest) {
    const opts = typeof input === 'string' || input instanceof URL ? new URL(input) : input;
    const host = opts.host || opts.hostname;
    if (host === HOST) return stubRequest(typeof input === 'string' || input instanceof URL ? input : opts, rest[0]);
    return original(input, ...rest);
  };
}

console.log('[stripe-api-stub] api.stripe.com -> in-process stub (local proof only)');
