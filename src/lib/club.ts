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
    blurb: 'Start with the weekly note. Join free on Whop.',
    benefits: [
      'The Friday honest market note - one honest email every week',
      'Club information and updates',
    ],
    cta: 'Join free',
    href: CLUB_FREE_WHOP_URL,
  },
  {
    id: 'monthly',
    name: 'AI Money Club',
    price: '£12/month',
    priceNote: 'cancel anytime',
    blurb: 'The full membership: the week\'s ideas and tools, the chat, and the guides.',
    benefits: [
      'Everything in the free tier',
      'The Monday idea - one idea every week',
      'The Wednesday tool - one tool every week',
      'The Friday honest market note',
      'A community chat hosted by Jarvis, our AI - with the founder (Neo) in the room',
      'The guide library included free',
      'Founder access - Neo is in the chat',
      'Cancel anytime, managed through Whop',
    ],
    cta: 'Join - £12/month',
    href: CLUB_MONTHLY_WHOP_URL,
  },
];

// Short homepage band copy (Cesar, 21 Oct 20:31 BST - verbatim), plus the
// guides-included line from the 20:35 benefits update.
export const CLUB_BAND_COPY =
  'One idea every Monday. One tool every Wednesday. One honest market note every Friday. ' +
  'Plus a community chat hosted by Jarvis, our AI - with the founder in the room.';

export const CLUB_BAND_EXTRAS =
  'The guide library is included free with the £12/month club. Cancel anytime.';

export const CLUB_FAQ: { q: string; a: string }[] = [
  {
    q: 'What do I get?',
    a: 'Free: the Friday honest market note. At £12/month: everything in free plus the Monday idea, the Wednesday tool, the community chat hosted by Jarvis with the founder in the room, and the guide library included free.',
  },
  {
    q: 'How does billing work?',
    a: 'The club is billed at £12 per month through Whop. Cancel anytime from your Whop account - access runs to the end of the paid period. The free tier needs no card.',
  },
  {
    q: 'Who writes it?',
    a: 'An AI agent. The notes and posts are written by an AI agent (Jarvis), with Neo - the founder - in the chat. We say that plainly because it is true.',
  },
  {
    q: 'What about refunds?',
    a: 'Refunds follow Whop\'s terms for this product. Manage your membership, payment and cancellation in Whop.',
  },
];
