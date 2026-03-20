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
1. Be conversational and helpful - like a friendly expert advisor
2. Recommend specific products based on customer needs
3. Always suggest add-ons that complement what they're buying
4. Keep responses concise (2-3 sentences max)
5. End with a clear next step or question
6. When mentioning prices, be confident about the value

Format your response as JSON with these fields:
{
  "response": "your conversational response",
  "recommendedFeatures": ["feature-id-1"],
  "suggestedStack": "stack-id or null",
  "quickReplies": ["suggestion 1", "suggestion 2"]
}`;

async function queryOpenClaw(message: string, sessionId?: string): Promise<{response: string; recommendedFeatures: string[]; suggestedStack: string | null; quickReplies: string[]}> {
  const session = sessionId || 'website-' + Date.now();
  
  try {
    // Try the OpenClaw messages API
    const response = await fetch(`${OPENCLAW_API_URL}/api/sessions/${session}/messages`, {
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
      }),
      signal: AbortSignal.timeout(30000)
    });

    if (!response.ok) {
      throw new Error('OpenClaw API error');
    }

    const data = await response.json();
    let content = data.message?.content || data.response || '';
    
    // Try to parse as JSON
    try {
      return JSON.parse(content);
    } catch {
      return {
        response: content,
        recommendedFeatures: [],
        suggestedStack: null,
        quickReplies: ['Tell me more about pricing', 'Show me the features', 'I need help getting started']
      };
    }
  } catch (error) {
    console.error('OpenClaw error:', error);
    return generateLocalResponse(message);
  }
}

function generateLocalResponse(message: string): {response: string; recommendedFeatures: string[]; suggestedStack: string | null; quickReplies: string[]} {
  const lowerMsg = message.toLowerCase();
  
  if (lowerMsg.includes('price') || lowerMsg.includes('cost') || lowerMsg.includes('how much')) {
    return {
      response: "Our features range from $19-99/month. Individual modules let you pay only for what you need. What's your monthly budget for AI tools?",
      recommendedFeatures: [],
      suggestedStack: null,
      quickReplies: ['$50/mo budget', '$100/mo budget', 'Show me all features']
    };
  }
  
  if (lowerMsg.includes('chatbot') || lowerMsg.includes('chat')) {
    return {
      response: "Our AI Chatbot ($49/mo) is perfect for handling customer inquiries 24/7. It learns from your knowledge base and can handle 80% of questions automatically. Want me to add it to your stack?",
      recommendedFeatures: ['ai-chatbot'],
      suggestedStack: null,
      quickReplies: ['Yes, add it!', 'What can it learn?', 'Show me a demo']
    };
  }
  
  if (lowerMsg.includes('support') || lowerMsg.includes('customer')) {
    return {
      response: "For customer support, I recommend: AI Chatbot ($49) + Auto Responder ($19) = $68/mo combo. This handles 80% of inquiries while you focus on complex issues. Interested?",
      recommendedFeatures: ['ai-chatbot', 'auto-responder'],
      suggestedStack: null,
      quickReplies: ['Add both!', 'Tell me more', 'Show me the pricing']
    };
  }
  
  if (lowerMsg.includes('lead') || lowerMsg.includes('sales') || lowerMsg.includes('prospect')) {
    return {
      response: "Our Lead Qualifier ($29/mo) automatically scores and routes your leads. Combined with Email Automation ($29), you'll never miss a hot lead. Want me to set this up?",
      recommendedFeatures: ['lead-qualifier', 'email-automation'],
      suggestedStack: null,
      quickReplies: ['Add both!', 'How does scoring work?', 'Show me more']
    };
  }
  
  if (lowerMsg.includes('book') || lowerMsg.includes('schedule') || lowerMsg.includes('appointment')) {
    return {
      response: "The Booking Agent ($39/mo) handles scheduling automatically. It integrates with your calendar, sends reminders, and even reschedules when needed. Should I add it to your stack?",
      recommendedFeatures: ['booking-agent'],
      suggestedStack: null,
      quickReplies: ['Yes, add it!', 'What calendars?', 'Show me features']
    };
  }
  
  if (lowerMsg.includes('analytics') || lowerMsg.includes('data') || lowerMsg.includes('report')) {
    return {
      response: "Our AI Analytics ($49/mo) gives you real-time insights and predictions. It spots trends before they happen and creates custom reports automatically. Want to see a demo?",
      recommendedFeatures: ['analytics'],
      suggestedStack: null,
      quickReplies: ['Add it!', 'What predictions?', 'Show me reports']
    };
  }
  
  if (lowerMsg.includes('email') || lowerMsg.includes('automation')) {
    return {
      response: "Email Automation ($29/mo) creates smart drip campaigns that personalize at scale. Combined with SMS Notifications ($19), you'll reach customers everywhere. Should I bundle these?",
      recommendedFeatures: ['email-automation', 'sms-notifications'],
      suggestedStack: null,
      quickReplies: ['Bundle them!', 'What is drip?', 'Show me more']
    };
  }
  
  if (lowerMsg.includes('ecommerce') || lowerMsg.includes('shop') || lowerMsg.includes('store')) {
    return {
      response: "For e-commerce, I recommend our E-Commerce Stack ($89/mo): AI Chatbot + Analytics + Email + SMS. Together they increase conversions and reduce cart abandonment. Want to learn more?",
      recommendedFeatures: [],
      suggestedStack: 'ecommerce',
      quickReplies: ['Get the stack!', 'What does it include?', 'Show me details']
    };
  }
  
  if (lowerMsg.includes('fitness') || lowerMsg.includes('gym') || lowerMsg.includes('trainer')) {
    return {
      response: "Our Fitness Coach Stack ($79/mo) is perfect for you: Booking Agent + Auto Responder + SMS + Lead Qualifier. Everything you need to manage clients automatically. Interested?",
      recommendedFeatures: [],
      suggestedStack: 'fitness',
      quickReplies: ['Get the stack!', 'What can it do?', 'Show me pricing']
    };
  }
  
  if (lowerMsg.includes('consultant') || lowerMsg.includes('consulting')) {
    return {
      response: "The Consultant Stack ($69/mo) includes Lead Qualifier + Booking + Email + Custom Training. Everything you need to qualify and onboard clients faster. Want me to add this stack?",
      recommendedFeatures: [],
      suggestedStack: 'consultant',
      quickReplies: ['Get the stack!', 'What training?', 'Show me more']
    };
  }
  
  if (lowerMsg.includes('saas') || lowerMsg.includes('software')) {
    return {
      response: "For SaaS, check out our SaaS Stack ($99/mo): AI Chatbot + Analytics + CRM + Custom Training. Perfect for reducing churn and increasing customer LTV. Interested?",
      recommendedFeatures: [],
      suggestedStack: 'saas',
      quickReplies: ['Get the stack!', 'How does CRM work?', 'Show me pricing']
    };
  }
  
  if (lowerMsg.includes('start') || lowerMsg.includes('begin') || lowerMsg.includes('help')) {
    return {
      response: "I'll help you build your perfect AI stack! Tell me about your business - are you handling customer support, generating leads, or looking for automation?",
      recommendedFeatures: [],
      suggestedStack: null,
      quickReplies: ['I need support', 'I need leads', 'I need automation']
    };
  }
  
  return {
    response: "Based on your needs, I think you'd love our AI Chatbot ($49/mo) + Lead Qualifier ($29) combo. It's our most popular setup for businesses. Want me to add these to your stack?",
    recommendedFeatures: ['ai-chatbot', 'lead-qualifier'],
    suggestedStack: null,
    quickReplies: ['Add both!', 'Tell me more', 'Show me all features']
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: ChatRequest = await request.json();
    const { message, sessionId, context } = body;

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const result = await queryOpenClaw(message, sessionId);

    return NextResponse.json({
      ...result,
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
