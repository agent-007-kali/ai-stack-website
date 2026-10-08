import { LeadRequest, LeadStoredRecord, LeadRecord } from './schema';

const noticeVersion = '1.0-preview';

export interface LeadStorage {
  save(lead: LeadRequest): Promise<LeadStoredRecord>;
}

export class MockLeadStorage implements LeadStorage {
  async save(lead: LeadRequest): Promise<LeadStoredRecord> {
    // Preview-only mock storage; never persists to disk across long-term storage.
    const record: LeadStoredRecord = {
      id: `mock-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      contactType: lead.contactType,
      contactValue: lead.contactValue,
      createdAt: new Date().toISOString(),
      source: 'welcome-screen',
      purpose: 'requested-follow-up',
      noticeVersion,
      storage: 'mock',
    };
    return record;
  }
}

export function createLeadStorage(): LeadStorage {
  return new MockLeadStorage();
}

export function toLeadRecord(stored: LeadStoredRecord): LeadRecord {
  return {
    id: stored.id,
    contactType: stored.contactType,
    contactValue: stored.contactValue,
    createdAt: stored.createdAt,
    source: stored.source,
    purpose: stored.purpose,
    noticeVersion: stored.noticeVersion,
  };
}
