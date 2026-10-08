import type { Metadata } from 'next';
import BrandLogo from '@/components/landing/BrandLogo';
import SiteHeader from '@/components/landing/SiteHeader';

export const metadata: Metadata = {
  title: 'Privacy Notice - AI Solutions',
  description: 'How AI Solutions uses website enquiry details for the welcome screen preview.',
};

export default function PrivacyPage() {
  return (
    <div className="ai-solutions">
      <SiteHeader />

      <main id="main-content" tabIndex={-1}>
        <section className="as-section">
          <div className="as-container" style={{ maxWidth: 720 }}>
            <div style={{ marginBottom: '2rem' }}>
              <BrandLogo variant="header-dark" width={200} height={46} alt="AI Solutions" />
            </div>

            <h1 className="as-h2">Privacy Notice (Preview)</h1>
            <p className="as-body">
              This is a <strong>non-submitting preview</strong> version of the privacy notice for the welcome screen.
              The implementation currently uses mock transport only — no live email/lead collection,
              no provider account, and no credentials are configured.
            </p>

            <h2 className="as-h3">Purpose</h2>
            <p className="as-body">
              If enabled in a live deployment, details provided via the welcome screen would be used solely
              for one-off requested follow-up about AI Solutions setup or demonstration. We do not use
              these details for marketing, newsletters, or automated messages to visitors.
            </p>

            <h2 className="as-h3">Data collected</h2>
            <p className="as-body">
              When submitted (preview only), we collect either an email address or a phone number (one of them),
              contact type, timestamp (UTC), source (&quot;welcome-screen&quot;), purpose (&quot;requested-follow-up&quot;),
              and notice version. No other personal data is requested.
            </p>

            <h2 className="as-h3">Providers and recipients</h2>
            <p className="as-body">
              <strong>Provider/sender, retention, and actual privacy handling remain unresolved and require owner review.</strong>
              The proposed destination (tradersbooking@gmail.com) and subject (&quot;AI Solutions website enquiry&quot;)
              have not been approved for live use in this preview build.
            </p>

            <h2 className="as-h3">Retention</h2>
            <p className="as-body">
              A proposed initial retention of 90 days for unanswered enquiries (then deletion) is under consideration.
              Existing mailbox retention must also be considered. No retention policy is enforced in the preview.
            </p>

            <h2 className="as-h3">How data is handled</h2>
            <p className="as-body">
              Contact values are not written to sessionStorage/localStorage. The preview implementation
              does not store contact values persistently; it uses mock transport only. Contact syntax validation
              does not verify identity or ownership.
            </p>

            <h2 className="as-h3">Your rights</h2>
            <p className="as-body">
              If this feature goes live, you would be able to request access, correction, or deletion
              of your details. The exact mechanism depends on the selected provider and requires owner approval.
            </p>

            <h2 className="as-h3">Contact</h2>
            <p className="as-body">
              For questions about this preview notice: <a href="mailto:tradersbooking@gmail.com">tradersbooking@gmail.com</a>
            </p>

            <p className="as-body" style={{ marginTop: '2rem', fontSize: '0.9rem', opacity: 0.9 }}>
              This notice is marked as preview and does not constitute a final compliance statement.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
