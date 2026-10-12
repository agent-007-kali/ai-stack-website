'use client';
import { useEffect, useRef, useState } from 'react';
import './sales-terminal.css';

type Line = { who: 'sys' | 'rep' | 'visitor'; text: string };

const MAIL = 'mailto:tradersbooking@gmail.com?subject=Free%20consultation%20-%20AI%20Solutions';

const BOOT: Line[] = [
    { who: 'sys', text: '$ connecting to ai-solutions.company ... ok' },
    { who: 'sys', text: 'session opened - demo sales desk - scripted replies' },
    { who: 'rep', text: 'Hi, I am Jarvis, AI Sales Consultant. Ask me anything about AI Solutions.' },
];

function reply(q: string): string {
    const s = q.toLowerCase();
    if (/(price|cost|how much|fee|£|box|hardware|computer|machine)/.test(s))
        return 'The AI Solutions Box runs your AI on the machine: Box £2,995, Box Pro £3,995, Box Max £7,995, custom-built to order with 3-week delivery. AI Solutions OS Care is £99/month. For anything else, type "book" to open an email to the team about a free consultation.';
    if (/^\s*1\b|enquir|email|lead/.test(s))
        return 'An agent can read each enquiry, draft a reply and offer open slots, and you approve what matters. Type "book" to open an email to the team about a free consultation.';
    if (/^\s*2\b|book|slot|call|schedule/.test(s))
        return 'Booking and rescheduling without the phone tag. Type "book" to open an email to the team about a free consultation.';
    if (/^\s*3\b|invoice|chase|payment/.test(s))
        return 'An agent can send payment reminders on a schedule and flag the late ones to you. Type "book" to open an email to the team about a free consultation.';
    if (/what|do you|who|about|help/.test(s))
        return 'We make your business agent-ready. Agents answer your enquiries, book the work and chase invoices, and you approve what matters. Which would help you most: [1] enquiries [2] bookings [3] invoices?';
    return 'I cannot answer that in this demo yet. Type "book" to open an email to the team about a free consultation.';
}

export function SalesTerminal() {
    const [lines, setLines] = useState<Line[]>([]);
    const [val, setVal] = useState('');
    const [busy, setBusy] = useState(false);
    const body = useRef<HTMLDivElement>(null);

    useEffect(() => {
        let i = 0;
        const t = setInterval(() => {
            const line = BOOT[i];
            if (!line) {
                clearInterval(t);
                return;
            }
            setLines((l) => [...l, line]);
            i += 1;
            if (i >= BOOT.length) clearInterval(t);
        }, 550);
        return () => clearInterval(t);
    }, []);

    useEffect(() => {
        const el = body.current;
        if (el) el.scrollTop = el.scrollHeight;
    }, [lines]);

    function send(e: React.FormEvent) {
        e.preventDefault();
        const q = val.trim();
        if (!q || busy) return;
        setVal('');
        setLines((l) => [...l, { who: 'visitor', text: q }]);
        if (/^\s*book\b/i.test(q)) {
            setLines((l) => [...l, { who: 'rep', text: 'Opening an email to the team. Send it from your email app to ask for a free consultation.' }]);
            window.location.href = MAIL;
            return;
        }
        setBusy(true);
        setTimeout(() => {
            setLines((l) => [...l, { who: 'rep', text: reply(q) }]);
            setBusy(false);
        }, 900);
    }

    return (
        <section className="st" aria-label="Sales desk chat">
            <div className="st-win">
                <div className="st-head">
                    <i style={{ background: '#ff5f56' }} /><i style={{ background: '#ffbd2e' }} /><i style={{ background: '#27c93f' }} />
                    <span className="st-title">ai-solutions.company / sales-desk</span>
                </div>
                <div className="st-body" ref={body} aria-live="polite">
                    {lines.map((l, i) =>
                        l.who === 'sys' ? (
                            <div key={i} className="st-m st-sys">{l.text}</div>
                        ) : (
                            <div key={i} className="st-m">
                                <span className={l.who === 'rep' ? 'st-a' : 'st-g'}>{l.who === 'rep' ? 'jarvis@ai-solutions' : 'visitor@web'}</span>
                                <span className="st-d"> ~ $</span> {l.text}
                            </div>
                        ),
                    )}
                    {busy && <div className="st-m st-sys">jarvis is typing ...</div>}
                </div>
                <form className="st-in" onSubmit={send}>
                    <label htmlFor="st-input" className="st-g">visitor@web<span className="st-d"> ~ $</span></label>
                    <input id="st-input" value={val} onChange={(e) => setVal(e.target.value)} placeholder="ask about enquiries, bookings, pricing..." autoComplete="off" />
                </form>
                <div className="st-foot">Demo desk - scripted replies, not live - Jarvis, AI Sales Consultant</div>
            </div>
        </section>
    );
}
