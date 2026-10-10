'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { Stage } from './Stage';
import { SolAvatar } from './SolAvatar';

const LEAD_MAILTO = 'mailto:tradersbooking@gmail.com';

type Turn = { from: 'sol' | 'me'; text: string };

const SCRIPT: { test: RegExp; reply: string }[] = [
    { test: /invoic|receipt|bookkeep|ledger|vat|tax|payroll/i, reply: 'Good one. In the real setup I can open the files you approve, pull out what matters for that job, and show my working so you can check every figure before it goes anywhere.' },
    { test: /email|inbox|calendar|diary|meeting|schedule/i, reply: 'Happy to help there. The live version triages your inbox, drafts replies and offers to book the meeting, but it always waits for your yes before anything is sent.' },
    { test: /research|summar|writ|proposal|report|post/i, reply: 'That is a natural fit. I would gather the sources, draft it in your voice, and flag anything I could not verify instead of guessing.' },
    { test: /phone|mobile|remote|away/i, reply: 'Yes, you can reach the desk from your phone through the authenticated link we agree with you, as long as the host computer is on and awake.' },
    { test: /price|cost|how much|pay|£|\$/i, reply: 'The front desk will give you the current numbers when they get your note. I am the demo, so I will not invent a price.' },
];

function replyTo(question: string): string {
    const q = question.toLowerCase();
    for (const { test, reply } of SCRIPT) if (test.test(q)) return reply;
    return 'Good question. In the live system I would work through that with your own tools and show you the result to check. As a demo I keep it simple.';
}

function Try() {
    const [started, setStarted] = useState(false);
    const [name, setName] = useState('');
    const [question, setQuestion] = useState('');
    const [email, setEmail] = useState('');
    const [turns, setTurns] = useState<Turn[]>([]);
    const [asked, setAsked] = useState(false);

    const end = React.useRef<HTMLDivElement>(null);
    React.useEffect(() => { const el = end.current; if (el && el.parentElement) el.parentElement.scrollTop = el.parentElement.scrollHeight; }, [turns]);

    const start = () => {
        if (!name.trim()) return;
        const first = name.trim().split(' ')[0];
        setStarted(true);
        setTurns([
            { from: 'sol', text: 'Hi ' + first + ', I am Sol, the front desk. This is a short scripted demo, so I will not pretend to be a live model.' },
            { from: 'sol', text: 'Ask me a question about your business and I will show how I would approach it.' },
        ]);
    };

    const ask = () => {
        const q = question.trim();
        if (!q) return;
        setQuestion('');
        setAsked(true);
        setTurns(x => [...x, { from: 'me', text: q }, { from: 'sol', text: replyTo(q) }]);
    };

    const emailOk = /^\S+@\S+\.\S+$/.test(email);
    const mailto = LEAD_MAILTO +
        '?subject=' + encodeURIComponent('Try Sol question') +
        '&body=' + encodeURIComponent('Name: ' + name.trim() + (email.trim() ? '\nEmail: ' + email.trim() : '') + '\n\nQuestion: ' + (turns.filter(t => t.from === 'me').slice(-1)[0]?.text ?? ''));

    return <>
        <Link className="back" href="/">← Back to the front desk</Link>
        <header className="hero left">
            <div className="eyebrow"><span className="pulse" />Try Sol</div>
            <h1>Ask Sol <em>anything</em></h1>
            <p className="sub">A scripted demo of the AI Solutions front desk. Not a live model, and nothing is sent until you choose to.</p>
        </header>

        <section className="reception" aria-label="Sol demo">
            <div className="halo" />
            <div className="solwrap"><img className="sol" src="/lobby/sol.png" alt="Sol, the yellow speech-bubble mascot" /></div>
        </section>

        <div className="chat" role="log" aria-live="polite">
            <div className="chat-head"><SolAvatar /><div><b>Sol</b><small><span className="pulse" /> Demo, scripted replies</small></div></div>
            {!started ? <div className="gate">
                <h3>Before we start</h3>
                <p>Every guest signs in at the desk. What should Sol call you?</p>
                <input value={name} onChange={e => setName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') start(); }} placeholder="Your name" autoComplete="name" enterKeyHint="go" />
                <button className="cta full" disabled={!name.trim()} onClick={start}>Open the desk</button>
            </div> : <>
            <div className="chat-body">
                {turns.map((t, i) => <div key={i} className={'row ' + t.from}>
                    {t.from === 'sol' && <SolAvatar />}
                    <div className="msg">{t.text}</div>
                </div>)}
                <div ref={end} />
            </div>
            <div className="composer">
                <input value={question} onChange={e => setQuestion(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') ask(); }} placeholder="Ask Sol a question" enterKeyHint="send" aria-label="Your question for Sol" />
                <button onClick={ask} aria-label="Ask">↑</button>
            </div>
            </>}
        </div>

        {started && asked && <section className="deskform" aria-label="Send your question to the team">
            <p className="tiny center" style={{ margin: '0 0 10px' }}>
                That was a scripted demo reply. Want the real front desk to answer? Add your email and we will open your email app with the message ready to send.
            </p>
            <label>Your email (optional)
                <input value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" inputMode="email" autoComplete="email" />
            </label>
            <a className="cta full" href={mailto} target="_blank" rel="noopener noreferrer">Open your email app</a>
            <p className="tiny center">
                This only opens your email app with the message prefilled{email.trim() && !emailOk ? ' (that email does not look complete)' : ''}. Nothing is sent until you press send.
            </p>
        </section>}

        <p className="foot">AI Solutions · a scripted demo</p>
    </>;
}

export function TryStage() {
    return <Stage><Try /></Stage>;
}
