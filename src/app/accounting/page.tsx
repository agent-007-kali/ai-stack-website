"use client";

import {
  Activity,
  ArrowRight,
  Check,
  ClipboardCheck,
  FileText,
  Info,
  Shield,
} from "lucide-react";
import { useState } from "react";
import BrandLogo from "@/components/landing/BrandLogo";
import SiteHeader from "@/components/landing/SiteHeader";
import WelcomeGate from "@/components/landing/WelcomeGate";
import {
  HeroVisual,
  PhoneConversation,
  SystemDiagram,
} from "@/components/landing/SystemIllustration";
import LumaSessions from "@/components/landing/LumaSessions";

const CONTACT_EMAIL = "mailto:tradersbooking@gmail.com";

const SYSTEM_CARDS = [
  {
    icon: FileText,
    title: "Your accounting assistant",
    body: "Find answers in your files, prepare working summaries and bring supporting records together. Flag missing information, duplicates and mismatches for review instead of hiding them in a confident answer.",
  },
  {
    icon: ClipboardCheck,
    title: "Verification and consolidation",
    body: "Bring the books and supporting documents into one review workflow. Cross-check figures against their sources, surface differences and prepare a consolidation summary for the accountant to check.",
  },
  {
    icon: Activity,
    title: "Your always-on technical agent",
    body: "Keep an eye on the local service, flag failed tasks and help with approved maintenance. Always-on means the host computer is switched on, awake and running the agents. It is not an uptime guarantee.",
  },
  {
    icon: Shield,
    title: "Your protective security agent",
    body: "A defensive, white-hat agent for your own system: check for warning signs, flag risky settings and help you review access. It supports good security practice; it does not make the computer unhackable. Testing or changes need permission.",
  },
];

const COMPARISON_ROWS = [
  {
    approach: "Where it starts",
    cloud: "A cloud accounting platform",
    local: "Your computer and approved local documents",
  },
  {
    approach: "How you use it",
    cloud: "Work in the platform's accounting tools and automation",
    local: "Ask an agent to prepare work and review its output",
  },
  {
    approach: "Phone access",
    cloud: "Cloud access through supported web or mobile tools",
    local: "An authenticated connection to the host computer",
  },
  {
    approach: "What stays with you",
    cloud: "You remain responsible for your accounting work",
    local: "You remain responsible for your accounting work",
  },
];

const STEPS = [
  {
    title: "Choose the work",
    body: "We look at one repetitive task, the documents it needs and what a good result looks like.",
  },
  {
    title: "Check the setup",
    body: "We agree the hardware, local processing, access permissions and any remote connection before sensitive files are used.",
  },
  {
    title: "Review the output",
    body: "You test the assistant's work, check the evidence and agree what it may do without asking.",
  },
  {
    title: "Keep control",
    body: "Use clear approvals, activity records and a way to pause the agents. Expand only when the first workflow earns its place.",
  },
];

const QUESTIONS = [
  {
    question: "Do my documents leave the computer?",
    answer:
      "In the local-first setup, original documents and document processing stay on client hardware. Phone access can transmit requests, status or results you choose to view. Cloud connectors, backups or external AI services would change the data flow and must be agreed separately.",
  },
  {
    question: "Can I use it from my phone?",
    answer:
      "Yes, through the remote-access setup agreed for your computer. The host must be on, awake and connected. Access should be authenticated; the computer must not be exposed through an unauthenticated public endpoint.",
  },
  {
    question: "Does it replace my accountant or accounting software?",
    answer:
      "No. It assists with preparation and review. Your accountant remains responsible for the final judgement, and any connection to existing accounting software is a separate part of the setup.",
  },
  {
    question: "What does the protective agent guarantee?",
    answer:
      "No system can guarantee that it will never be compromised. The protective agent helps check and flag risks; access controls, updates, backups and human review still matter.",
  },
  {
    question: "Can I see it before committing?",
    answer:
      "Contact AI Solutions to discuss a demonstration and the workflow you want to improve.",
  },
];

export default function Home() {
  const [welcomeComplete, setWelcomeComplete] = useState(false);

  return (
    <div className="ai-solutions">
      {!welcomeComplete && (
        <WelcomeGate onComplete={() => setWelcomeComplete(true)} />
      )}
      <SiteHeader />

      <main id="main-content" tabIndex={-1}>
        <section
          className="as-container"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 18,
            paddingTop: 28,
          }}
          aria-label="From Tally"
        >
          <img
            src="/lobby/tally.jpg"
            alt="Tally, the green accountant of the family"
            width={160}
            height={160}
            style={{
              width: 160,
              height: 160,
              borderRadius: 18,
              objectFit: "cover",
              objectPosition: "50% 25%",
              flex: "none",
            }}
          />
          <p className="as-lead" style={{ margin: 0 }}>
            Hi, I&apos;m Tally, the accountant of the AI Solutions family.
            Built for small practices and sole traders.
          </p>
        </section>
        {/* Hero ---------------------------------------------------- */}
        <section className="as-hero" aria-labelledby="hero-title">
          <div className="as-container as-hero__grid">
            <div className="as-hero__content">
              <h1 className="as-hero__title" id="hero-title">
                Accounting work with local AI agents.
              </h1>
              <p className="as-hero__lead">
                Prepare, check and explain figures using AI running on your own
                computer. Keep your documents where they belong. Review every
                answer before you accept it.
              </p>
              <div className="as-hero__actions">
                <a className="as-btn as-btn--primary" href="#system">
                  See how it works
                  <ArrowRight aria-hidden="true" size={18} />
                </a>
                <a className="as-btn as-btn--ghost" href={CONTACT_EMAIL}>
                  Talk to AI Solutions
                </a>
              </div>
              <ul className="as-hero__points">
                <li>
                  <Check aria-hidden="true" size={16} />
                  Local-first processing - no blanket upload of your books
                </li>
                <li>
                  <Check aria-hidden="true" size={16} />
                  Evidence-led answers with sources you can trace
                </li>
                <li>
                  <Check aria-hidden="true" size={16} />
                  Always-on guardrails; you stay in control
                </li>
              </ul>
            </div>
            <div className="as-hero__visual" aria-hidden="true">
              <HeroVisual />
            </div>
          </div>
        </section>

        {/* The system ----------------------------------------------- */}
        <section className="as-section" id="system" tabIndex={-1}>
          <div className="as-container">
            <p className="as-eyebrow">The AI Solutions system</p>
            <h2 className="as-h2">Agents that do the prep. You keep the judgement.</h2>
            <p className="as-lead">
              Each agent has a clear role. None is built to replace your
              accountant. They reduce manual work, surface gaps and help you
              explain your numbers with confidence.
            </p>

            <div className="as-grid as-grid--cards as-gap-top">
              {SYSTEM_CARDS.map((card) => (
                <article className="as-card" key={card.title}>
                  <div className="as-card__icon">
                    <card.icon aria-hidden="true" size={20} />
                  </div>
                  <h3 className="as-h3">{card.title}</h3>
                  <p className="as-body">{card.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* System diagram -------------------------------------------- */}
        <section className="as-section" aria-labelledby="diagram-title">
          <div className="as-container">
            <h2 className="as-h2" id="diagram-title">
              How information flows.
            </h2>
            <p className="as-lead">
              A clear, auditable flow. Local documents stay local. Remote access
              is optional and authenticated.
            </p>

            <div className="as-gap-top">
              <SystemDiagram />
            </div>
          </div>
        </section>

        {/* Comparison ------------------------------------------------ */}
        <section className="as-section" aria-labelledby="compare-title">
          <div className="as-container">
            <h2 className="as-h2" id="compare-title">
              Compare approaches.
            </h2>
            <p className="as-lead">
              The choice is about control and data location, not just features.
            </p>

            <div className="as-compare as-gap-top-sm">
              <div className="as-compare__header">
                <span>Approach</span>
                <span>Cloud accounting assistant</span>
                <span>AI Solutions local setup</span>
              </div>
              {COMPARISON_ROWS.map((row) => (
                <div className="as-compare__row" key={row.approach}>
                  <div className="as-compare-field">
                    <span>Approach</span>
                    <p>{row.approach}</p>
                  </div>
                  <div className="as-compare-field">
                    <span>Cloud accounting assistant</span>
                    <p>{row.cloud}</p>
                  </div>
                  <div className="as-compare-field">
                    <span>AI Solutions local setup</span>
                    <p>{row.local}</p>
                  </div>
                </div>
              ))}
            </div>

            <p className="as-caption as-gap-top-sm">
              This is a comparison of approaches, not a full feature comparison.
              AI Solutions is not presented here as a replacement for tax
              filing, payroll or a regulated accounting service. Any connection
              to an existing accounting platform must be agreed separately.
            </p>
          </div>
        </section>

        {/* Working day illustration --------------------------------- */}
        <section className="as-section" aria-labelledby="working-day-title">
          <div className="as-container">
            <h2 className="as-h2" id="working-day-title">
              See the difference in a working day.
            </h2>
            <p className="as-badge">
              <Info aria-hidden="true" size={16} />
              Illustrative example - not a live system or customer result
            </p>

            <div className="as-gap-top">
              <PhoneConversation />
            </div>
          </div>
        </section>

        {/* How it works --------------------------------------------- */}
        <section className="as-section" id="how-it-works" tabIndex={-1}>
          <div className="as-container">
            <h2 className="as-h2">Start with one useful workflow.</h2>

            <ol className="as-steps as-gap-top-sm">
              {STEPS.map((step, index) => (
                <li className="as-card" key={step.title}>
                  <span className="as-step-num">{index + 1}</span>
                  <h3 className="as-h3">{step.title}</h3>
                  <p className="as-body">{step.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Practical questions -------------------------------------- */}
        <section className="as-section" aria-labelledby="questions-title">
          <div className="as-container">
            <h2 className="as-h2" id="questions-title">
              Clear answers before you connect anything.
            </h2>

            <div className="as-faq as-gap-top-sm">
              {QUESTIONS.map((item) => (
                <details key={item.question}>
                  <summary>{item.question}</summary>
                  <p>{item.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Bottom signup -------------------------------------------- */}
        <section className="as-section" id="classes" tabIndex={-1}>
          <div className="as-container">
            <p className="as-eyebrow">Learn with AI Solutions</p>
            <h2 className="as-h2">
              Build your first AI agent. See what it can do.
            </h2>
            <p className="as-lead">
              Join a hands-on, one-to-one session and build your first AI agent
              on Linux. No experience needed. Bring a laptop.
            </p>

            <div className="as-course-card as-gap-top">
              <h3 className="as-h3 as-h3--flush">
                1:1 - Build Your First AI Agent
              </h3>
              <p className="as-course-meta as-gap-top-sm">
                90 minutes · The Lighterman, King&apos;s Cross, London
              </p>
              <p className="as-body">
                Luma currently lists a £50 launch price for the first five
                bookings, paid on the day by cash or bank transfer. RSVP is
                free; the session is not. Check the current offer on Luma before
                registering.
              </p>
              <p className="as-note as-gap-top-sm">
                All times are London time. Registration and current
                availability are handled by Luma.
              </p>
            </div>

            <LumaSessions />
          </div>
        </section>
      </main>

      {/* Footer --------------------------------------------------- */}
      <footer className="as-footer">
        <div className="as-container">
          <div className="as-footer-inner">
            <div>
              <BrandLogo
                variant="header-dark"
                width={180}
                height={42}
                alt="AI Solutions"
              />
              <p className="as-footer-tagline">
                Local-first AI agents for small UK firms.
              </p>
            </div>

            <ul className="as-footer-links">
              <li>
                <a href="#system">The system</a>
              </li>
              <li>
                <a href="#classes">AI classes</a>
              </li>
              <li>
                <a href={CONTACT_EMAIL}>Contact AI Solutions</a>
              </li>
              <li>
                <a href="/privacy">Privacy</a>
              </li>
            </ul>
          </div>

          <p className="as-copyright">© 2026 AI Solutions.</p>
        </div>
      </footer>
    </div>
  );
}
