import { Feature } from '@/store/cart';

export const features: Feature[] = [
  {
    id: 'ai-chatbot',
    name: 'AI Chatbot',
    description: 'Custom-trained on your data. Handles 80% of inquiries automatically.',
    price: 49,
    category: 'chat',
    icon: '💬',
    demo: [
      'Customer: "Do you handle refunds?"',
      'Bot: "Yes! I can process refunds 24/7. Initiate for order #12345?"',
      'Customer: "What\'s your return policy?"',
      'Bot: "30-day returns. I\'ll generate a return label instantly."'
    ],
    benefits: ['Trained on your knowledge base', 'Handles 80% of inquiries', '50+ languages', '99.9% uptime']
  },
  {
    id: 'lead-qualifier',
    name: 'Lead Qualifier',
    description: 'Scores and routes your leads automatically. Never miss a hot lead.',
    price: 29,
    category: 'automation',
    icon: '🎯',
    demo: [
      'New lead: "I need enterprise features"',
      'AI: "Scoring lead... Priority: HIGH"',
      'Routing to sales team via Slack',
      'Calendar invite sent automatically'
    ],
    benefits: ['Auto-scoring (1-100)', 'Slack/Email alerts', 'CRM sync', 'Follow-up sequences']
  },
  {
    id: 'auto-responder',
    name: 'Auto Responder',
    description: '24/7 instant responses. Never leave a customer waiting.',
    price: 19,
    category: 'automation',
    icon: '⚡',
    demo: [
      'Customer: "What are your hours?"',
      'Bot: "We\'re open 24/7! How can I help?"',
      'Customer: "I need help with my order"',
      'Bot: "I\'ll connect you with order #98765. One moment!"'
    ],
    benefits: ['Instant replies', 'Smart routing', 'Template library', 'Multi-channel']
  },
  {
    id: 'booking-agent',
    name: 'Booking Agent',
    description: 'AI schedules meetings. Integrates with your calendar.',
    price: 39,
    category: 'automation',
    icon: '📅',
    demo: [
      'Customer: "I want to book a demo"',
      'Bot: "Great! Available slots: Today 3PM, Tomorrow 10AM, 2PM"',
      'Customer: "Tomorrow 10AM works"',
      'Bot: "Confirmed! Calendar invite sent. See you then!"'
    ],
    benefits: ['Calendar integration', 'Timezone smart', 'Reminders sent', 'Rescheduling']
  },
  {
    id: 'analytics',
    name: 'AI Analytics',
    description: 'Real-time insights. Predictive analytics powered by AI.',
    price: 49,
    category: 'analytics',
    icon: '📊',
    demo: [
      '📈 Traffic up 34% this week',
      '🔮 Predicted: Peak hours 2-4PM',
      '⚠️ Anomaly: Cart abandonment spike',
      '💡 Recommendation: Add urgency messaging'
    ],
    benefits: ['Real-time dashboards', 'AI predictions', 'Custom reports', 'Export options']
  },
  {
    id: 'email-automation',
    name: 'Email Automation',
    description: 'Smart drip campaigns. Personalized at scale.',
    price: 29,
    category: 'marketing',
    icon: '📧',
    demo: [
      'Trigger: New subscriber',
      'Email 1: Welcome (immediate)',
      'Email 2: "Top 5 tips" (Day 2)',
      'Email 3: "Special offer" (Day 5)'
    ],
    benefits: ['Visual workflows', 'A/B testing', 'Segmentation', 'Analytics']
  },
  {
    id: 'sms-notifications',
    name: 'SMS Notifications',
    description: 'Text message alerts. 98% open rate.',
    price: 19,
    category: 'marketing',
    icon: '📱',
    demo: [
      '📱 "Your order #123 shipped! Track: link.com"',
      '📱 "Reminder: Appointment tomorrow at 3PM"',
      '📱 "Flash sale! 24 hours only. Shop now!"',
      '📱 "We miss you! 10% off your return."'
    ],
    benefits: ['98% open rate', 'Bulk messaging', 'Templates', 'Opt-out handling']
  },
  {
    id: 'social-auto-post',
    name: 'Social Auto-Post',
    description: 'AI content scheduler. Posts when your audience is active.',
    price: 29,
    category: 'marketing',
    icon: '🤖',
    demo: [
      '📝 "Generating content ideas..."',
      '🎨 "Created 5 posts for this week"',
      '⏰ "Scheduled: Mon 9AM, Wed 12PM, Fri 3PM"',
      '📊 "Best time to post: 12PM weekdays"'
    ],
    benefits: ['AI content creation', 'Best time posting', 'Multi-platform', 'Hashtag optimization']
  },
  {
    id: 'crm-integration',
    name: 'CRM Integration',
    description: 'Sync all your tools. Single source of truth.',
    price: 39,
    category: 'integrations',
    icon: '🔗',
    demo: [
      '🔄 Syncing HubSpot...',
      '✅ 150 contacts updated',
      '🔄 Syncing Salesforce...',
      '✅ Deals pipeline synced'
    ],
    benefits: ['HubSpot', 'Salesforce', 'Pipedrive', 'Custom APIs']
  },
  {
    id: 'custom-training',
    name: 'Custom AI Training',
    description: 'Train on your brand. Voice, tone, and knowledge.',
    price: 99,
    category: 'advanced',
    icon: '🧠',
    demo: [
      '📚 "Training on your docs..."',
      '📊 "Processed 500 pages"',
      '🎯 "Learning your brand voice..."',
      '✅ "AI trained! 95% accuracy"'
    ],
    benefits: ['Your data', 'Your voice', 'Your processes', 'Continuous learning']
  }
];

export const categories = [
  { id: 'all', name: 'All Features', icon: '🧩' },
  { id: 'chat', name: 'Chat', icon: '💬' },
  { id: 'automation', name: 'Automation', icon: '⚡' },
  { id: 'analytics', name: 'Analytics', icon: '📊' },
  { id: 'marketing', name: 'Marketing', icon: '📧' },
  { id: 'integrations', name: 'Integrations', icon: '🔗' },
  { id: 'advanced', name: 'Advanced', icon: '🧠' }
];

export const industryStacks = [
  {
    id: 'fitness',
    name: 'Fitness Coach',
    price: 79,
    features: ['Booking Agent', 'Auto Responder', 'SMS Notifications', 'Lead Qualifier'],
    description: 'Full client management automation'
  },
  {
    id: 'ecommerce',
    name: 'E-Commerce',
    price: 89,
    features: ['AI Chatbot', 'Analytics', 'Email Automation', 'SMS Notifications'],
    description: 'Increase conversions and retention'
  },
  {
    id: 'consultant',
    name: 'Consultant',
    price: 69,
    features: ['Lead Qualifier', 'Booking Agent', 'Email Automation', 'Custom Training'],
    description: 'Qualify and onboard clients faster'
  },
  {
    id: 'saas',
    name: 'SaaS',
    price: 99,
    features: ['AI Chatbot', 'Analytics', 'CRM Integration', 'Custom Training'],
    description: 'Reduce churn, increase LTV'
  }
];
