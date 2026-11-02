import { NextResponse } from 'next/server';

// GET /llms.txt - plain-text summary of this site for language-model agents.
const BODY = `# AI Solutions

AI Solutions sells practical PDF guides, a WhatsApp AI agent (Bow Bot) and
custom-built AI setups for small businesses. Main site: https://ai-solutions.company/

## For agents

This site exposes an ordinary JSON-over-HTTP interface (no specific agent
protocol is claimed):

- /api/bot - discovery document (JSON)
- /api/bot/catalogue - machine-readable list of the PDF guide range (JSON)
- /api/bot/score?site={domain}&task={read|account|post|buy} - Bot-Friendliness
  Score demonstration: 1-7 or U with evidence class, source URL and date (JSON)
- /agents.json - machine-readable manifest of the above

Reading endpoints need no authentication. Buying is a human-authorised action
through the site's normal checkout; agents should hand off to their owner.

## Contact

tradersbooking@gmail.com
`;

export async function GET() {
  return new NextResponse(BODY, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
