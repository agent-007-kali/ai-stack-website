'use client';
import React, { useEffect, useState } from 'react';
import { SolAvatar } from './SolAvatar';
import { LinkCard } from './LinkCard';
import { needs, doorFor, L_TRY, L_ACA, L_BOOK } from './types';
import type { Need, Msg } from './types';

const LEAD_MAILTO = 'mailto:tradersbooking@gmail.com';

export function Chat({ onDoor }: { onDoor: (n: Need | null) => void }) {
    const [msgs, setMsgs] = useState<Msg[]>([]);
    const [typing, setTyping] = useState(false);
    const [started, setStarted] = useState(false);
    const [need, setNeed] = useState<Need | null>(null);
    const [stage, setStage] = useState<'pick' | 'form' | 'done'>('pick');
    const [name, setName] = useState(''); const [email, setEmail] = useState(''); const [note, setNote] = useState('');
    const [draft, setDraft] = useState('');
    const end = React.useRef<HTMLDivElement>(null);
    const say = (m: Msg, wait = 900) => { setTyping(true); window.setTimeout(() => { setTyping(false); setMsgs(x => [...x, m]); }, wait); };
    const start = () => {
        if (!name.trim()) return;
        const first = name.trim().split(' ')[0];
        setStarted(true);
        say({ from: 'sol', text: 'Welcome in, ' + first + '! I am Sol, I run the front desk.' }, 700);
        window.setTimeout(() => say({ from: 'sol', text: 'What brings you here today?' }, 900), 1500);
    };
    useEffect(() => { const el = end.current; if (el && el.parentElement) el.parentElement.scrollTop = el.parentElement.scrollHeight; }, [msgs, typing, stage]);
    const emailOk = /^\S+@\S+\.\S+$/.test(email);
    const pick = (k: Need, t: string) => {
        setNeed(k); setStage('form'); setMsgs(x => [...x, { from: 'me', text: t }]);
        say({ from: 'sol', text: 'Happy to help. What email should the team reach you on?', form: true }, 900);
    };
    const send = () => {
        if (!name.trim() || !emailOk || !need) return;
        const first = name.trim().split(' ')[0];
        const needLabel = needs.find(([k]) => k === need)?.[1] ?? need;
        const mailto = LEAD_MAILTO +
            '?subject=' + encodeURIComponent('New lead from the desk') +
            '&body=' + encodeURIComponent('Name: ' + name.trim() + '\nEmail: ' + email.trim() + '\nWhat they need: ' + needLabel + (note.trim() ? '\nNote: ' + note.trim() : ''));
        window.open(mailto, '_blank', 'noopener');
        setStage('done'); onDoor(need);
        setMsgs(x => [...x, { from: 'me', text: name.trim() + ', ' + email.trim() + (note.trim() ? ': ' + note.trim() : '') }]);
        say({ from: 'sol', text: 'Thank you, ' + first + '. I have your details. Here is your door, and one more you may like:', links: doorFor[need] }, 1100);
    };
    const free = () => {
        const t = draft.trim(); if (!t) return; setDraft('');
        setMsgs(x => [...x, { from: 'me', text: t }]);
        say({ from: 'sol', text: 'Good question. On the live site I answer anything right here. For now, these are the doors:', links: [L_TRY, L_ACA, L_BOOK] }, 1000);
    };
    return <div className="chat" role="log" aria-live="polite">
        <div className="chat-head"><SolAvatar /><div><b>Sol</b><small><span className="pulse" /> Front desk, online</small></div></div>
        {!started ? <div className="gate">
            <h3>Before we start</h3>
            <p>Every guest signs in at the desk. What should Sol call you?</p>
            <input value={name} onChange={e => setName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') start(); }} placeholder="Your name" autoComplete="name" enterKeyHint="go" />
            <button className="cta full" disabled={!name.trim()} onClick={start}>Open the chat</button>
        </div> : <>
        <div className="chat-body">
            {msgs.map((m, i) => <div key={i} className={'row ' + m.from}>
                {m.from === 'sol' && <SolAvatar />}
                <div className={'msg' + (m.form ? ' wide' : '')}>
                    {m.text && <p>{m.text}</p>}
                    {m.form && stage === 'form' && <div className="deskform">
                        <label>Your email<input value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" inputMode="email" autoComplete="email" /></label>
                        <label>What do you need?<textarea value={note} onChange={e => setNote(e.target.value)} placeholder="One or two lines is plenty" rows={2} /></label>
                        <button className="cta full" disabled={!emailOk} onClick={send}>Send to Sol</button>
                    </div>}
                    {m.links && <div className="links">{m.links.map(l => <LinkCard key={l.label} l={l} />)}</div>}
                </div>
            </div>)}
            {typing && <div className="row sol"><SolAvatar /><div className="msg typing"><i /><i /><i /></div></div>}
            {stage === 'pick' && !typing && msgs.length >= 2 && <div className="chips">{needs.map(([k, t]) => <button key={k} className="chip" onClick={() => pick(k, t)}>{t}</button>)}</div>}
            <div ref={end} />
        </div>
        <div className="composer">
            <input value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') free(); }} placeholder="Message Sol" enterKeyHint="send" />
            <button onClick={free} aria-label="Send">↑</button>
        </div>
        </>}
    </div>;
}