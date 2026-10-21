// Rule-based "3 best AI wins" analyzer for /win (issue #32). Pure functions,
// no network, no keys, no spend — the route fetches the HTML and this module
// turns it into trade-detected gaps and three wins. Testable with node:test
// (src/lib/wins.test.ts, npm run test:wins).

export type Trade = 'restaurant' | 'cafe' | 'salon' | 'trades' | 'estate' | 'dealer' | 'gym' | 'other';

export type Gap =
  | 'booking'
  | 'form'
  | 'reviews'
  | 'menu'
  | 'ecommerce'
  | 'blog'
  | 'social'
  | 'whatsapp'
  | 'chat'
  | 'hours'
  | 'viewport';

export type Win = { title: string; explain: string };

// Impact order: the lead-capture and trust gaps come before polish.
const GAP_ORDER: Gap[] = [
  'booking',
  'form',
  'reviews',
  'menu',
  'ecommerce',
  'blog',
  'social',
  'whatsapp',
  'chat',
  'hours',
  'viewport',
];

const TRADE_HINTS: [Trade, RegExp][] = [
  ['restaurant', /restaurant|dining|pizzeria|bistro|takeaway|take-away|street food|indian|chinese|italian|thai|sushi|ramen/i],
  ['cafe', /cafe|coffee|espresso|barista|bakery|cake shop|lunch spot/i],
  ['salon', /barber|salon|\bhair\b|beauty|nails|lashes|spa\b|tanning|waxing/i],
  ['trades', /plumb|electric|roofer|roofing|builder|building work|carpenter|landscap|gardening|heating engineer|glazier|decorat|painter|tiling|pest control|cleaning service|pressure wash/i],
  ['estate', /\bestate\b|letting agent|property|realtor|homes for sale|surveyor/i],
  ['dealer', /car dealer|cardealer|motors|used cars|used-cars|auto sales|dealership|auto trader/i],
  ['gym', /gym\b|fitness|crossfit|personal trainer|yoga|pilates|strength and conditioning/i],
];

const TRADE_LABEL: Record<Trade, string> = {
  restaurant: 'restaurant',
  cafe: 'cafe',
  salon: 'salon',
  trades: 'trade business',
  estate: 'estate agency',
  dealer: 'car dealership',
  gym: 'gym',
  other: 'business',
};

export function detectTrade(url: string, html: string): Trade {
  const hay = `${url}\n${html.slice(0, 50_000)}`;
  for (const [trade, re] of TRADE_HINTS) {
    if (re.test(hay)) return trade;
  }
  return 'other';
}

// Presence checks. Conservative: a false "present" just means one fewer win
// suggested, never a wrong claim about the business.
function findPresence(html: string) {
  return {
    booking:
      /href=["'][^"']*(?:book|booking|appointment|reservation|calendly|treatwell|fresha|setmore|squire|timely|eviivo)/i.test(html) ||
      /<a[^>]*>\s*(?:book now|book online|book a table|book an appointment|make an appointment|book online now)/i.test(html),
    menu:
      /href=["'][^"']*menu/i.test(html) ||
      /\b(?:our menu|view the menu|food menu|drinks menu|price list|prices from|see our prices|service prices|list prices|see prices)\b/i.test(html),
    form:
      /<form[\s\S]{0,800}?type=["']email["']/i.test(html) ||
      /<form[^>]*(?:contact|enquir|quote|sign-?up|get in touch)[^>]*>/i.test(html),
    reviews: /trustpilot|reviews?\.(?:io|co\b)|google reviews|\breviews?\b|testimonials|★★★★★|our customers say/i.test(html),
    social: /facebook\.com|instagram\.com|twitter\.com|\bx\.com\/|linkedin\.com|tiktok\.com|youtube\.com|pinterest\./i.test(html),
    blog: /href=["'][^"']*(?:\/blog|\/news|\/article)/i.test(html) || /<time[^>]+datetime=["']202[4-9]/i.test(html),
    viewport: /<meta[^>]+name=["']viewport["']/i.test(html),
    hours: /opening (?:hours|times)|we are open|open (?:mon|tue|wed|thu|fri|sat|sun)|mon(?:day)?\.?\s*[:,]|7 days a week|trading hours/i.test(html),
    ecommerce:
      /href=["'][^"']*(?:cart|basket|checkout|\/shop|\/store|add-to-cart)/i.test(html) ||
      /\b(?:add to cart|buy online|shop now|order online|order food online|book a van)\b/i.test(html),
    whatsapp: /wa\.me|api\.whatsapp\.com|whatsapp/i.test(html),
    chat: /tidio|intercom|drift\.io|crisp\.chat|tawk\.to|zendesk|chatwoot|livechat|olark|purechat|customerchat|live chat/i.test(html),
  };
}

// A menu/price-list or online-order gap only makes sense for businesses that
// actually sell that way; an estate agency is not missing a food menu.
const MENU_TRADES: Trade[] = ['restaurant', 'cafe', 'salon', 'trades', 'dealer'];
const ORDER_TRADES: Trade[] = ['restaurant', 'cafe', 'dealer', 'trades'];

export function findGaps(html: string, trade: Trade): Gap[] {
  const p = findPresence(html);
  const gaps: Gap[] = [];
  if (!p.booking) gaps.push('booking');
  if (!p.form) gaps.push('form');
  if (!p.reviews) gaps.push('reviews');
  if (!p.menu && MENU_TRADES.includes(trade)) gaps.push('menu');
  if (!p.ecommerce && ORDER_TRADES.includes(trade)) gaps.push('ecommerce');
  if (!p.blog) gaps.push('blog');
  if (!p.social) gaps.push('social');
  if (!p.whatsapp) gaps.push('whatsapp');
  if (!p.chat) gaps.push('chat');
  if (!p.hours) gaps.push('hours');
  if (!p.viewport) gaps.push('viewport');
  return GAP_ORDER.filter((g) => gaps.includes(g));
}

const GENERIC: Record<Gap, Win> = {
  booking: {
    title: 'Let customers book online, 24/7',
    explain: 'Booking currently depends on someone calling during opening hours. An always-on booking link fills quiet slots while you are busy working.',
  },
  form: {
    title: 'Capture the enquiries you are missing',
    explain: 'A phone-only site loses people who will not call cold. A short contact or quote form catches them and lands straight in your inbox.',
  },
  reviews: {
    title: 'Put your best reviews where buyers decide',
    explain: 'People trust other customers more than any homepage copy. A reviews section turns happy clients into your strongest pitch.',
  },
  menu: {
    title: 'Show what you offer and what it costs',
    explain: 'Visitors who cannot see prices often leave to compare elsewhere. A clear menu or price list answers the first question before it is asked.',
  },
  ecommerce: {
    title: 'Let people order or pay online',
    explain: 'Every offline step is a chance to be forgotten. Online ordering or a deposit link keeps the momentum from first visit to payment.',
  },
  blog: {
    title: 'Keep the site fresh with simple updates',
    explain: 'Stale pages rank poorly and read as closed. A short monthly post gives search engines something new and shows you are active.',
  },
  social: {
    title: 'Connect your social channels',
    explain: 'Many visitors check your socials before they trust you. Linked profiles prove the business is real and currently active.',
  },
  whatsapp: {
    title: 'Add a WhatsApp contact button',
    explain: 'Plenty of customers would rather message than call. One tap to WhatsApp removes the friction from the first hello.',
  },
  chat: {
    title: 'Answer the repetitive questions automatically',
    explain: 'The same questions eat hours every week. A simple assistant replies instantly and hands you only the conversations that matter.',
  },
  hours: {
    title: 'State your opening hours clearly',
    explain: 'Nobody likes a wasted trip. Clear hours stop missed visits and the repeated phone calls asking when you are open.',
  },
  viewport: {
    title: 'Make sure the site works properly on phones',
    explain: 'Most local searches happen on a phone. If the page is fiddly on mobile, half your visitors never reach the good part.',
  },
};

// Trade-specific rewrites where the generic line would read wrong.
const TRADE_WINS: Partial<Record<Trade, Partial<Record<Gap, Win>>>> = {
  restaurant: {
    booking: {
      title: 'Take table bookings while you sleep',
      explain: 'Missed calls during the dinner rush are lost covers. An online booking link fills tables without pulling staff off the floor.',
    },
    menu: {
      title: 'Put the menu and prices online',
      explain: 'Diners choose from menus on their phones before they leave home. A clear, current menu is often the whole decision.',
    },
    ecommerce: {
      title: 'Let regulars order online',
      explain: 'Collection and pre-orders turn a casual visitor into a paid order without any queue time.',
    },
  },
  cafe: {
    menu: {
      title: "Show today's menu and prices",
      explain: 'People check what you serve before they walk over. A simple menu page drives the visit instead of losing it to the shop next door.',
    },
    ecommerce: {
      title: 'Take orders ahead of the queue',
      explain: 'Morning queues are money on the floor. An order-ahead link lets regulars pay before they arrive.',
    },
  },
  salon: {
    booking: {
      title: 'Let clients book their next slot online',
      explain: 'Phone tag between colourings costs chairs. An online booking link fills gaps between appointments automatically.',
    },
    menu: {
      title: 'Publish your service prices',
      explain: 'Clients want the price before they ring. A price list pre-qualifies every booking and ends the "how much?" messages.',
    },
  },
  trades: {
    booking: {
      title: 'Let people request a quote online',
      explain: 'While you are on site, the next job is clicking someone else. A quote request form works while your hands are full.',
    },
    menu: {
      title: 'Publish your typical prices',
      explain: 'Visitors comparing three traders want numbers, not a maybe. Clear price ranges are what gets you onto the shortlist.',
    },
  },
  estate: {
    form: {
      title: 'Capture viewings and valuations 24/7',
      explain: 'Buyers browse at midnight. A valuation or viewing form catches the enquiry before a competitor does.',
    },
  },
  dealer: {
    booking: {
      title: 'Let buyers book test drives online',
      explain: 'A test-drive booking link turns a midnight browse into a scheduled visit, with no phone tag in between.',
    },
    ecommerce: {
      title: 'Show stock and take deposits online',
      explain: 'Buyers shortlist from the sofa. Live stock plus a deposit link moves them from browsing to reserved.',
    },
  },
  gym: {
    booking: {
      title: 'Let members book classes online',
      explain: 'Class spots fill best when people can claim them any time. Online booking cuts the front-desk backlog.',
    },
    form: {
      title: 'Catch trial sign-ups automatically',
      explain: 'Someone ready to try will not ring a busy desk. A short sign-up form turns intent into a first session.',
    },
  },
};

// Always available: keeps the answer at three wins even when a site passes
// every check, or could not be read at all.
const FILLERS: Win[] = [
  {
    title: 'Turn visitors into booked jobs',
    explain: 'Most sites get attention but not action. One clear next step — book, quote or buy — converts the traffic you already have.',
  },
  {
    title: 'Automate the repetitive replies',
    explain: 'The same ten questions arrive by phone and message every week. An AI assistant answers them instantly so you can stay on the tools.',
  },
  {
    title: 'Ask happy customers for reviews on autopilot',
    explain: 'Great jobs fade from memory by the evening. An automatic review request catches the praise while it is still fresh.',
  },
  {
    title: 'Get found when locals search',
    explain: 'Local searches end with someone choosing from the first few names they see. Being fully listed and consistent wins that shortlist.',
  },
];

export function pickWins(trade: Trade, gaps: Gap[]): Win[] {
  const picked: Win[] = [];
  for (const gap of gaps) {
    const win = TRADE_WINS[trade]?.[gap] ?? GENERIC[gap];
    if (win && !picked.some((w) => w.title === win.title)) picked.push(win);
    if (picked.length === 3) break;
  }
  for (const f of FILLERS) {
    if (picked.length === 3) break;
    if (!picked.some((w) => w.title === f.title)) picked.push(f);
  }
  return picked.slice(0, 3);
}

export type Analysis = {
  trade: Trade;
  gaps: Gap[];
  wins: Win[];
  unreadable: boolean;
};

export const TEASER = 'The full audit finds every win, in priority order.';

export function analyzeSite(url: string, html: string | null): Analysis {
  const readable = html !== null && html.trim().length > 0;
  const trade = detectTrade(url, html ?? '');
  if (!readable) {
    return { trade, gaps: [], wins: pickWins(trade, []), unreadable: true };
  }
  const gaps = findGaps(html as string, trade);
  return { trade, gaps, wins: pickWins(trade, gaps), unreadable: false };
}

export function tradeLabel(trade: Trade): string {
  return TRADE_LABEL[trade];
}
