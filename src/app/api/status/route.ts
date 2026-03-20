import { NextRequest, NextResponse } from 'next/server';

const OPENCLAW_API_URL = process.env.OPENCLAW_API_URL || 'http://localhost:18789';
const OPENCLAW_TOKEN = process.env.OPENCLAW_TOKEN || '';

export async function GET(request: NextRequest) {
  const source = request.nextUrl.searchParams.get('source');
  
  // Check OpenClaw status
  let openclawStatus = 'unavailable';
  let openclawUrl = OPENCLAW_API_URL;
  
  try {
    const response = await fetch(`${OPENCLAW_API_URL}/api/status`, {
      headers: {
        ...(OPENCLAW_TOKEN && { 'Authorization': `Bearer ${OPENCLAW_TOKEN}` })
      },
      signal: AbortSignal.timeout(5000)
    });
    
    if (response.ok) {
      const data = await response.json();
      openclawStatus = 'online';
      openclawUrl = `${OPENCLAW_API_URL} (v${data.version || 'unknown'})`;
    }
  } catch {
    openclawStatus = 'offline';
  }
  
  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      openclaw: {
        status: openclawStatus,
        url: openclawUrl,
        configured: !!OPENCLAW_TOKEN
      },
      website: {
        status: 'online',
        url: 'https://ai-solutions.company'
      }
    },
    message: openclawStatus === 'online' 
      ? 'OpenClaw is connected and ready!' 
      : 'Using built-in AI responses. Configure tunnel for full OpenClaw integration.'
  });
}
