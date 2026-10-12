import fs from 'node:fs';
import path from 'node:path';
import Link from 'next/link';
import './box-detail.css';

export type BoxSlug = 'box' | 'box-pro' | 'box-max';

type SpecRow = { label: string; value: string };

export type BoxModel = {
    slug: BoxSlug;
    route: string;
    tier: string;
    name: string;
    price: string;
    vram: string;
    blurb: string;
    alt: string;
    headline: SpecRow[];
    full: SpecRow[];
};

export const BOXES: Record<BoxSlug, BoxModel> = {
    box: {
        slug: 'box',
        route: '/box',
        tier: 'AI Solutions Box',
        name: 'Vega',
        price: '£2,995',
        vram: '24GB',
        blurb: 'Our entry machine. AI that runs on your own desktop.',
        alt: 'Illustrative tower render of the AI Solutions Box Vega',
        headline: [
            { label: 'Power supply', value: 'Corsair RM850e 850W' },
            { label: 'Memory', value: '32GB DDR5-6000 (2×16GB)' },
            { label: 'Storage', value: '1TB Kingston NV3 NVMe' },
            { label: 'Graphics', value: '24GB Sparkle Intel Arc Pro B60 Blower' },
        ],
        full: [
            { label: 'GPU', value: 'Sparkle Intel Arc Pro B60 Blower 24GB (new, sealed)' },
            { label: 'CPU', value: 'AMD Ryzen 5 7600 (6-core, AM5)' },
            { label: 'Motherboard', value: 'ASUS TUF Gaming B650-Plus WiFi (ATX)' },
            { label: 'Memory', value: 'Kingston Fury Beast EXPO 32GB (2×16GB) DDR5-6000 CL36' },
            { label: 'Storage', value: 'Kingston NV3 1TB NVMe' },
            { label: 'Power supply', value: 'Corsair RM850e 850W' },
            { label: 'Case', value: 'Phanteks XT Pro Ultra, black, ATX' },
        ],
    },
    'box-pro': {
        slug: 'box-pro',
        route: '/box-pro',
        tier: 'AI Solutions Box Pro',
        name: 'Altair',
        price: '£3,995',
        vram: '32GB',
        blurb: 'Step up from the Box for more demanding work.',
        alt: 'Illustrative tower render of the AI Solutions Box Pro Altair',
        headline: [
            { label: 'Power supply', value: 'Corsair RM850e 850W' },
            { label: 'Memory', value: '32GB DDR5-6000' },
            { label: 'Storage', value: '1TB Kingston NV3 NVMe' },
            { label: 'Graphics', value: '32GB PowerColor Radeon AI PRO R9700' },
        ],
        full: [
            { label: 'GPU', value: 'PowerColor Radeon AI PRO R9700 32GB' },
            { label: 'CPU', value: 'Ryzen 5 7600' },
            { label: 'Motherboard', value: 'TUF B650-Plus WiFi' },
            { label: 'Memory', value: '32GB DDR5-6000' },
            { label: 'Storage', value: 'Kingston NV3 1TB NVMe' },
            { label: 'Power supply', value: 'Corsair RM850e 850W' },
            { label: 'Case', value: 'Phanteks XT Pro Ultra' },
        ],
    },
    'box-max': {
        slug: 'box-max',
        route: '/box-max',
        tier: 'AI Solutions Box Max',
        name: 'Rigel',
        price: '£7,995',
        vram: '32GB',
        blurb: 'Our top machine in the range.',
        alt: 'Illustrative tower render of the AI Solutions Box Max Rigel',
        headline: [
            { label: 'Power supply', value: 'Corsair RM1000e 1000W' },
            { label: 'Memory', value: '32GB DDR5-6000' },
            { label: 'Storage', value: '2TB Kingston NV3 NVMe' },
            { label: 'Graphics', value: '32GB Gigabyte RTX 5090 Gaming OC' },
        ],
        full: [
            { label: 'GPU', value: 'Gigabyte RTX 5090 Gaming OC 32GB' },
            { label: 'CPU', value: 'Ryzen 7 7700 (8-core, AM5)' },
            { label: 'Motherboard', value: 'TUF B650-Plus WiFi' },
            { label: 'Memory', value: '32GB DDR5-6000' },
            { label: 'Storage', value: 'Kingston NV3 2TB NVMe' },
            { label: 'Power supply', value: 'Corsair RM1000e 1000W' },
            { label: 'Case', value: 'Phanteks XT Pro Ultra' },
        ],
    },
};

const mailto = (name: string) =>
    `mailto:tradersbooking@gmail.com?subject=${encodeURIComponent(`AI Solutions Box ${name} - order enquiry`)}`;

function imageExists(slug: BoxSlug) {
    try {
        return fs.existsSync(path.join(process.cwd(), 'public', 'boxes', `${slug}.png`));
    } catch {
        return false;
    }
}

export function BoxDetail({ slug }: { slug: BoxSlug }) {
    const box = BOXES[slug];
    const imgSrc = `/boxes/${slug}.png`;
    const hasImage = imageExists(slug);

    return (
        <div className="bxpage">
            <div className="bxwrap">
                <nav className="bx-nav" aria-label="Breadcrumb">
                    <Link className="bx-brand" href="/">AI Solutions</Link>
                    <Link className="bx-back" href="/">← Back to the main page</Link>
                </nav>

                <header className="bx-head">
                    <p className="bx-eyebrow">{box.tier}</p>
                    <h1>
                        {box.name}
                        <span>{box.tier} · {box.vram} GPU · custom-built to order</span>
                    </h1>
                    <p className="bx-price">{box.price}</p>
                    <p className="bx-lead">
                        {box.blurb} Custom-built to order, 3-week delivery.
                    </p>
                </header>

                <div className="bx-grid">
                    <figure className="bx-shot">
                        {hasImage ? (
                            <img src={imgSrc} alt={box.alt} width={640} height={640} />
                        ) : (
                            <div className="bx-shot-pending" role="img" aria-label="Product image pending">
                                Product image pending
                            </div>
                        )}
                        <figcaption>Illustrative product image. Final enclosure may differ.</figcaption>
                    </figure>

                    <section className="bx-panel" aria-labelledby="bx-headline">
                        <h2 id="bx-headline">Headline specification</h2>
                        <ul className="bx-tiles">
                            {box.headline.map((row) => (
                                <li className="bx-tile" key={row.label}>
                                    <span>{row.label}</span>
                                    <strong>{row.value}</strong>
                                </li>
                            ))}
                        </ul>
                    </section>
                </div>

                <section className="bx-full" aria-labelledby="bx-full">
                    <h2 id="bx-full">Full specification</h2>
                    <table className="bx-table">
                        <tbody>
                            {box.full.map((row) => (
                                <tr key={row.label}>
                                    <th scope="row">{row.label}</th>
                                    <td>{row.value}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </section>

                <p className="bx-care">AI Solutions OS Care: updates, monitoring and support, £99/month.</p>
                <p className="bx-offer">
                    Build-to-order offer: the intended offer is AI Solutions OS pre-loaded. The local
                    runtime, compatibility, performance and local-only privacy guarantees are planned
                    and not yet verified.
                </p>

                <div className="bx-actions">
                    <a className="bx-cta" href={mailto(box.name)}>Enquire</a>
                    <Link className="bx-backlink" href="/">← Back to the main page</Link>
                </div>

                <div className="bx-terms">
                    <p>Warranty and delivery: Confirmed with your order.</p>
                    <p className="bx-footnote">Final component brands may vary by stock.</p>
                </div>
            </div>
        </div>
    );
}
