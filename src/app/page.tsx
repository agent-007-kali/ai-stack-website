import type { Metadata } from 'next';
import Link from 'next/link';
import { BUNDLE, GUIDES, priceLabel } from '@/lib/guides';
import StoreHeader from './_home/StoreHeader';
import './_home/home.css';

export const metadata: Metadata = {
  title: 'AI Solutions | AI agents, guides and Boxes',
  description:
    'The AI Solutions storefront: Bow Bot WhatsApp agent, practical PDF guides, the AI Solutions Box range, the Academy and tailored agents for business.',
  openGraph: {
    title: 'AI Solutions | AI agents, guides and Boxes',
    description:
      'Bow Bot, PDF guides, the AI Solutions Box range, the Academy and tailored agents for business.',
    type: 'website',
    url: 'https://ai-solutions.company/',
    siteName: 'AI Solutions',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI Solutions | AI agents, guides and Boxes',
    description:
      'Bow Bot, PDF guides, the AI Solutions Box range, the Academy and tailored agents for business.',
  },
};

const STRIPE_BUY = 'https://buy.stripe.com/14A7sL90o1Qn6YVf3b4Rq00';
const MAIL = 'mailto:tradersbooking@gmail.com';
const SAMPLE_MAILTO =
  'mailto:tradersbooking@gmail.com?subject=Sample%20chapter%20request&body=Hi%2C%20please%20send%20me%20a%20free%20sample%20chapter.%20Guide%20I%27d%20like%3A%20';

const TICKER: (string | { text: string; href: string })[] = [
  'Launch price: Bow Bot £49 setup + £20/month',
  '3-day free trial, no card needed',
  'All four guides £35 as a bundle',
  { text: 'Request a free sample chapter', href: SAMPLE_MAILTO },
  'AI Solutions Boxes custom-built, 3-week delivery',
  'Tailored agents for your business',
];

const BOXES = [
  {
    tier: 'AI Solutions Box',
    name: 'Vega',
    price: '£2,995',
    line: 'Our entry machine. AI that runs on your own desktop.',
    href: '/box',
    img: '/boxes/box.png',
    w: 445,
    h: 1024,
  },
  {
    tier: 'AI Solutions Box Pro',
    name: 'Altair',
    price: '£3,995',
    line: 'Step up from the Box for more demanding work.',
    href: '/box-pro',
    img: '/boxes/pro.png',
    w: 461,
    h: 1024,
  },
  {
    tier: 'AI Solutions Box Max',
    name: 'Rigel',
    price: '£7,995',
    line: 'Our top machine in the range.',
    href: '/box-max',
    img: '/boxes/max.png',
    w: 569,
    h: 1024,
  },
];

function guidePrice(g: (typeof GUIDES)[number] | typeof BUNDLE): string {
  return priceLabel(g) || (g.slug === BUNDLE.slug ? '£35' : '');
}

export default function HomePage() {
  const rail = [...GUIDES, BUNDLE];

  return (
    <div className="sf">
      <div className="sf-ticker" aria-hidden="true">
        <div className="sf-ticker-track">
          {[0, 1].map((copy) => (
            <span key={copy}>
              {TICKER.map((t) => (
                <span key={typeof t === 'string' ? t : t.text}>
                  {typeof t === 'string' ? t : <a href={t.href}>{t.text}</a>} <b>✦</b>{' '}
                </span>
              ))}
            </span>
          ))}
        </div>
      </div>

      <StoreHeader />

      <main id="main-content">
        <section className="sf-hero" id="hero" aria-label="Bow Bot">
          <div className="sf-hero-inner">
            <div>
              <span className="sf-chip">AI Solutions · Storefront</span>
              <h1>
                A frontier-grade AI agent that <span>actually does the work.</span>
              </h1>
              <p className="sf-hero-sub">
                Your own Bow Bot, right inside WhatsApp. It researches, drafts, reminds and keeps
                things moving. Set up in a day, on the phone you already use.
              </p>
              <p className="sf-hero-price">
                Launch price: <strong>£49 setup</strong> <s>normally £99</s> +{' '}
                <strong>£20/month</strong>. Cancel anytime.
              </p>
              <div className="sf-cta-row">
                <Link className="sf-btn sf-btn-primary" href="/try">
                  Start your 3-day free trial
                </Link>
                <a
                  className="sf-btn sf-btn-ghost"
                  href={STRIPE_BUY}
                  target="_blank"
                  rel="noreferrer"
                >
                  Buy now — £49 + £20/mo
                </a>
                <a className="sf-btn sf-btn-ghost" href="#guides">
                  Shop the guides
                </a>
              </div>
              <p className="sf-hero-note">
                No card needed for the trial. Card payments are handled securely by Stripe: £49
                today, then £20 each month until you cancel. Questions?{' '}
                <a href={MAIL}>tradersbooking@gmail.com</a>
              </p>
            </div>
            <div className="sf-hero-art">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/bowbot/assets/orb-static-DETHUGoC.png"
                width={1254}
                height={1254}
                alt="Bow Bot avatar"
              />
            </div>
          </div>
        </section>

        <section className="sf-section" id="guides" aria-labelledby="guides-title">
          <div className="sf-section-head">
            <span className="sf-kicker">01 · Guides</span>
            <h2 id="guides-title">PDF guides, written by an AI agent</h2>
            <a className="sf-promo-line" href={SAMPLE_MAILTO}>
              Request a free sample chapter
            </a>
          </div>
          <p className="sf-section-sub">
            Honest, practical guides for small businesses — pay by card, download instantly.
            Scroll the row sideways to see them all.
          </p>
          <div className="sf-rail">
            {rail.map((g) => {
              const label = guidePrice(g);
              return (
                <article className="sf-card" key={g.slug}>
                  {g.cover ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      className="sf-card-art"
                      src={g.cover}
                      width={g.coverWidth}
                      height={g.coverHeight}
                      loading="lazy"
                      alt={`${g.title} cover`}
                    />
                  ) : (
                    <div className="sf-card-art sf-card-art-bundle">
                      <div>
                        <b>All four guides</b>
                        <small>£51 bought separately</small>
                      </div>
                    </div>
                  )}
                  <h3>{g.title}</h3>
                  <p>{g.bullets[0]}</p>
                  <div className="sf-card-price">
                    {label || 'Buy now'} {label && <span>one-off</span>}
                  </div>
                  <Link className="sf-card-buy" href="/guide">
                    {label ? `Buy now — ${label}` : 'Buy now'}
                  </Link>
                </article>
              );
            })}
          </div>
        </section>

        <section className="sf-section" id="bowbot" aria-labelledby="bowbot-title">
          <div className="sf-section-head">
            <span className="sf-kicker">02 · Agent</span>
            <h2 id="bowbot-title">Bow Bot — your assistant on WhatsApp</h2>
          </div>
          <div className="sf-row">
            <div className="sf-row-art">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/bowbot/assets/orb-static-DETHUGoC.png"
                width={1254}
                height={1254}
                loading="lazy"
                alt="Bow Bot avatar"
              />
            </div>
            <div className="sf-row-body">
              <h3>A frontier-grade AI agent that actually does the work.</h3>
              <p>
                It researches, drafts, reminds and books — in WhatsApp, from an AI Solutions line.
                Your own number is never automated. Set up in a day, cancel anytime.
              </p>
              <div className="sf-tags">
                <span className="sf-tag">3-day free trial</span>
                <span className="sf-tag">£49 setup + £20/mo</span>
                <span className="sf-tag">English &amp; Spanish</span>
                <span className="sf-tag">Voice notes</span>
              </div>
              <div className="sf-cta-row">
                <Link className="sf-btn sf-btn-primary" href="/try">
                  Try Bow Bot free
                </Link>
                <a
                  className="sf-btn sf-btn-ghost"
                  href={STRIPE_BUY}
                  target="_blank"
                  rel="noreferrer"
                >
                  Buy now — £49 + £20/mo
                </a>
              </div>
            </div>
          </div>
        </section>

        <section className="sf-section" id="boxes" aria-labelledby="boxes-title">
          <div className="sf-section-head">
            <span className="sf-kicker">03 · Hardware</span>
            <h2 id="boxes-title">The Boxes</h2>
          </div>
          <p className="sf-section-sub">
            A business desktop that runs your AI on the machine. Your work stays on the machine.
            Custom-built to order, 3-week delivery.
          </p>
          <div className="sf-grid">
            {BOXES.map((b) => (
              <Link className="sf-box" href={b.href} key={b.name}>
                <div className="sf-box-art">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={b.img} width={b.w} height={b.h} loading="lazy" alt={`${b.name} tower`} />
                </div>
                <span className="sf-box-tier">{b.tier}</span>
                <h3>{b.name}</h3>
                <span className="sf-box-price">{b.price}</span>
                <p>{b.line}</p>
                <span className="sf-box-go">View {b.name} →</span>
              </Link>
            ))}
          </div>
          <p className="sf-fineprint">
            AI Solutions OS Care: updates, monitoring and support, £99/month.{' '}
            <a href={MAIL}>Enquire about a Box</a>
          </p>
        </section>

        <section className="sf-section" id="academy" aria-labelledby="academy-title">
          <div className="sf-section-head">
            <span className="sf-kicker">04 · Learn</span>
            <h2 id="academy-title">AI Solutions Academy</h2>
          </div>
          <div className="sf-promo">
            <div className="sf-promo-art">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/academy/ana.jpg" width={315} height={420} loading="lazy" alt="Ana, academy tutor" />
            </div>
            <div>
              <h3>Learn AI with Ana — hands-on, no jargon, no hype.</h3>
              <p>
                Eight short modules built around real work, from a free taster to a full academy
                for your team. Sessions are run online, one step at a time.
              </p>
              <div className="sf-cta-row">
                <Link className="sf-btn sf-btn-primary" href="/academy">
                  Visit the Academy →
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="sf-section" id="agents" aria-labelledby="agents-title">
          <div className="sf-section-head">
            <span className="sf-kicker">05 · For business</span>
            <h2 id="agents-title">Tailored agents for your business</h2>
          </div>
          <div className="sf-promo">
            <div className="sf-promo-art">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/lobby/sol.png" width={360} height={280} loading="lazy" alt="Sol, front desk agent" />
            </div>
            <div>
              <h3>We build the agent your business actually needs.</h3>
              <p>
                Reception, sales, admin — a custom agent tuned to how you work, running on your own
                machine. Step into the lobby and meet Sol, or talk to sales about a tailored build.
              </p>
              <div className="sf-cta-row">
                <Link className="sf-btn sf-btn-primary" href="/lobby">
                  Meet Sol in the lobby
                </Link>
                <Link className="sf-btn sf-btn-ghost" href="/sales">
                  Talk to sales
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="sf-section" id="audit" aria-labelledby="audit-title">
          <div className="sf-section-head">
            <span className="sf-kicker">06 · Audit</span>
            <h2 id="audit-title">The £75 AI Audit</h2>
          </div>
          <div className="sf-audit-band">
            <div>
              <h3>One hour. A written plan for your business.</h3>
              <p>
                One focused hour on how AI fits the way you work, then a written plan you can
                act on — what to automate first, what to leave alone, and what it should cost.
                No course, no commitment.
              </p>
            </div>
            <div className="sf-cta-row">
              <Link className="sf-btn sf-btn-primary" href="/audit">
                Get the £75 AI Audit →
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="sf-footer">
        <div className="sf-footer-inner">
          <span className="sf-footer-brand">AI Solutions</span>
          <Link href="/lobby">AI Solutions lobby</Link>
          <Link href="/guide">Guides</Link>
          <Link href="/try">Try Bow Bot</Link>
          <Link href="/academy">Academy</Link>
          <Link href="/sales">Sales</Link>
          <a href={MAIL}>tradersbooking@gmail.com</a>
          <p className="sf-footer-note">
            Your assistant answers from an AI Solutions WhatsApp line — it never uses your own
            number. Card payments are handled securely by Stripe. It is an AI: it works best at one
            task at a time, done right.
          </p>
        </div>
      </footer>
    </div>
  );
}
