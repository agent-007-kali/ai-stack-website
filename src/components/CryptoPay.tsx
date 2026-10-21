'use client';
import { QRCodeSVG } from 'qrcode.react';

// "Pay with crypto" secondary option (issue #36). Shown AFTER the Stripe CTA
// on /guide, /audit and /build — card checkout stays primary. The Solana
// address is a hard-coded literal (owner-supplied, issue #36): never fetched
// from an API or env at runtime, so it cannot be substituted by a third
// party. The QR is generated in the browser by the bundled qrcode.react
// library — no external QR image service ever sees this address. No bank
// details, no account numbers: crypto address only.
export const SOLANA_ADDRESS = 'BxrbFrJvVKpqxYVkxGgXw2eQwbX3zj8hrSQmN2qtsfTx';

type CryptoPayProps = {
  /** What the receipt unlocks — "guide/audit" (default) or "build". */
  receiveNoun?: string;
};

export default function CryptoPay({ receiveNoun = 'guide/audit' }: CryptoPayProps) {
  return (
    <details style={{ marginTop: 16, border: '1px solid #1d3a4d', borderRadius: 10, padding: '12px 16px', background: '#0a131c' }}>
      <summary style={{ cursor: 'pointer', color: '#38d6e6', fontWeight: 700, fontSize: 15 }}>
        Prefer crypto? Pay with USDC or USDT on Solana
      </summary>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-start', marginTop: 14 }}>
        <div style={{ background: '#fff', borderRadius: 8, padding: 8, flex: '0 0 auto' }}>
          <QRCodeSVG
            value={SOLANA_ADDRESS}
            size={104}
            bgColor="#ffffff"
            fgColor="#0c1722"
            level="M"
            aria-label="QR code for the Solana wallet address"
          />
        </div>
        <div style={{ flex: '1 1 220px', minWidth: 0 }}>
          <code
            style={{
              display: 'block',
              fontSize: 13,
              lineHeight: 1.5,
              wordBreak: 'break-all',
              color: '#e8f1f5',
              background: '#0c1722',
              border: '1px solid #1d3a4d',
              borderRadius: 6,
              padding: '8px 10px',
            }}
          >
            {SOLANA_ADDRESS}
          </code>
          <p style={{ margin: '10px 0 0', fontSize: 14, lineHeight: 1.6, color: '#c3cfe6' }}>
            Send the USD amount shown above in USDC or USDT (Solana network) to this address, then email
            your transaction receipt to tradersbooking@gmail.com to receive your {receiveNoun}.
          </p>
        </div>
      </div>
    </details>
  );
}
