import type { Metadata } from 'next';
import { BowTryStage } from '../_lobby/BowTry';
import '../_lobby/lobby.css';

export const metadata: Metadata = {
  title: 'Try Bow Bot',
  description:
    'Chat with Bow Bot - your 3-day free trial experience. Scripted demo, not a live model.',
  openGraph: {
    title: 'Try Bow Bot',
    description:
      'Chat with Bow Bot - your 3-day free trial experience.',
    type: 'website',
    url: 'https://ai-solutions.company/try',
    siteName: 'AI Solutions',
    images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: 'Try Bow Bot' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Try Bow Bot',
    description:
      'Chat with Bow Bot - your 3-day free trial experience.',
  },
};

export default function TryPage() {
  return <BowTryStage />;
}
