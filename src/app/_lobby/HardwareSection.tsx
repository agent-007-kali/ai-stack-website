import './hardware-section.css';
const MAIL = 'mailto:tradersbooking@gmail.com?subject=AI%20Solutions%20Box%20-%20order%20enquiry';

const TIERS = [
    { name: 'AI Solutions Box', price: '£2,995', line: 'Our entry machine. AI that runs on your own desktop.' },
    { name: 'AI Solutions Box Pro', price: '£3,995', line: 'Step up from the Box for more demanding work.' },
    { name: 'AI Solutions Box Max', price: '£7,995', line: 'Our top machine in the range.' },
];

export function HardwareSection() {
    return (
        <section className="hw" aria-label="AI Solutions Box">
            <div className="hw-eyebrow">The hardware</div>
            <h2>The AI Solutions Box</h2>
            <p className="hw-sub">A business desktop that runs your AI on the machine. Your work stays on the machine. Custom-built to order, 3-week delivery.</p>
            <div className="hw-grid">
                {TIERS.map((t) => (
                    <div className="hw-card" key={t.name}>
                        <div className="hw-badge" aria-hidden="true" />
                        <h3>{t.name}</h3>
                        <div className="hw-price">{t.price}</div>
                        <p>{t.line}</p>
                    </div>
                ))}
            </div>
            <p className="hw-care">AI Solutions OS Care: updates, monitoring and support, £99/month.</p>
            <a className="hw-cta" href={MAIL}>Enquire about a Box</a>
        </section>
    );
}
