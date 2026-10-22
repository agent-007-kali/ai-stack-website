// AI Money Club data (issue #52). Whop links are live (owner comment,
// 21 Oct 20:50 BST) - constants at the top of the data file as specced;
// both join buttons are EXTERNAL links to Whop (never Stripe checkout).
// Copy rules: honest framing, no income promises, no fake scarcity,
// benefits phrased as what members receive.

export const CLUB_MONTHLY_WHOP_URL = 'https://whop.com/ai-solutions-company/products/ai-money-club-7d/';
export const CLUB_FREE_WHOP_URL = 'https://whop.com/ai-solutions-company/products/ai-money-club-free/';

export type ClubTier = {
  id: 'free' | 'monthly';
  name: string;
  price: string;
  priceNote: string;
  blurb: string;
  benefits: string[];
  cta: string;
  href: string;
};

export const CLUB_TIERS: ClubTier[] = [
  {
    id: 'free',
    name: 'Free tier',
    price: 'Free',
    priceNote: 'no card needed',
    blurb: 'Start with the Monday idea and the free Starter Plan guide. Join free on Whop.',
    benefits: [
      'The Monday idea - one practical money-with-AI idea every week',
      'Your First £100 With AI - the free Starter Plan guide',
    ],
    cta: 'Join free',
    href: CLUB_FREE_WHOP_URL,
  },
  {
    id: 'monthly',
    name: 'AI Money Club',
    price: '£12/month',
    priceNote: 'cancel anytime',
    blurb: 'The full membership: the week\'s ideas and tools, the members chat on Whop, and 2 guides every month.',
    benefits: [
      'Everything in the free tier',
      'The Monday idea - one idea every week',
      'The Wednesday tool - one tool every week',
      'The Friday honest market note',
      'Exclusive members-only chat on Whop, hosted by Jarvis, our AI - with Neo (the founder) in the room',
      '2 guides of your choice from our guide library every month, emailed to you - the first 2 as soon as you join',
      '30% off all guides, any time, with code CLUB30',
      'Starter Kit bonus - paid members get the Starter Kit on day one',
      'Monthly live Q&A with Jarvis in the members chat',
      'Cancel anytime, managed through Whop',
    ],
    cta: 'Join - £12/month',
    href: CLUB_MONTHLY_WHOP_URL,
  },
];

// Short homepage band copy (Cesar, 21 Oct 20:31 BST - verbatim), plus the
// paid-tier extras line matching the live Whop terms.
export const CLUB_BAND_COPY =
  'One idea every Monday. One tool every Wednesday. One honest market note every Friday. ' +
  'Plus a community chat hosted by Jarvis, our AI - with the founder in the room.';

export const CLUB_BAND_EXTRAS =
  'The £12/month club adds the members-only chat on Whop, 2 guides a month, 30% off all guides with code CLUB30, the Starter Kit bonus and a monthly live Q&A. Cancel anytime.';

export const CLUB_FAQ: { q: string; a: string }[] = [
  {
    q: 'What do I get?',
    a: 'Free: the Monday idea every week and the free Your First £100 With AI Starter Plan guide. At £12/month: everything in free plus the Wednesday tool, the Friday honest market note, the exclusive members-only chat on Whop hosted by Jarvis with Neo (the founder) in the room, 2 guides of your choice every month (the first 2 as soon as you join), 30% off all guides with code CLUB30, the Starter Kit bonus on day one, and a monthly live Q&A with Jarvis. Cancel anytime.',
  },
  {
    q: 'How does billing work?',
    a: 'The club is billed at £12 per month through Whop. Cancel anytime from your Whop account - access runs to the end of the paid period. The free tier needs no card.',
  },
  {
    q: 'Who writes it?',
    a: 'Jarvis, an AI consultant at AI Solutions. The notes and posts are written by Jarvis, with Neo - the founder - in the chat. We say that plainly because it is true.',
  },
  {
    q: 'What about refunds?',
    a: 'Refunds follow Whop\'s terms for this product. Manage your membership, payment and cancellation in Whop.',
  },
];
