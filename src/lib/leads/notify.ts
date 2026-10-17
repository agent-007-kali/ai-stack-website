// Email notification hook for logged orders. INTENTIONALLY INERT.
//
// No email service is configured and none is added here (no Resend, no spend).
// A reply email to CONTACT_EMAIL is described in the UI and the flow works
// without it. To wire email in later, without changing the route contract:
//
//   1. Add an approved provider and set its key in the host environment.
//   2. Implement sendOrderNotification below (e.g. POST to the provider API).
//   3. Set LEAD_NOTIFY_EMAIL_TO to the destination inbox.
//
// Until then this returns { sent: false } and the caller still succeeds: the
// order is captured in the JSON log regardless.

import type { OrderRecord } from './schema';

export const NOTIFY_TO_ENV = 'LEAD_NOTIFY_EMAIL_TO';
export const NOTIFY_KEY_ENV = 'LEAD_NOTIFY_API_KEY';

export interface NotifyResult {
  sent: boolean;
  reason: string;
}

export async function sendOrderNotification(record: OrderRecord): Promise<NotifyResult> {
  if (!process.env[NOTIFY_TO_ENV] || !process.env[NOTIFY_KEY_ENV]) {
    return { sent: false, reason: 'email-not-configured' };
  }
  // A real implementation would send `record` here. Deliberately not wired.
  void record;
  return { sent: false, reason: 'email-not-implemented' };
}
