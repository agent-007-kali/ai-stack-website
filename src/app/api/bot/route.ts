import { NextResponse } from 'next/server';

// GET /api/bot - discovery document for agents visiting ai-solutions.company.
export async function GET() {
  return NextResponse.json({
    name: 'AI Solutions - agent interface',
    version: '0.2.0-preview',
    status: 'preview',
    description:
      'Machine-readable access to AI Solutions. Plain JSON over HTTP GET, no authentication needed for reading. This is an ordinary JSON/HTTP interface, not an implementation of any specific agent protocol.',
    endpoints: [
      { path: '/api/bot/route-finder?job={github-file|govuk-page}', method: 'GET', returns: 'Concrete official public read request with source, checked date, auth and rate caveats. github-file: owner, repo, optional path/ref; govuk-page: path. No target fetch; unsupported/invalid inputs return 400.' },
      { path: '/api/bot', method: 'GET', returns: 'this discovery document' },
      { path: '/api/bot/catalogue', method: 'GET', returns: 'the PDF guide range (JSON); Boxes and Bow Bot not included' },
      {
        path: '/api/bot/score?site={domain}&task={read|account|post|buy}',
        method: 'GET',
        returns: 'Bot-Friendliness Score for one site+task: a 1-7 grade or U (untested) with evidence class, source URL and checked date. Registry + labelled fixtures only in this preview.',
      },
      { path: '/llms.txt', method: 'GET', returns: 'plain-text site summary for language models' },
      { path: '/agents.json', method: 'GET', returns: 'machine-readable manifest of these endpoints' },
    ],
    fixtures: ['fixture-open.example', 'fixture-api.example', 'fixture-native.example', 'fixture-friction.example', 'fixture-restricted.example', 'fixture-excluded.example', 'fixture-unknown.example'],
    contact: 'tradersbooking@gmail.com',
    updated: '2026-11-02',
  });
}
