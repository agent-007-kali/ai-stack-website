import { NextResponse } from 'next/server';

// GET /agents.json - machine-readable manifest of this site's agent interface.
// Plain JSON; not an implementation of any specific agent protocol standard.
export async function GET() {
  return NextResponse.json({
    name: 'ai-solutions.company',
    version: '0.1.0-preview',
    status: 'preview',
    description: 'Agent-facing JSON interface for AI Solutions (guides, Bow Bot, Boxes).',
    interface: { type: 'http-json', auth: 'none-for-reading' },
    endpoints: [
      { path: '/api/bot', method: 'GET', purpose: 'discovery' },
      { path: '/api/bot/catalogue', method: 'GET', purpose: 'PDF guide range catalogue' },
      {
        path: '/api/bot/score',
        method: 'GET',
        purpose: 'bot-friendliness score demonstration',
        parameters: { site: 'domain, required', task: 'read|account|post|buy, default read' },
      },
      { path: '/llms.txt', method: 'GET', purpose: 'plain-text site summary' },
    ],
    contact: 'tradersbooking@gmail.com',
    updated: '2026-11-02',
  });
}
