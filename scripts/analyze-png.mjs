// Dependency-free PNG pixel check: decodes each screenshot with node:zlib and
// reports size, dimensions and luminance spread so blank/near-uniform captures
// are caught without needing an image viewer.
//
// Usage: node scripts/analyze-png.mjs <dir>

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

async function analyze(file) {
  const buf = await readFile(file);
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error(`not a png: ${file}`);
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  const bitDepth = buf[24];
  const colorType = buf[25];
  if (bitDepth !== 8 || (colorType !== 2 && colorType !== 6)) {
    return { file, width, height, bytes: buf.length, skipped: `colorType=${colorType}` };
  }
  const channels = colorType === 6 ? 4 : 3;
  const stride = width * channels;

  // Concatenate IDAT chunks.
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

  // Un-filter scanlines.
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

  // Sample luminance grid (every 4th pixel) and compute mean/stddev + colour spread.
  let n = 0;
  let sum = 0;
  let sumSq = 0;
  const colors = new Set();
  for (let y = 0; y < height; y += 4) {
    for (let x = 0; x < width; x += 4) {
      const i = y * stride + x * channels;
      const r = out[i];
      const g = out[i + 1];
      const b = out[i + 2];
      const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      sum += lum;
      sumSq += lum * lum;
      n++;
      colors.add(((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3));
    }
  }
  const mean = sum / n;
  const stddev = Math.sqrt(Math.max(0, sumSq / n - mean * mean));
  return {
    file: path.basename(file),
    width,
    height,
    bytes: buf.length,
    meanLuma: Number(mean.toFixed(1)),
    stddevLuma: Number(stddev.toFixed(1)),
    sampledColors: colors.size,
    blank: stddev < 5 || colors.size < 8,
  };
}

const dir = process.argv[2] || 'evidence/sales-agent';
const files = (await readdir(dir)).filter((f) => f.endsWith('.png')).sort();
const results = [];
for (const f of files) results.push(await analyze(path.join(dir, f)));
console.log(JSON.stringify(results, null, 2));
const bad = results.filter((r) => r.blank || r.skipped);
if (bad.length) {
  console.error(`BLANK/UNREADABLE: ${bad.map((b) => b.file).join(', ')}`);
  process.exit(1);
}
