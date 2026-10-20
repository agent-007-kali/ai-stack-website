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
];

/** Guide 1 — kept for a bodyless POST /api/guide/checkout, exactly as before. */
export const DEFAULT_GUIDE_SLUG = 'hire-first-ai-employee';

// Fifth product: the four-guide bundle (issue #127). Not part of GUIDES —
// it has no single PDF — but checkout accepts its slug and the download
// handler fans a paid bundle session out to the four individual guides.
export const BUNDLE: GuideProduct = {
  slug: 'bundle-all-four',
  title: 'All four guides',
  description: 'All four PDF guides in one purchase. £51 if bought separately, £35 as a bundle.',
  bullets: [
    'All four PDFs in one purchase',
    'Instant download after payment',
    'No income or savings promises.',
  ],
  metaProduct: 'bundle-all-four',
  blobPathname: '',
  priceEnv: 'BUNDLE_PRICE_PENCE',
  labelEnv: 'NEXT_PUBLIC_BUNDLE_PRICE_LABEL',
};

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
  return guide.slug === BUNDLE.slug ? 'All four guides (4 PDFs)' : `${guide.title} (PDF)`;
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
    case 'NEXT_PUBLIC_BUNDLE_PRICE_LABEL':
      return (process.env.NEXT_PUBLIC_BUNDLE_PRICE_LABEL || '').trim();
    default:
      return '';
  }
}
