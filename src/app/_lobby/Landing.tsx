'use client';
import Link from 'next/link';
import { Stage } from './Stage';

const LOGIN = '/academy';

const tracks = [
    ['Starter', 'Meet your AI agent, talking to AI properly, your inbox and calendar on autopilot.'],
    ['Builder', 'Research and writing, sell more with AI, build your own custom agent.'],
    ['Pro', 'Stay safe with AI, then a capstone: launch your own agent.'],
];
const tiers = [
    ['Taster', 'Module 1 is free, no card needed', 'Free', ''],
    ['Global Student', 'Founding price, kept for life. All modules and new content.', '£8', 'founding'],
    ['Student', 'All modules and new content. Or £120 a year.', '£12', ''],
    ['Student Pro', 'Everything, plus a monthly live group call and priority answers.', '£29', ''],
    ['Team', 'Everything for 5 seats.', '£49', ''],
];

function Landing() {
    return <>
        <Link className="back" href="/">← Back to the front desk</Link>
        <header className="hero left">
            <div className="eyebrow"><span className="pulse" />AI Solutions Academy</div>
            <h1>Learn to make AI <em>work for you</em></h1>
            <p className="sub">Short, hands-on modules, taught by Ana. Start free, go at your own pace.</p>
        </header>
        <section className="anahero"><div className="anaimg"><img src="/lobby/ana.jpg" alt="Ana, the purple teacher mascot with glasses, holding a book" /></div>
            <Link className="cta" href={LOGIN}>Student login</Link></section>

        <h2 className="sec">Three tracks, eight modules</h2>
        <div className="tracks">{tracks.map(([n, d], i) => <div className="glass" key={n}><b>{i + 1}</b><div><strong>{n}</strong><p>{d}</p></div></div>)}</div>

        <h2 className="sec">How it works</h2>
        <ol className="steps">
            <li>Start with a free taster: module 1.</li>
            <li>About 45 minutes a module: a short video from Ana, one hands-on task, a quick check.</li>
            <li>Each track ends with a small project you keep.</li>
            <li>Want a person? Members get the £100 online 1:1 for £75.</li>
        </ol>

        <h2 className="sec">Pricing</h2>
        <div className="tiers">{tiers.map(([n, d, v, f]) => <div className={'tier' + (f ? ' hot' : '')} key={n}>
            <div><strong>{n}</strong>{f && <span className="badge">First 50</span>}<p>{d}</p></div>
            <div className="price">{v}{v !== 'Free' && <small>/mo</small>}</div></div>)}</div>
        <p className="fine">The founding price is for the first 50 students. After that, Student is £12 a month. Cancel any time. Prices are a proposal until launch.</p>
        <Link className="cta wide" href={LOGIN}>Go to the Academy login</Link>
    </>;
}

export function LandingStage() {
    return <Stage><Landing /></Stage>;
}