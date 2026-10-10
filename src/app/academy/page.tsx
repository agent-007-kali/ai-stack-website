import type { Metadata } from 'next';
import { AcademyStage } from '../_lobby/Academy';
import '../_lobby/lobby.css';

export const metadata: Metadata = {
    title: 'AI Solutions Academy',
    description:
        'Learn AI with Ana: eight short, hands-on modules for real work, from a free taster to a full academy. No jargon, no hype.',
    openGraph: {
        title: 'AI Solutions Academy - learn AI with Ana',
        description:
            'Eight short, hands-on modules for real work, from a free taster to a full academy.',
        type: 'website',
        url: 'https://ai-solutions.company/academy',
        siteName: 'AI Solutions',
        images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: 'AI Solutions Academy - learn AI with Ana' }],
    },
    twitter: {
        card: 'summary_large_image',
        title: 'AI Solutions Academy - learn AI with Ana',
        description:
            'Eight short, hands-on modules for real work, from a free taster to a full academy.',
    },
};

export default function AcademyPage() {
    return <AcademyStage />;
}
