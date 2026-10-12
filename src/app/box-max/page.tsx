import type { Metadata } from 'next';
import { BoxDetail } from '../_lobby/BoxDetail';

export const metadata: Metadata = {
    title: 'AI Solutions Box Max Rigel - £7,995',
    description:
        'AI Solutions Box Max Rigel: custom-built to order with a Gigabyte RTX 5090 Gaming OC 32GB GPU, Ryzen 7 7700, 32GB DDR5-6000 memory and 2TB NVMe storage. Three-week delivery.',
    openGraph: {
        title: 'AI Solutions Box Max Rigel - AI Solutions',
        description:
            'AI Solutions Box Max Rigel: custom-built to order. RTX 5090 32GB GPU, Ryzen 7 7700, 32GB DDR5-6000 memory, 2TB NVMe storage. Three-week delivery.',
        type: 'website',
        url: 'https://ai-solutions.company/box-max',
        siteName: 'AI Solutions',
    },
};

export default function BoxMaxPage() {
    return <BoxDetail slug="box-max" />;
}
