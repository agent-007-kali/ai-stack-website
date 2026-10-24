// Private key-value store for club data (issue #53).
//
// Default backend: PRIVATE Vercel Blob (what production uses).
// Test seam (same pattern as GROQ_API_BASE in bow-relay/groq.ts): when
// CLUB_STORE_DIR is set - a probe or a laptop without BLOB_READ_WRITE_TOKEN -
// records live as files in that directory instead. The variable is never set
// in Vercel, so production behavior is Blob-or-fail, exactly as before.

import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { get, head, list, put, BlobPreconditionFailedError } from '@vercel/blob';

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

export type ClubStoreGetResult = { text: string; etag: string } | null;

/** Read one record with metadata for conditional writes. */
export async function clubStoreGetWithMeta(
  key: string,
  opts: { noCache?: boolean } = {},
): Promise<ClubStoreGetResult> {
  const dir = storeDir();
  if (dir) {
    try {
      const full = path.join(dir, key);
      const text = await readFile(full, 'utf8');
      const stat = await import('node:fs/promises').then((m) => m.stat(full));
      return { text, etag: String(stat.mtimeMs) };
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
    const text = await new Response(blob.stream).text();
    let etag = (blob as any).etag;
    if (!etag && (blob as any).headers) {
      const h = (blob as any).headers;
      etag = typeof h.get === 'function' ? h.get('etag') || h.get('ETag') : h.etag || h['etag'];
    }
    if (!etag) {
      try {
        const h = await head(key);
        etag = (h as any).etag || (h as any).headers?.get?.('etag');
      } catch {
        // ignore
      }
    }
    return { text, etag: etag || '' };
  } catch {
    return null;
  }
}

/** Read one record as text; null when missing (either backend). */
export async function clubStoreGet(
  key: string,
  opts: { noCache?: boolean } = {},
): Promise<string | null> {
  const res = await clubStoreGetWithMeta(key, opts);
  return res ? res.text : null;
}

/** Write one record with optional conditional write (ifMatch). Throws on failure. */
export async function clubStorePut(
  key: string,
  text: string,
  opts: { ifMatch?: string } = {},
): Promise<void> {
  const dir = storeDir();
  if (dir) {
    const full = path.join(dir, key);
    await mkdir(path.dirname(full), { recursive: true });
    if (opts.ifMatch) {
      try {
        const stat = await import('node:fs/promises').then((m) => m.stat(full));
        const current = String(stat.mtimeMs);
        if (current !== opts.ifMatch) {
          throw new BlobPreconditionFailedError();
        }
      } catch (e: any) {
        if (e instanceof BlobPreconditionFailedError) throw e;
        // if missing and we expect match? treat as precondition failed for safety
        throw new BlobPreconditionFailedError();
      }
    }
    await writeFile(full, text, 'utf8');
    return;
  }
  try {
    if (opts.ifMatch) {
      await put(key, text, {
        access: 'private',
        allowOverwrite: true,
        contentType: 'application/json',
        ifMatch: opts.ifMatch,
      } as any);
    } else {
      await put(key, text, {
        access: 'private',
        allowOverwrite: true,
        contentType: 'application/json',
      });
    }
  } catch (e: any) {
    if (e?.name === 'BlobPreconditionFailedError' || e instanceof BlobPreconditionFailedError) {
      throw e;
    }
    // Some SDKs might not surface class in same way, rethrow
    throw e;
  }
}

export { BlobPreconditionFailedError };

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
