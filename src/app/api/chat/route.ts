import { NextRequest, NextResponse } from 'next/server';
import { features, industryStacks } from '@/lib/features';

const OPENCLAW_API_URL = process.env.OPENCLAW_API_URL || 'http://localhost:18789';
const OPENCLAW_TOKEN = process.env.OPENCLAW_TOKEN || '';

interface ChatRequest {
  message: string;
  sessionId?: string;
  context?: {
    selectedFeatures?: string[];
    userEmail?: string;
  };
}

const salesPrompt = `You are an expert AI sales consultant for AI Stack Agency. Your job is to help customers build their perfect AI stack.

PRODUCTS:
${features.map(f => `- ${f.name}: $${f.price}/mo - ${f.description}`).join('\n')}

READY-MADE STACKS:
${industryStacks.map(s => `- ${s.name} Stack: $${s.price}/mo - ${s.features.join(', ')}`).join('\n')}

RESPONSE RULES:
1. Be conversational and helpful
2. Recommend specific products based on customer needs
3. Always suggest add-ons that complement what they're buying
4. Keep responses concise (2-3 sentences max)
5. End with a clear next step or question

When recommending, you can suggest:
- Individual features from our catalog
- Ready-made stacks for common use cases
- Custom combinations

Format your response as JSON with these fields:
{
  "response": "your conversational response",
  "recommendedFeatures": ["feature-id-1", "feature-id-2"],
  "suggestedStack": "stack-id or null",
  "quickReplies": ["suggestion 1", "suggestion 2"]
}`;

async function queryOpenClaw(message: string, sessionId?: string): Promise<string> {
  try {
    const response = await fetch(`${OPENCLAW_API_URL}/api/sessions/${sessionId || 'main'}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(OPENCLAW_TOKEN && { 'Authorization': `Bearer ${OPENCLAW_TOKEN}` })
      },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: salesPrompt },
          { role: 'user', content: message }
        ]
      })
    });

    if (!response.ok) {
      throw new Error('OpenClaw API error');
    }

    const data = await response.json();
    return data.message?.content || data.response;
  } catch {
    return generateLocalResponse(message);
  }
}

function generateLocalResponse(message: string): string {
  const lowerMsg = message.toLowerCase();
  
  if (lowerMsg.includes('price') || lowerMsg.includes('cost') || lowerMsg.includes('how much')) {
    return "Our features range from $19-99/month. Individual modules let you pay only for what you need. What's your monthly budget for AI tools?";
  }
  
  if (lowerMsg.includes('chatbot') || lowerMsg.includes('chat')) {
    return "Our AI Chatbot ($49/mo) is perfect for handling customer inquiries 24/7. It learns from your knowledge base and can handle 80% of questions automatically. Want me to add it to your stack?";
  }
  
  if (lowerMsg.includes('support') || lowerMsg.includes('customer')) {
    return "For customer support, I recommend: AI Chatbot ($49) + Auto Responder ($19) = $68/mo combo. This handles 80% of inquiries while you focus on complex issues. Interested?";
  }
  
  if (lowerMsg.includes('lead') || lowerMsg.includes('sales') || lowerMsg.includes('prospect')) {
    return "Our Lead Qualifier ($29/mo) automatically scores and routes your leads. Combined with Email Automation ($29), you'll never miss a hot lead. Want me to set this up?";
  }
  
  if (lowerMsg.includes('book') || lowerMsg.includes('schedule') || lowerMsg.includes('appointment')) {
    return "The Booking Agent ($39/mo) handles scheduling automatically. It integrates with your calendar, sends reminders, and even reschedules when needed. Should I add it to your stack?";
  }
  
  if (lowerMsg.includes('analytics') || lowerMsg.includes('data') || lowerMsg.includes('report')) {
    return "Our AI Analytics ($49/mo) gives you real-time insights and predictions. It spots trends before they happen and creates custom reports automatically. Want to see a demo?";
  }
  
  if (lowerMsg.includes('email') || lowerMsg.includes('automation')) {
    return "Email Automation ($29/mo) creates smart drip campaigns that personalize at scale. Combined with SMS Notifications ($19), you'll reach customers everywhere. Should I bundle these?";
  }
  
  if (lowerMsg.includes('ecommerce') || lowerMsg.includes('shop') || lowerMsg.includes('store')) {
    return "For e-commerce, I recommend our E-Commerce Stack ($89/mo): AI Chatbot + Analytics + Email + SMS. Together they increase conversions and reduce cart abandonment. Want to learn more?";
  }
  
  if (lowerMsg.includes('fitness') || lowerMsg.includes('gym') || lowerMsg.includes('trainer')) {
    return "Our Fitness Coach Stack ($79/mo) is perfect for you: Booking Agent + Auto Responder + SMS + Lead Qualifier. Everything you need to manage clients automatically. Interested?";
  }
  
  if (lowerMsg.includes('consultant') || lowerMsg.includes('consulting')) {
    return "The Consultant Stack ($69/mo) includes Lead Qualifier + Booking + Email + Custom Training. Everything you need to qualify and onboard clients faster. Want me to add this stack?";
  }
  
  if (lowerMsg.includes('saas') || lowerMsg.includes('software')) {
    return "For SaaS, check out our SaaS Stack ($99/mo): AI Chatbot + Analytics + CRM + Custom Training. Perfect for reducing churn and increasing customer LTV. Interested?";
  }
  
  if (lowerMsg.includes('start') || lowerMsg.includes('begin') || lowerMsg.includes('help')) {
    return "I'll help you build your perfect AI stack! Tell me about your business - are you handling customer support, generating leads, or looking for automation?";
  }
  
  return "Based on your needs, I think you'd love our AI Chatbot ($49/mo) + Lead Qualifier ($29) combo. It's our most popular setup for businesses. Want me to add these to your stack?";
}

export async function POST(request: NextRequest) {
  try {
    const body: ChatRequest = await request.json();
    const { message, sessionId, context } = body;

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Use OpenClaw if available, otherwise use local AI logic
    let response: string;
    try {
      response = await queryOpenClaw(message, sessionId);
    } catch {
      response = generateLocalResponse(message);
    }

    // Parse response or return as-is
    let parsed;
    try {
      parsed = JSON.parse(response);
    } catch {
      parsed = {
        response,
        recommendedFeatures: [],
        suggestedStack: null,
        quickReplies: ['Tell me more about pricing', 'Show me the features', 'I need help getting started']
      };
    }

    return NextResponse.json({
      ...parsed,
      sessionId: sessionId || 'main',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
