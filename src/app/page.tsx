import {
  Activity,
  ArrowRight,
  Check,
  ClipboardCheck,
  FileText,
  Info,
  Shield,
} from "lucide-react";
import BrandLogo from "@/components/landing/BrandLogo";
import SiteHeader from "@/components/landing/SiteHeader";
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
  return (
    <div className="ai-solutions">
      <SiteHeader />

      <main id="main-content" tabIndex={-1}>
        {/* Hero ---------------------------------------------------- */}
        <section className="as-hero">
          <div className="as-container as-hero-grid">
            <div>
              <p className="as-eyebrow">AI Solutions for small UK firms</p>
              <h1 className="as-h1">
                Your accounts. Your computer.{" "}
                <span className="as-em">Your AI team.</span>
              </h1>
              <p className="as-lead">
                An accounting assistant that works on your own computer, a
                technical agent that keeps the system running, and access from
                your phone. Less chasing and checking. More time to understand
                the numbers and advise your clients.
              </p>
              <p className="as-availability">
                We have it at AI Solutions. Talk to us about putting it to work
                in your firm.
              </p>

              <div className="as-actions as-gap-top-sm">
                <a className="as-btn as-btn-primary" href="#system">
                  Explore the system
                  <ArrowRight aria-hidden="true" size={18} />
                </a>
                <a className="as-btn as-btn-secondary" href="#classes">
                  Build your first AI agent
                </a>
              </div>

              <ul className="as-hero-points">
                <li>
                  <Check aria-hidden="true" size={16} />
                  Local-first document processing
                </li>
                <li>
                  <Check aria-hidden="true" size={16} />
                  People approve important actions
                </li>
                <li>
                  <Check aria-hidden="true" size={16} />
                  Phone access to your own machine
                </li>
              </ul>
            </div>

            <div>
              <HeroVisual />
            </div>
          </div>
        </section>

        {/* The system ---------------------------------------------- */}
        <section className="as-section" id="system" tabIndex={-1}>
          <div className="as-container">
            <p className="as-eyebrow">The AI Solutions system</p>
            <h2 className="as-h2">
              An AI team on your machine. You stay in control.
            </h2>
            <p className="as-lead">
              Give the repetitive work to an agent, not another dashboard. Our
              local-first system brings accounts assistance, technical support
              and protective checks together on your own computer. Your original
              documents stay on client hardware in the local setup.
            </p>

            <div className="as-cards as-gap-top">
              {SYSTEM_CARDS.map((card) => {
                const Icon = card.icon;
                return (
                  <article className="as-card" key={card.title}>
                    <span className="as-card-icon">
                      <Icon aria-hidden="true" size={22} />
                    </span>
                    <h3 className="as-h3">{card.title}</h3>
                    <p className="as-body">{card.body}</p>
                  </article>
                );
              })}
            </div>

            <div className="as-phone-panel">
              <h3 className="as-h3">
                Your phone is the control room. Your computer does the work.
              </h3>
              <p className="as-body">
                Ask for a progress update, check an issue and review a draft
                from your phone through an authenticated connection to your
                computer. Your machine needs to be online for remote access.
                Sharing a result with your phone is a deliberate action, not a
                claim that no information ever leaves the computer.
              </p>

              <SystemDiagram />

              <p className="as-caption as-gap-top-sm">
                Illustrative architecture. Hardware, access controls and
                workflow scope are agreed for each setup.
              </p>

              <div className="as-actions as-gap-top-sm">
                <a className="as-btn as-btn-primary" href={CONTACT_EMAIL}>
                  Discuss your firm&apos;s setup
                  <ArrowRight aria-hidden="true" size={18} />
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Accountant of the future -------------------------------- */}
        <section className="as-section" id="future-accountant" tabIndex={-1}>
          <div className="as-container">
            <p className="as-eyebrow">The accountant of the future</p>
            <h2 className="as-h2">
              Less time gathering numbers. More time explaining what they mean.
            </h2>
            <p className="as-lead">
              The accountant of the future is still the accountable expert. The
              agent prepares the evidence, spots things that need a closer look
              and drafts the next step. You make the judgement, approve the work
              and help the client make better decisions.
            </p>

            <div className="as-panel-grid as-gap-top">
              <div className="as-card">
                <h3 className="as-h3">The agent prepares</h3>
                <ul className="as-check-list">
                  <li>
                    <Check aria-hidden="true" size={18} />
                    Finds relevant documents and supporting figures
                  </li>
                  <li>
                    <Check aria-hidden="true" size={18} />
                    Flags gaps and differences for review
                  </li>
                  <li>
                    <Check aria-hidden="true" size={18} />
                    Brings records together into a working summary
                  </li>
                  <li>
                    <Check aria-hidden="true" size={18} />
                    Prepares drafts and reports what still needs attention
                  </li>
                </ul>
              </div>

              <div className="as-card">
                <h3 className="as-h3">The accountant decides</h3>
                <ul className="as-check-list">
                  <li>
                    <Check aria-hidden="true" size={18} />
                    Checks the evidence and resolves exceptions
                  </li>
                  <li>
                    <Check aria-hidden="true" size={18} />
                    Approves important actions and communications
                  </li>
                  <li>
                    <Check aria-hidden="true" size={18} />
                    Applies professional judgement
                  </li>
                  <li>
                    <Check aria-hidden="true" size={18} />
                    Advises the client and owns the final work
                  </li>
                </ul>
              </div>
            </div>

            <p className="as-body as-strong as-gap-top-sm">
              We have the system. The next step is fitting it to the way your
              firm works.
            </p>

            <div className="as-actions as-gap-top-sm">
              <a className="as-btn as-btn-primary" href={CONTACT_EMAIL}>
                Talk to AI Solutions
                <ArrowRight aria-hidden="true" size={18} />
              </a>
            </div>
          </div>
        </section>

        {/* Honest comparison ---------------------------------------- */}
        <section className="as-section" aria-labelledby="comparison-title">
          <div className="as-container">
            <h2 className="as-h2" id="comparison-title">
              Cloud accounting tools are useful. Our starting point is
              different.
            </h2>
            <p className="as-lead">
              FreeAgent and QuickBooks Online provide cloud accounting,
              including automation features. AI Solutions focuses on a
              local-first assistant working with your own documents and approved
              tasks on your computer. The difference is the working model, not a
              claim that cloud tools have no AI.
            </p>

            <div className="as-table-wrap as-gap-top">
              <table className="as-table">
                <thead>
                  <tr>
                    <th scope="col">Approach</th>
                    <th scope="col">FreeAgent / QuickBooks Online</th>
                    <th scope="col">AI Solutions local setup</th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON_ROWS.map((row) => (
                    <tr key={row.approach}>
                      <th scope="row">{row.approach}</th>
                      <td>{row.cloud}</td>
                      <td>{row.local}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="as-stack-compare as-gap-top">
              {COMPARISON_ROWS.map((row) => (
                <div className="as-compare-card" key={row.approach}>
                  <h3>{row.approach}</h3>
                  <div className="as-compare-field">
                    <span>FreeAgent / QuickBooks Online</span>
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
            </ul>
          </div>

          <p className="as-copyright">© 2026 AI Solutions.</p>
        </div>
      </footer>
    </div>
  );
}
