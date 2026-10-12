import type { Metadata } from 'next';
import { BoxDetail } from '../_lobby/BoxDetail';

export const metadata: Metadata = {
    title: 'AI Solutions Box Pro Altair - £3,995',
    description:
        'AI Solutions Box Pro Altair: custom-built to order with a PowerColor Radeon AI PRO R9700 32GB GPU, 32GB DDR5-6000 memory and 1TB NVMe storage. Three-week delivery.',
    openGraph: {
        title: 'AI Solutions Box Pro Altair - AI Solutions',
        description:
            'AI Solutions Box Pro Altair: custom-built to order. 32GB GPU, 32GB DDR5-6000 memory, 1TB NVMe storage. Three-week delivery.',
        type: 'website',
        url: 'https://ai-solutions.company/box-pro',
        siteName: 'AI Solutions',
    },
};

export default function BoxProPage() {
    return <BoxDetail slug="box-pro" />;
}
