// Targeted pixel verification for the homepage guide-band screenshots
// (issue #119). Dependency-free PNG decode via node:zlib, then checks that the
// navy band, yellow "See the guide" pill and muted copy text actually painted.
//
// Usage: node scripts/check-band-pixels.mjs <dir>

import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import zlib from 'node:zlib';

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

async function decode(file) {
  const buf = await readFile(file);
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error(`not a png: ${file}`);
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  const bitDepth = buf[24];
  const colorType = buf[25];
  if (bitDepth !== 8 || (colorType !== 2 && colorType !== 6)) throw new Error(`unsupported png: ${file}`);
  const channels = colorType === 6 ? 4 : 3;
  const stride = width * channels;
  let off = 8;
  const idat = [];
  while (off < buf.length) {
    const len = buf.readUInt32BE(off);
    const type = buf.toString('ascii', off + 4, off + 8);
    if (type === 'IDAT') idat.push(buf.subarray(off + 8, off + 8 + len));
    if (type === 'IEND') break;
    off += 12 + len;
  }
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const out = Buffer.alloc(height * stride);
  let pos = 0;
  for (let y = 0; y < height; y++) {
    const filter = raw[pos++];
    const row = raw.subarray(pos, pos + stride);
    pos += stride;
    const o = y * stride;
    for (let x = 0; x < stride; x++) {
      const left = x >= channels ? out[o + x - channels] : 0;
      const up = y > 0 ? out[o + x - stride] : 0;
      const upLeft = y > 0 && x >= channels ? out[o + x - stride - channels] : 0;
      let v = row[x];
      if (filter === 1) v += left;
      else if (filter === 2) v += up;
      else if (filter === 3) v += (left + up) >> 1;
      else if (filter === 4) v += paeth(left, up, upLeft);
      else if (filter !== 0) throw new Error(`unknown filter ${filter}`);
      out[o + x] = v & 0xff;
    }
  }
  return { width, height, channels, stride, data: out };
}

const near = (r, g, b, tr, tg, tb, tol) =>
  Math.abs(r - tr) <= tol && Math.abs(g - tg) <= tol && Math.abs(b - tb) <= tol;

async function check(file) {
  const { width, height, channels, stride, data } = await decode(file);
  let navy = 0;
  let yellow = 0;
  let muted = 0;
  let yellowMinX = Infinity, yellowMaxX = -1, yellowMinY = Infinity, yellowMaxY = -1;
  const total = width * height;
  for (let y = 0; y < height; y++) {
    const o = y * stride;
    for (let x = 0; x < width; x++) {
      const i = o + x * channels;
      const r = data[i], g = data[i + 1], b = data[i + 2];
      if (near(r, g, b, 10, 15, 36, 12)) navy++;
      if (near(r, g, b, 247, 201, 72, 40)) {
        yellow++;
        if (x < yellowMinX) yellowMinX = x;
        if (x > yellowMaxX) yellowMaxX = x;
        if (y < yellowMinY) yellowMinY = y;
        if (y > yellowMaxY) yellowMaxY = y;
      }
      if (near(r, g, b, 167, 176, 216, 45)) muted++;
    }
  }
  return {
    file: path.basename(file),
    width,
    height,
    bytes: (await readFile(file)).length,
    navyPx: navy,
    navyFrac: Number((navy / total).toFixed(3)),
    yellowPx: yellow,
    yellowBox: yellow ? { x0: yellowMinX, x1: yellowMaxX, y0: yellowMinY, y1: yellowMaxY } : null,
    mutedPx: muted,
  };
}

const dir = process.argv[2] || 'evidence/issue-119';
const names = (await readdir(dir)).filter((f) => f.includes('guide-band') && f.endsWith('.png')).sort();
const results = [];
for (const n of names) results.push(await check(path.join(dir, n)));

const checks = [];
for (const r of results) {
  const isDesktop = r.file.startsWith('desktop');
  checks.push({ check: `${r.file}: navy band background present`, pass: r.navyFrac >= 0.5 });
  checks.push({ check: `${r.file}: yellow "See the guide" pill painted`, pass: r.yellowPx >= 3000 });
  checks.push({ check: `${r.file}: muted copy text painted`, pass: r.mutedPx >= 200 });
  if (r.yellowBox) {
    checks.push({
      check: `${r.file}: pill on the expected side`,
      pass: isDesktop ? r.yellowBox.x0 > r.width / 2 : r.yellowBox.x0 < r.width / 2,
    });
    checks.push({ check: `${r.file}: pill inside the band vertically`, pass: r.yellowBox.y0 > 0 && r.yellowBox.y1 < r.height });
  } else {
    checks.push({ check: `${r.file}: pill box exists`, pass: false });
  }
}

console.log(JSON.stringify({ results, checks }, null, 2));
if (checks.some((c) => !c.pass)) process.exit(1);
