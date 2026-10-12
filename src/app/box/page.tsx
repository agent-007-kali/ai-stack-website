import type { Metadata } from 'next';
import { BoxDetail } from '../_lobby/BoxDetail';

export const metadata: Metadata = {
    title: 'AI Solutions Box Vega - £2,995',
    description:
        'AI Solutions Box Vega: custom-built to order with a Sparkle Intel Arc Pro B60 24GB GPU, 32GB DDR5-6000 memory and 1TB NVMe storage. Three-week delivery.',
    openGraph: {
        title: 'AI Solutions Box Vega - AI Solutions',
        description:
            'AI Solutions Box Vega: custom-built to order. 24GB GPU, 32GB DDR5-6000 memory, 1TB NVMe storage. Three-week delivery.',
        type: 'website',
        url: 'https://ai-solutions.company/box',
        siteName: 'AI Solutions',
    },
};

export default function BoxPage() {
    return <BoxDetail slug="box" />;
}
