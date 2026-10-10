'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Stage } from './Stage';
import { Chat } from './Chat';
import type { Need } from './types';

const TRY = 'https://files.instinct.com/4i4wfqwv2zn3-ai-solutions-try-it';
const BOOK = 'mailto:tradersbooking@gmail.com?subject=Book%20a%201%3A1%20with%20AI%20Solutions';
const JARVIS = 'mailto:9qa50y@mail.instinct.com';

function Lobby() {
    const [lit, setLit] = useState<Need | null>(null);
    return <>
        <header className="hero">
            <div className="eyebrow"><span className="pulse" />AI Solutions</div>
            <h1>We make your business <em>agent-ready</em></h1>
            <p className="sub">Step inside. Sol will take it from here.</p>
        </header>

        <section className="reception" aria-label="Reception">
            <div className="halo" />
            <div className="solwrap"><img className="sol" src="/lobby/sol.png" alt="Sol, the yellow speech-bubble mascot, at the front desk" /></div>
            <div className="desk"><span>RECEPTION</span></div>
            <Chat onDoor={setLit} />
        </section>

        <div className="pointer">Sol points the way</div>

        <nav className="doors" aria-label="Choose a door">
            <a className={'door d1' + (lit === 'agent' ? ' lit' : '')} href={TRY} target="_blank" rel="noopener noreferrer">
                <div className="glow" />
                <div className="icon"><img src="/lobby/sol.png" alt="" /></div>
                <div className="num">Door 1</div>
                <h2>See an agent in action</h2>
                <p>Come and try Sol. She is happy to show off.</p>
                <div className="go">Try Sol <b>→</b></div>
            </a>
            <Link className={'door d2' + (lit === 'learn' ? ' lit' : '')} href="/learn">
                <div className="glow" />
                <div className="icon ana"><img src="/lobby/ana.jpg" alt="" /></div>
                <div className="num">Door 2</div>
                <h2>Learn with Ana</h2>
                <p>AI for real work, one short hands-on module at a time. Module 1 is free.</p>
                <div className="go">Enter the Academy <b>→</b></div>
            </Link>
            <a className={'door d3' + (lit === 'business' ? ' lit' : '')} href={BOOK}>
                <div className="glow" />
                <div className="icon orb"><span>1:1</span></div>
                <div className="num">Door 3</div>
                <h2>Help with my business</h2>
                <p>A one-to-one session, online. We make your business agent-ready.</p>
                <div className="go">Book by email <b>→</b></div>
            </a>
        </nav>

        <a className="acct" href="/accounting">
            <span className="tav"><img src="/lobby/tally.jpg" alt="Tally, the green accountant of the family" /></span>
            <div><b>AI Solutions Accounting</b><small>Tally, our accountant, looks after accountancy firms and finance teams.</small></div>
            <i>→</i>
        </a>

        <section className="corner">
            <div className="jorb"><i /></div>
            <div><strong>Jarvis&apos;s corner</strong><p>Runs the house: the diary, the inbox and the doors.</p></div>
            <a href={JARVIS}>Write to Jarvis</a>
        </section>
        <footer className="foot">AI Solutions · Sol, Ana, Tally and Jarvis</footer>
    </>;
}

export function LobbyStage() {
    return <Stage><Lobby /></Stage>;
}