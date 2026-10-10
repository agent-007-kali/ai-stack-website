import type { Metadata } from 'next';
import { LobbyStage } from './_lobby/Lobby';
import './_lobby/lobby.css';

export const metadata: Metadata = {
    title: 'AI Solutions - we make your business agent-ready',
    description:
        'Step inside the AI Solutions front desk. Meet Sol, Ana, Tally and Jarvis: local-first AI agents, an academy and accountancy support for small UK firms.',
    openGraph: {
        title: 'AI Solutions - we make your business agent-ready',
        description:
            'Meet Sol, Ana, Tally and Jarvis: local-first AI agents, an academy and accountancy support for small UK firms.',
        type: 'website',
        url: 'https://ai-solutions.company/',
        siteName: 'AI Solutions',
    },
    twitter: {
        card: 'summary_large_image',
        title: 'AI Solutions - we make your business agent-ready',
        description:
            'Meet Sol, Ana, Tally and Jarvis: local-first AI agents, an academy and accountancy support for small UK firms.',
    },
};

export default function Home() {
    return <LobbyStage />;
}
