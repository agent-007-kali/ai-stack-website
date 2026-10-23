// Private key-value store for club data (issue #53).
//
// Default backend: PRIVATE Vercel Blob (what production uses).
// Test seam (same pattern as GROQ_API_BASE in bow-relay/groq.ts): when
// CLUB_STORE_DIR is set - a probe or a laptop without BLOB_READ_WRITE_TOKEN -
// records live as files in that directory instead. The variable is never set
// in Vercel, so production behavior is Blob-or-fail, exactly as before.

import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { get, list, put } from '@vercel/blob';

function storeDir(): string | null {
  const dir = (process.env.CLUB_STORE_DIR ?? '').trim();
  return dir || null;
}

async function walk(dir: string, base = ''): Promise<string[]> {
  const out: string[] = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const rel = base ? `${base}/${e.name}` : e.name;
    if (e.isDirectory()) out.push(...(await walk(path.join(dir, e.name), rel)));
    else out.push(rel);
  }
  return out;
}

/** Read one record as text; null when missing (either backend). */
export async function clubStoreGet(
  key: string,
  opts: { noCache?: boolean } = {},
): Promise<string | null> {
  const dir = storeDir();
  if (dir) {
    try {
      return await readFile(path.join(dir, key), 'utf8');
    } catch {
      return null;
    }
  }
  try {
    const blob = await get(
      key,
      opts.noCache ? { access: 'private', useCache: false } : { access: 'private' },
    );
    if (!blob || blob.statusCode !== 200 || !blob.stream) return null;
    return await new Response(blob.stream).text();
  } catch {
    return null;
  }
}

/** Write one record (overwrites). Throws on failure - callers map errors. */
export async function clubStorePut(key: string, text: string): Promise<void> {
  const dir = storeDir();
  if (dir) {
    const full = path.join(dir, key);
    await mkdir(path.dirname(full), { recursive: true });
    await writeFile(full, text, 'utf8');
    return;
  }
  await put(key, text, {
    access: 'private',
    allowOverwrite: true,
    contentType: 'application/json',
  });
}

/** All keys under a prefix (member listing). */
export async function clubStoreList(prefix: string): Promise<string[]> {
  const dir = storeDir();
  if (dir) {
    try {
      const keys = await walk(dir);
      return keys.filter((k) => k.startsWith(prefix));
    } catch {
      return [];
    }
  }
  try {
    const { blobs } = await list({ prefix });
    return blobs.map((b) => b.pathname);
  } catch {
    return [];
  }
}
