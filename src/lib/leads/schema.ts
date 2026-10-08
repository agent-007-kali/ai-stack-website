export type ContactType = 'email' | 'phone';

export interface LeadRequest {
  contactType: ContactType;
  contactValue: string;
}

export interface LeadRecord {
  id: string;
  contactType: ContactType;
  contactValue: string;
  createdAt: string; // UTC ISO
  source: 'welcome-screen';
  purpose: 'requested-follow-up';
  noticeVersion: string;
}

export interface LeadStoredRecord extends LeadRecord {
  storage: 'mock';
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizePhone(value: string): string {
  // Basic normalization - keep digits and +, spaces, dashes, parens
  return value.trim();
}

function isValidPhone(value: string): boolean {
  const v = value.trim();
  // Require at least 7 chars, allow +, spaces, dashes, parens, digits
  if (v.length < 7) return false;
  const digits = v.replace(/[^\d+]/g, '');
  if (digits.length < 7 || digits.length > 20) return false;
  if (!/^\+?\d+$/.test(digits) && !/^\+\d/.test(v)) {
    // Allow numbers with spaces etc as long as they contain digits
    if (!/\d/.test(v)) return false;
  }
  return true;
}

export function validateLead(payload: unknown): LeadRequest | null {
  if (!payload || typeof payload !== 'object') return null;
  const p = payload as Record<string, unknown>;
  const contactType = p.contactType;
  const contactValue = p.contactValue;

  if (contactType !== 'email' && contactType !== 'phone') return null;
  if (typeof contactValue !== 'string') return null;

  const trimmed = contactValue.trim();
  if (trimmed.length === 0) return null;

  if (contactType === 'email') {
    if (!EMAIL_REGEX.test(trimmed)) return null;
    if (trimmed.length > 200) return null;
    return { contactType, contactValue: trimmed };
  }

  if (contactType === 'phone') {
    if (!isValidPhone(trimmed)) return null;
    if (trimmed.length > 50) return null;
    return { contactType, contactValue: normalizePhone(trimmed) };
  }

  return null;
}
