import type { Metadata } from 'next';
import Link from 'next/link';
import { SalesAgentChat } from './SalesAgentChat';
import { DISCLOSURE } from '@/lib/sales-agent/knowledge';
import './sales.css';

export const metadata: Metadata = {
  title: 'AI Sales Consultant - AI Solutions',
  description:
    'Chat with Jarvis, the AI Sales Consultant, about Bow Bot, the AI Solutions Box, 1:1 sessions and classes. Ask a question or place an order in chat.',
  openGraph: {
    title: 'AI Sales Consultant - AI Solutions',
    description:
      'Ask about Bow Bot, the AI Solutions Box, 1:1 sessions and classes, or place an order in chat.',
    type: 'website',
    url: 'https://ai-solutions.company/sales',
    siteName: 'AI Solutions',
  },
};

export default function SalesPage() {
  return (
    <main className="sales-page">
      <header className="sales-top">
        <div className="sales-top__brand">
          <span className="sales-top__dot" aria-hidden />
          AI Solutions <span className="sales-top__sep">/</span> sales
        </div>
        <Link className="sales-top__link" href="/lobby">
          Lobby
        </Link>
      </header>

      <section className="sales-hero">
        <p className="sales-eyebrow">AI Sales Consultant</p>
        <h1>Ask, or place an order, in one chat.</h1>
        <p className="sales-sub">
          Jarvis answers from our fixed product sheet - honest prices, no pressure - and can log an
          order for the team. Payment is never taken in this chat.
        </p>
      </section>

      <SalesAgentChat />

      <footer className="sales-foot">
        <span className="sales-foot__pip" aria-hidden />
        {DISCLOSURE} - payment is never collected in chat. Questions?{' '}
        <a href="mailto:tradersbooking@gmail.com">tradersbooking@gmail.com</a>
      </footer>
    </main>
  );
}
