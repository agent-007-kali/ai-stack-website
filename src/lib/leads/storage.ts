// Server-side order storage for POST /api/leads.
//
// The order is appended as one JSON line to a server-side JSON log. The log is
// NOT publicly readable: there is no GET handler and the file lives outside the
// static bundle. On a serverless host the filesystem is ephemeral, so the same
// record is also written to the function log (structured JSON) so the owner can
// retrieve orders from the host's logs.
//
// Rollback / visibility: see the PR notes. A follow-up task can wire the
// email in ./notify.ts to forward each record to CONTACT_EMAIL.

import { randomBytes } from 'node:crypto';
import { mkdir, appendFile } from 'node:fs/promises';
import path from 'node:path';

import type { OrderRequest, OrderRecord } from './schema';

const LOG_DIR_ENV = 'LEADS_LOG_DIR';

/** Reference shown to the visitor, e.g. AIS-261016-4F9K. */
export function generateReference(now = new Date()): string {
  const yy = String(now.getUTCFullYear()).slice(-2);
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(now.getUTCDate()).padStart(2, '0');
  const suffix = randomBytes(3).toString('hex').toUpperCase().slice(0, 4);
  return `AIS-${yy}${mm}${dd}-${suffix}`;
}

function logPath(): string {
  const dir = process.env[LOG_DIR_ENV] || path.join(process.cwd(), 'var', 'leads');
  return path.join(dir, 'orders.jsonl');
}

export function toOrderRecord(order: OrderRequest, reference: string, now = new Date()): OrderRecord {
  return { ...order, reference, createdAt: now.toISOString() };
}

export interface StoreResult {
  persisted: boolean;
  path?: string;
}

/**
 * Append the order to the server-side JSON log. Best-effort: a read-only or
 * ephemeral filesystem must not lose the order for the visitor, so a failure
 * still returns the reference and the record is emitted to the function log.
 */
export async function storeOrder(record: OrderRecord): Promise<StoreResult> {
  const line = JSON.stringify(record);
  // Structured host log - retrievable without filesystem access.
  console.log(`[order] ${line}`);

  const file = logPath();
  try {
    await mkdir(path.dirname(file), { recursive: true });
    await appendFile(file, line + '\n', 'utf8');
    return { persisted: true, path: file };
  } catch {
    return { persisted: false };
  }
}
