import type { Metadata } from 'next';
import { LandingStage } from '../_lobby/Landing';
import '../_lobby/lobby.css';

export const metadata: Metadata = {
    title: 'Learn AI with Ana',
    description:
        'Short, practical sessions on using AI agents in real work. Start with a free taster, then go deeper. No jargon, no hype.',
    openGraph: {
        title: 'Learn AI with Ana',
        description:
            'Short, practical sessions on using AI agents in real work. Start with a free taster, then go deeper.',
        type: 'website',
        url: 'https://ai-solutions.company/learn',
        siteName: 'AI Solutions',
        images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: 'AI Solutions - we make your business agent-ready' }],
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Learn AI with Ana',
        description:
            'Short, practical sessions on using AI agents in real work. Start with a free taster, then go deeper.',
    },
};

export default function Learn() {
    return <LandingStage />;
}
