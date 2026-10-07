import {
  Activity,
  Check,
  FileText,
  Info,
  Monitor,
  Shield,
  Smartphone,
} from "lucide-react";
import BrandLogo from "./BrandLogo";

export function HeroVisual() {
  return (
    <figure className="as-visual">
      <div className="as-visual-screens">
        <div className="as-screen">
          <div className="as-screen-bar" aria-hidden="true">
            <i />
            <i />
            <i />
          </div>
          <BrandLogo
            variant="symbol"
            width={64}
            height={64}
            className="as-screen-mark"
            decorative
          />
          <div className="as-skeleton" aria-hidden="true">
            <span />
            <span />
            <span />
            <span className="as-accent-bar" />
            <span />
            <span />
          </div>
        </div>

        <div className="as-phone" aria-hidden="true">
          <span className="as-phone-notch" />
          <span className="as-phone-line is-accent" />
          <span className="as-phone-line" />
          <span className="as-phone-line is-short" />
          <span className="as-phone-line" />
          <span className="as-phone-line is-short" />
        </div>
      </div>

      <figcaption>
        <span className="as-figure-label">
          <Info aria-hidden="true" size={14} />
          Illustrative system view
        </span>
      </figcaption>
    </figure>
  );
}

export function SystemDiagram() {
  return (
    <div className="as-diagram">
      <div className="as-node as-node--computer">
        <p className="as-node-head">
          <Monitor aria-hidden="true" size={20} />
          Client computer
        </p>
        <div className="as-node-inner">
          <span className="as-chip">
            <FileText aria-hidden="true" size={17} />
            Local documents + local AI processing
          </span>
          <span className="as-chip">
            <Activity aria-hidden="true" size={17} />
            Accounting assistant
          </span>
          <span className="as-chip">
            <Shield aria-hidden="true" size={17} />
            Technical + protective agents
          </span>
        </div>
      </div>

      <div className="as-diagram-link">
        <span className="as-diagram-line as-diagram-line--start" aria-hidden="true" />
        <span className="as-diagram-label">Authenticated remote connection</span>
        <span className="as-diagram-line as-diagram-line--end" aria-hidden="true" />
      </div>

      <div className="as-node as-node--phone">
        <p className="as-node-head">
          <Smartphone aria-hidden="true" size={20} />
          Your phone: requests, status and approvals
        </p>
        <div className="as-phone" aria-hidden="true">
          <span className="as-phone-notch" />
          <span className="as-phone-line is-accent" />
          <span className="as-phone-line" />
          <span className="as-phone-line is-short" />
          <span className="as-phone-line" />
          <span className="as-phone-line is-short" />
        </div>
      </div>
    </div>
  );
}

const CONVERSATION = [
  {
    speaker: "You",
    text: "Check the records in the local review folder and tell me what needs attention.",
  },
  {
    speaker: "Accounting assistant",
    text: "I've prepared a review summary. Some supporting records are missing and a few figures need checking. Nothing has been sent or filed.",
  },
  {
    speaker: "You",
    text: "Show me the evidence behind the differences.",
  },
  {
    speaker: "Accounting assistant",
    text: "The summary links each flagged item to its supporting local records. Review the exceptions before approving the next step.",
  },
];

const WORKFLOW_LABELS = [
  "Documents gathered",
  "Exceptions ready for review",
  "Waiting for your approval",
];

export function PhoneConversation() {
  return (
    <div className="as-illustration">
      <ul className="as-conversation as-card">
        {CONVERSATION.map((message, index) => (
          <li className="as-msg" key={`${message.speaker}-${index}`}>
            <span className="as-msg-who">{message.speaker}</span>
            {message.text}
          </li>
        ))}
      </ul>

      <div>
        <ul className="as-workflow">
          {WORKFLOW_LABELS.map((label) => (
            <li key={label}>
              <Check aria-hidden="true" size={18} />
              {label}
            </li>
          ))}
        </ul>
        <p className="as-caption">
          Sample conversation and workflow labels. No real documents, amounts or
          client records are shown.
        </p>
      </div>
    </div>
  );
}
