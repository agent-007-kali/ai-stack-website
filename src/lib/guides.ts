// One shared table for every guide sold on /guide. The page reads the public
// copy and price labels from here; the Stripe checkout and download handlers
// read the private blob path, metadata key and price env from the same rows.
// Nothing here is a secret: prices and blob path names come from env/config.

export type GuideProduct = {
  slug: string;
  title: string;
  description: string;
  bullets: string[];
  /** Public cover image path (served from public/guides/). Absent on the bundle. */
  cover?: string;
  /** Intrinsic cover pixel size, so the <img> reserves space (no layout shift). */
  coverWidth?: number;
  coverHeight?: number;
  /** Checkout Session metadata.product that marks a session as this guide. */
  metaProduct: string;
  /** Private Vercel Blob pathname (served server-side only, never a public URL). */
  blobPathname: string;
  /** Env var holding the one-time price in pence, e.g. "1400". */
  priceEnv: string;
  /** Env var holding the customer-facing price label, e.g. "£14". */
  labelEnv: string;
  /** External Whop product URL (issue #40). When set the card's Buy button
   *  is a plain "Buy on Whop" anchor instead of the internal Stripe checkout
   *  — these editions are sold and fulfilled on Whop, never via
   *  /api/guide/checkout, so they live outside GUIDES (guideBySlug cannot
   *  reach them). */
  whopUrl?: string;
  /** Fixed Whop price label, e.g. "£18.90" (Whop prices are not env-driven). */
  whopPrice?: string;
};

export const GUIDES: GuideProduct[] = [
  {
    slug: 'hire-first-ai-employee',
    title: 'Hire Your First AI Employee',
    description:
      'A practical, honest PDF guide for any small business: what an AI agent is, a 7-day no-code setup plan, 32 copy-paste prompts, safety rules, cost tables, troubleshooting and 10 fill-in templates.',
    bullets: [
      '62-page PDF, instant download after payment',
      'No coding needed',
      'Honest about what agents get wrong. No income or savings promises.',
    ],
    cover: '/guides/hire-first-ai-employee.jpg',
    coverWidth: 440,
    coverHeight: 660,
    metaProduct: 'guide-hire-first-ai-employee',
    blobPathname: 'guide/Hire-Your-First-AI-Employee.pdf',
    priceEnv: 'GUIDE_PRICE_PENCE',
    labelEnv: 'NEXT_PUBLIC_GUIDE_PRICE_LABEL',
  },
  {
    slug: 'prompt-pack',
    title: 'The AI Prompt Pack for Small Business',
    description:
      '100 copy-paste prompts grouped by job — marketing, sales, customer service, writing, admin, money, hiring, planning, learning, trades and shops, and tough situations — plus a six-part method for writing your own, a safety page and a cheat sheet.',
    bullets: [
      '61-page PDF, instant download after payment',
      'No coding needed',
      'No income or savings promises.',
    ],
    cover: '/guides/prompt-pack.jpg',
    coverWidth: 400,
    coverHeight: 600,
    metaProduct: 'prompt-pack-small-business',
    blobPathname: 'prompt-pack/The-AI-Prompt-Pack-for-Small-Business.pdf',
    priceEnv: 'PROMPT_PACK_PRICE_PENCE',
    labelEnv: 'NEXT_PUBLIC_PROMPT_PACK_PRICE_LABEL',
  },
  {
    slug: 'admin-guide',
    title: 'Automate Your Admin in a Weekend',
    description:
      'Ten step-by-step n8n workflow recipes for small-business admin: enquiries to a sheet, daily digest, invoice reminders, booking reminders, onboarding checklist, weekly numbers, review requests, saving attachments, content reminders and AI-drafted replies for your approval — with a weekend plan, safe setup, error handling, troubleshooting and 7 fill-in templates. Step-by-step instructions, not importable workflow files.',
    bullets: [
      '63-page PDF, step-by-step instructions, not importable workflow files',
      'No coding needed',
      'No income or savings promises.',
    ],
    cover: '/guides/admin-guide.jpg',
    coverWidth: 400,
    coverHeight: 600,
    metaProduct: 'admin-weekend-automation',
    blobPathname: 'admin-guide/Automate-Your-Admin-in-a-Weekend.pdf',
    priceEnv: 'ADMIN_GUIDE_PRICE_PENCE',
    labelEnv: 'NEXT_PUBLIC_ADMIN_GUIDE_PRICE_LABEL',
  },
  {
    slug: 'accountants-guide',
    title: 'AI for Accountants and Bookkeepers',
    description:
      'Where AI helps and where it does not, how to protect client data, 64 prompts for client emails, month-end, spreadsheets, review and practice management, a five-pass checking routine, and templates for an AI policy, tool check and use log. Not tax, legal or accounting advice.',
    bullets: [
      '65-page PDF, instant download after payment',
      'No coding needed',
      'Not tax, legal or accounting advice. No income or savings promises.',
    ],
    cover: '/guides/accountants-guide.jpg',
    coverWidth: 400,
    coverHeight: 600,
    metaProduct: 'ai-for-accountants',
    blobPathname: 'accountants-guide/AI-for-Accountants-and-Bookkeepers.pdf',
    priceEnv: 'ACCOUNTANTS_GUIDE_PRICE_PENCE',
    labelEnv: 'NEXT_PUBLIC_ACCOUNTANTS_GUIDE_PRICE_LABEL',
  },
  {
    slug: 'car-dealers-guide',
    title: 'AI for Car Dealers',
    description:
      'A practical, honest PDF guide for independent car dealers: where AI helps a small dealership and where it does not, a one-week starter plan, copy-paste prompts for listings and adverts, enquiries, follow-ups, reviews and after-sale, the legal lines you must not cross, safety rules and fill-in templates.',
    bullets: [
      '34-page PDF, instant download after payment',
      'No coding needed',
      'No income or savings promises.',
    ],
    cover: '/guides/ai-for-car-dealers.jpg',
    coverWidth: 1695,
    coverHeight: 886,
    metaProduct: 'ai-for-car-dealers',
    blobPathname: 'car-dealers-guide/AI-for-Car-Dealers.pdf',
    priceEnv: 'CAR_DEALERS_GUIDE_PRICE_PENCE',
    labelEnv: 'NEXT_PUBLIC_CAR_DEALERS_GUIDE_PRICE_LABEL',
  },
  {
    slug: 'coffee-shops-guide',
    title: 'AI for Coffee Shops',
    description:
      'A practical, honest PDF guide for independent coffee shops: where AI helps and where it does not, a one-week starter plan, copy-paste prompts for menus and boards, social posts and local marketing, reviews and customer replies, rotas, suppliers and back office, the legal lines you must not cross, safety rules and fill-in templates.',
    bullets: [
      '41-page PDF, instant download after payment',
      'No coding needed',
      'No income or savings promises.',
    ],
    cover: '/guides/ai-for-coffee-shops.jpg',
    coverWidth: 1695,
    coverHeight: 886,
    metaProduct: 'ai-for-coffee-shops',
    blobPathname: 'coffee-shops-guide/AI-for-Coffee-Shops.pdf',
    priceEnv: 'COFFEE_SHOPS_GUIDE_PRICE_PENCE',
    labelEnv: 'NEXT_PUBLIC_COFFEE_SHOPS_GUIDE_PRICE_LABEL',
  },
  {
    slug: 'barbers-salons-guide',
    title: 'AI for Barbers and Salons',
    description:
      'A practical, honest PDF guide for barbershops and salons: where AI helps and where it does not, a one-week starter plan, copy-paste prompts for DMs, bookings and client messages, posts and captions, reviews, back office and the team, the legal lines you must not cross (including patch-test policy), safety rules and fill-in templates.',
    bullets: [
      '41-page PDF, instant download after payment',
      'No coding needed',
      'No income or savings promises.',
    ],
    cover: '/guides/ai-for-barbers-and-salons.jpg',
    coverWidth: 1695,
    coverHeight: 886,
    metaProduct: 'ai-for-barbers-salons',
    blobPathname: 'barbers-salons-guide/AI-for-Barbers-and-Salons.pdf',
    priceEnv: 'BARBERS_SALONS_GUIDE_PRICE_PENCE',
    labelEnv: 'NEXT_PUBLIC_BARBERS_SALONS_GUIDE_PRICE_LABEL',
  },
];

/** Guide 1 — kept for a bodyless POST /api/guide/checkout, exactly as before. */
export const DEFAULT_GUIDE_SLUG = 'hire-first-ai-employee';

// Fifth product: the four-guide bundle (issue #127). Not part of GUIDES —
// it has no single PDF — but checkout accepts its slug and the download
// handler fans a paid bundle session out to the four individual guides.
export const BUNDLE: GuideProduct = {
  slug: 'bundle-all-four',
  title: 'The original four guides',
  description: 'The four original PDF guides in one purchase. £51 if bought separately, £35 as a bundle.',
  bullets: [
    'The four original PDFs in one purchase',
    'Instant download after payment',
    'No income or savings promises.',
  ],
  cover: '/guides/bundle-all-four.jpg',
  coverWidth: 848,
  coverHeight: 1248,
  metaProduct: 'bundle-all-four',
  blobPathname: '',
  priceEnv: 'BUNDLE_PRICE_PENCE',
  labelEnv: 'NEXT_PUBLIC_BUNDLE_PRICE_LABEL',
};

/** The £35 bundle is exactly these four guides, forever (new guides are not bundled). */
export const BUNDLE_SLUGS: readonly string[] = [
  'hire-first-ai-employee',
  'prompt-pack',
  'admin-guide',
  'accountants-guide',
];

// AI Ahead country editions (issue #40) — sold and fulfilled on Whop, so they
// are their own shelf array, NOT in GUIDES: checkout/download never touch
// them (guideBySlug/guideByMetaProduct only search GUIDES + BUNDLE). Adding
// another country is one data entry: slug, copy, price, Whop URL, cover.
// Stripe-only fields are present but inert (empty blobPathname, unused env
// names) to satisfy the shared GuideProduct type.
// Shelf order: home market first, then rough audience size (owner's call).
export const AI_AHEAD_EDITIONS: GuideProduct[] = [
  {
    slug: 'ai-ahead-uk-edition',
    title: 'AI Ahead: The UK Edition',
    description:
      'The UK-edition AI compliance and marketing guide for small businesses: the DMCC Act, ICO/PECR rules, ASA advertising standards and VAT/HMRC lines around AI-assisted work — honest, practical, and written by an AI agent.',
    bullets: [
      '104 pages',
      'DMCC Act, ICO/PECR, ASA and VAT/HMRC covered',
      'Written by an AI agent. No income or savings promises.',
    ],
    cover: '/guides/ai-ahead-uk-edition.jpg',
    coverWidth: 1695,
    coverHeight: 886,
    metaProduct: 'whop-ai-ahead-uk-edition',
    blobPathname: '',
    priceEnv: '',
    labelEnv: '',
    whopUrl: 'https://whop.com/ai-solutions-company/products/ai-ahead-the-uk-edition/',
    whopPrice: '£18.90',
  },
  {
    slug: 'ai-ahead-usa-edition',
    title: 'AI Ahead: The USA Edition',
    description:
      'The US-edition AI compliance and marketing guide for small businesses: 31 chapters covering the FTC fake-review rule, CAN-SPAM, and the US-specific ways AI claims and reviews get businesses into trouble — with honest, practical guidance on using AI safely.',
    bullets: [
      '99 pages, 31 chapters',
      'FTC fake-review rule and CAN-SPAM covered',
      'Written by an AI agent. No income or savings promises.',
    ],
    cover: '/guides/ai-ahead-usa-edition.jpg',
    coverWidth: 1695,
    coverHeight: 886,
    metaProduct: 'whop-ai-ahead-usa-edition',
    blobPathname: '',
    priceEnv: '',
    labelEnv: '',
    whopUrl: 'https://whop.com/ai-solutions-company/products/ai-ahead-the-usa-edition/',
    whopPrice: '£18.90',
  },
  {
    slug: 'ai-ahead-ireland-edition',
    title: 'AI Ahead: The Ireland Edition',
    description:
      'How Ireland small businesses get ahead with AI — local search, social, reviews, ads, the local rules with sources, a 90-day plan and 60 prompts. Honest. Sourced. No income promises. Instant PDF download.',
    bullets: [
      'Honest, sourced, no income promises',
      'Instant PDF download',
    ],
    cover: '/guides/ai-ahead-ireland-edition.jpg',
    coverWidth: 1695,
    coverHeight: 886,
    metaProduct: 'whop-ai-ahead-ireland-edition',
    blobPathname: '',
    priceEnv: '',
    labelEnv: '',
    whopUrl: 'https://whop.com/ai-solutions-company/products/ai-ahead-the-ireland-edition/',
    whopPrice: '£17.90',
  },
  {
    slug: 'ai-ahead-canada-edition',
    title: 'AI Ahead: The Canada Edition',
    description:
      'How Canada small businesses get ahead with AI — local search, social, reviews, ads, the local rules with sources, a 90-day plan and 60 prompts. Honest. Sourced. No income promises. Instant PDF download.',
    bullets: [
      'Honest, sourced, no income promises',
      'Instant PDF download',
    ],
    cover: '/guides/ai-ahead-canada-edition.jpg',
    coverWidth: 1695,
    coverHeight: 886,
    metaProduct: 'whop-ai-ahead-canada-edition',
    blobPathname: '',
    priceEnv: '',
    labelEnv: '',
    whopUrl: 'https://whop.com/ai-solutions-company/products/ai-ahead-the-canada-edition/',
    whopPrice: '£17.90',
  },
  {
    slug: 'ai-ahead-australia-edition',
    title: 'AI Ahead: The Australia Edition',
    description:
      'The Australia-edition AI compliance and marketing guide for small businesses: ABN/GST obligations, the Spam Act, ACCC rules and OAIC privacy expectations around AI use — written honestly, with the legal lines you must not cross.',
    bullets: [
      '103 pages',
      'ABN/GST, Spam Act, ACCC and OAIC covered',
      'Written by an AI agent. No income or savings promises.',
    ],
    cover: '/guides/ai-ahead-australia-edition.jpg',
    coverWidth: 1695,
    coverHeight: 886,
    metaProduct: 'whop-ai-ahead-australia-edition',
    blobPathname: '',
    priceEnv: '',
    labelEnv: '',
    whopUrl: 'https://whop.com/ai-solutions-company/products/ai-ahead-the-australia-edition/',
    whopPrice: '£17.90',
  },
  {
    slug: 'ai-ahead-new-zealand-edition',
    title: 'AI Ahead: The New Zealand Edition',
    description:
      'How New Zealand small businesses get ahead with AI — local search, social, reviews, ads, the local rules with sources, a 90-day plan and 60 prompts. Honest. Sourced. No income promises. Instant PDF download.',
    bullets: [
      'Honest, sourced, no income promises',
      'Instant PDF download',
    ],
    cover: '/guides/ai-ahead-new-zealand-edition.jpg',
    coverWidth: 1695,
    coverHeight: 886,
    metaProduct: 'whop-ai-ahead-new-zealand-edition',
    blobPathname: '',
    priceEnv: '',
    labelEnv: '',
    whopUrl: 'https://whop.com/ai-solutions-company/products/ai-ahead-the-new-zealand-edition/',
    whopPrice: '£17.90',
  },
  {
    slug: 'ai-ahead-south-africa-edition',
    title: 'AI Ahead: The South Africa Edition',
    description:
      'How South Africa small businesses get ahead with AI — local search, social, reviews, ads, the local rules with sources, a 90-day plan and 60 prompts. Honest. Sourced. No income promises. Instant PDF download.',
    bullets: [
      'Honest, sourced, no income promises',
      'Instant PDF download',
    ],
    cover: '/guides/ai-ahead-south-africa-edition.jpg',
    coverWidth: 1695,
    coverHeight: 886,
    metaProduct: 'whop-ai-ahead-south-africa-edition',
    blobPathname: '',
    priceEnv: '',
    labelEnv: '',
    whopUrl: 'https://whop.com/ai-solutions-company/products/ai-ahead-the-south-africa-edition/',
    whopPrice: '£17.90',
  },
  {
    slug: 'ai-ahead-uae-edition',
    title: 'AI Ahead: The UAE Edition',
    description:
      'How UAE small businesses get ahead with AI — local search, social, reviews, ads, the local rules with sources, a 90-day plan and 60 prompts. Honest. Sourced. No income promises. Instant PDF download.',
    bullets: [
      'Honest, sourced, no income promises',
      'Instant PDF download',
    ],
    cover: '/guides/ai-ahead-uae-edition.jpg',
    coverWidth: 1695,
    coverHeight: 886,
    metaProduct: 'whop-ai-ahead-uae-edition',
    blobPathname: '',
    priceEnv: '',
    labelEnv: '',
    whopUrl: 'https://whop.com/ai-solutions-company/products/ai-ahead-the-uae-edition/',
    whopPrice: '£17.90',
  },
  {
    slug: 'ai-ahead-singapore-edition',
    title: 'AI Ahead: The Singapore Edition',
    description:
      'How Singapore small businesses get ahead with AI — local search, social, reviews, ads, the local rules with sources, a 90-day plan and 60 prompts. Honest. Sourced. No income promises. Instant PDF download.',
    bullets: [
      'Honest, sourced, no income promises',
      'Instant PDF download',
    ],
    cover: '/guides/ai-ahead-singapore-edition.jpg',
    coverWidth: 1695,
    coverHeight: 886,
    metaProduct: 'whop-ai-ahead-singapore-edition',
    blobPathname: '',
    priceEnv: '',
    labelEnv: '',
    whopUrl: 'https://whop.com/ai-solutions-company/products/ai-ahead-the-singapore-edition/',
    whopPrice: '£17.90',
  },
];

// The rest of the Whop shelf (issue #40, owner: "full shelf on the site") —
// same pattern as AI_AHEAD_EDITIONS: Whop-sold, outside GUIDES, one data
// entry per new guide. Newest first (AI Under Attack).
export const WHOP_SHELF: GuideProduct[] = [
  {
    slug: 'ai-under-attack',
    title: 'AI Under Attack: Protect Yourself and Your Business from Hacking',
    description:
      'A practical, honest guide to the AI-era threats small businesses face — phishing, fake voices and video, account takeover — with the defences that actually work and a plain-English setup checklist. No scare tactics. No income promises.',
    bullets: [
      'Covers phishing, fake media and account takeover',
      'Written by an AI agent. No income promises.',
    ],
    cover: '/guides/ai-under-attack.jpg',
    coverWidth: 1695,
    coverHeight: 886,
    metaProduct: 'whop-ai-under-attack',
    blobPathname: '',
    priceEnv: '',
    labelEnv: '',
    whopUrl: 'https://whop.com/ai-solutions-company/products/ai-under-attack-protect-yourself-and-your-business-from-hacking/',
    whopPrice: '£9.90',
  },
  {
    slug: 'ai-for-trades',
    title: 'AI for Trades',
    description:
      'A practical, honest guide for tradespeople: win more jobs with better quotes, reviews and follow-ups, see where AI actually saves time on the tools, and let it draft the paperwork. No coding needed.',
    bullets: [
      'Quotes, reviews, follow-ups and paperwork',
      'Written by an AI agent. No income promises.',
    ],
    cover: '/guides/ai-for-trades.jpg',
    coverWidth: 1695,
    coverHeight: 886,
    metaProduct: 'whop-ai-for-trades',
    blobPathname: '',
    priceEnv: '',
    labelEnv: '',
    whopUrl: 'https://whop.com/ai-solutions-company/ai-for-trades',
    whopPrice: '£14',
  },
  {
    slug: 'ai-for-estate-agents',
    title: 'AI for Estate Agents',
    description:
      'For estate and letting agents: listings and descriptions that stay within the rules, enquiry follow-ups, review handling and valuation support — what AI can and cannot do in property, honestly.',
    bullets: [
      'Listings, enquiries, reviews and valuations',
      'Written by an AI agent. No income promises.',
    ],
    cover: '/guides/ai-for-estate-agents.jpg',
    coverWidth: 1695,
    coverHeight: 886,
    metaProduct: 'whop-ai-for-estate-agents',
    blobPathname: '',
    priceEnv: '',
    labelEnv: '',
    whopUrl: 'https://whop.com/ai-solutions-company/products/ai-for-estate-agents/',
    whopPrice: '£25',
  },
  {
    slug: 'work-with-ai-or-work-for-it',
    title: 'Work With AI or Work for It',
    description:
      'A short, honest book on using AI at work without losing your edge: what to hand over, what to keep, and how to stay the one in charge.',
    bullets: [
      'What to hand over, what to keep',
      'Written by an AI agent. No income promises.',
    ],
    cover: '/guides/work-with-ai-or-work-for-it.jpg',
    coverWidth: 1695,
    coverHeight: 886,
    metaProduct: 'whop-work-with-ai-or-work-for-it',
    blobPathname: '',
    priceEnv: '',
    labelEnv: '',
    whopUrl: 'https://whop.com/ai-solutions-company/products/work-with-ai-or-work-for-it/',
    whopPrice: '£12',
  },
  {
    slug: 'get-paid-faster',
    title: 'Get Paid Faster',
    description:
      'Invoice wording, reminder sequences and payment terms that get small businesses paid sooner — with the AI prompts to automate the chasing, honestly.',
    bullets: [
      'Invoice wording, reminders and payment terms',
      'Written by an AI agent. No income promises.',
    ],
    cover: '/guides/get-paid-faster.jpg',
    coverWidth: 1695,
    coverHeight: 886,
    metaProduct: 'whop-get-paid-faster',
    blobPathname: '',
    priceEnv: '',
    labelEnv: '',
    whopUrl: 'https://whop.com/ai-solutions-company/products/get-paid-faster/',
    whopPrice: '£12',
  },
  {
    slug: 'make-money-with-ai-100-honest-ideas',
    title: 'Make Money With AI: 100 Honest Ideas',
    description:
      '100 realistic ways small businesses and solo operators can make money with AI — each one with what it takes, what it costs, and an honest note on what likely will not work.',
    bullets: [
      '100 ideas, costs and honest caveats',
      'Written by an AI agent. No income promises.',
    ],
    cover: '/guides/make-money-with-ai-100-honest-ideas.jpg',
    coverWidth: 1695,
    coverHeight: 886,
    metaProduct: 'whop-make-money-with-ai-100-honest-ideas',
    blobPathname: '',
    priceEnv: '',
    labelEnv: '',
    whopUrl: 'https://whop.com/ai-solutions-company/products/make-money-with-ai-100-honest-ideas/',
    whopPrice: '£16',
  },
];

function readEnv(name: string): string {
  if (typeof process === 'undefined' || !process.env) return '';
  return process.env[name] || '';
}

export function guideBySlug(slug: string): GuideProduct | undefined {
  if (!slug) return undefined;
  if (slug === BUNDLE.slug) return BUNDLE;
  return GUIDES.find((g) => g.slug === slug);
}

export function guideByMetaProduct(metaProduct: string): GuideProduct | undefined {
  if (!metaProduct) return undefined;
  return GUIDES.find((g) => g.metaProduct === metaProduct);
}

export function guideFilename(guide: GuideProduct): string {
  return guide.blobPathname.split('/').pop() || 'guide.pdf';
}

/** Stripe product_data.name for the checkout line item. */
export function checkoutName(guide: GuideProduct): string {
  return guide.slug === BUNDLE.slug ? 'The original four guides (4 PDFs)' : `${guide.title} (PDF)`;
}

/** One-time price in pence from env; 0 when unset or unusable. */
export function pricePence(guide: GuideProduct): number {
  const n = parseInt(readEnv(guide.priceEnv), 10);
  return Number.isFinite(n) ? n : 0;
}

// NEXT_PUBLIC_ labels are read with literal member expressions so the client
// bundle can inline them at build time (a dynamic process.env[name] cannot be).
export function priceLabel(guide: GuideProduct): string {
  switch (guide.labelEnv) {
    case 'NEXT_PUBLIC_GUIDE_PRICE_LABEL':
      return (process.env.NEXT_PUBLIC_GUIDE_PRICE_LABEL || '').trim();
    case 'NEXT_PUBLIC_PROMPT_PACK_PRICE_LABEL':
      return (process.env.NEXT_PUBLIC_PROMPT_PACK_PRICE_LABEL || '').trim();
    case 'NEXT_PUBLIC_ADMIN_GUIDE_PRICE_LABEL':
      return (process.env.NEXT_PUBLIC_ADMIN_GUIDE_PRICE_LABEL || '').trim();
    case 'NEXT_PUBLIC_ACCOUNTANTS_GUIDE_PRICE_LABEL':
      return (process.env.NEXT_PUBLIC_ACCOUNTANTS_GUIDE_PRICE_LABEL || '').trim();
    case 'NEXT_PUBLIC_CAR_DEALERS_GUIDE_PRICE_LABEL':
      return (process.env.NEXT_PUBLIC_CAR_DEALERS_GUIDE_PRICE_LABEL || '').trim();
    case 'NEXT_PUBLIC_COFFEE_SHOPS_GUIDE_PRICE_LABEL':
      return (process.env.NEXT_PUBLIC_COFFEE_SHOPS_GUIDE_PRICE_LABEL || '').trim();
    case 'NEXT_PUBLIC_BARBERS_SALONS_GUIDE_PRICE_LABEL':
      return (process.env.NEXT_PUBLIC_BARBERS_SALONS_GUIDE_PRICE_LABEL || '').trim();
    case 'NEXT_PUBLIC_BUNDLE_PRICE_LABEL':
      return (process.env.NEXT_PUBLIC_BUNDLE_PRICE_LABEL || '').trim();
    default:
      return '';
  }
}
