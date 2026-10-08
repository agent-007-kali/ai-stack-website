import { NextRequest, NextResponse } from 'next/server';
import { validateLead } from '@/lib/leads/schema';
import { createLeadStorage, toLeadRecord } from '@/lib/leads/storage';

const MAX_BODY_SIZE = 10 * 1024; // 10KB
const noticeVersion = '1.0-preview';

export async function POST(req: NextRequest) {
  try {
    const contentLength = req.headers.get('content-length');
    if (contentLength && parseInt(contentLength, 10) > MAX_BODY_SIZE) {
      return NextResponse.json(
        { error: 'Payload too large' },
        { status: 413 }
      );
    }

    const contentType = req.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return NextResponse.json(
        { error: 'Invalid content type' },
        { status: 400 }
      );
    }

    const body = await req.json();
    const validated = validateLead(body);

    if (!validated) {
      return NextResponse.json(
        { error: 'Invalid lead data' },
        { status: 400 }
      );
    }

    const storage = createLeadStorage();
    const stored = await storage.save(validated);
    const record = toLeadRecord(stored);

    return NextResponse.json(
      {
        success: true,
        record,
        noticeVersion,
        preview: true,
        message: 'Preview only - no live submission sent',
      },
      { status: 200 }
    );
  } catch (err) {
    console.error('leads API error:', err);
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    );
  }
}
