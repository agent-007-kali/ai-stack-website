import type { Metadata } from 'next';
import { TryStage } from '../_lobby/Try';
import '../_lobby/lobby.css';

export const metadata: Metadata = {
    title: 'Try Sol',
    description:
        'Ask Sol, the AI Solutions front desk, a question. A short scripted demo of how an agent works, with a one-click handoff to a real person.',
    openGraph: {
        title: 'Try Sol - AI Solutions',
        description:
            'Ask Sol, the AI Solutions front desk, a question. A short scripted demo of how an agent works.',
        type: 'website',
        url: 'https://ai-solutions.company/try',
        siteName: 'AI Solutions',
        images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: 'Try Sol - AI Solutions' }],
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Try Sol - AI Solutions',
        description:
            'Ask Sol, the AI Solutions front desk, a question. A short scripted demo of how an agent works.',
    },
};

export default function TryPage() {
    return <TryStage />;
}
