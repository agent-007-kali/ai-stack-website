'use client';
import { useEffect, useRef, useState } from 'react';
import './sales-terminal.css';
import {
    bootLines,
    scriptReply,
    SALES_CHAT_LIMITS,
    PERSONA_LABEL,
    DISCLOSURE,
} from '@/lib/sales-chat/script';
import type { Persona, TerminalLine } from '@/lib/sales-chat/script';
import { requestSalesReply } from '@/lib/sales-chat/adapter';

const MAX_LINES = SALES_CHAT_LIMITS.maxLines;

function pushBounded(current: TerminalLine[], next: TerminalLine[]): TerminalLine[] {
    const merged = [...current, ...next];
    return merged.length > MAX_LINES ? merged.slice(merged.length - MAX_LINES) : merged;
}

function newSessionId(): string {
    try {
        if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
            return crypto.randomUUID();
        }
    } catch {
        /* fall through */
    }
    return 'session-' + Math.random().toString(36).slice(2, 12);
}

export function SalesTerminal() {
    const [lines, setLines] = useState<TerminalLine[]>([]);
    const [val, setVal] = useState('');
    const [persona, setPersona] = useState<Persona>('sol');
    const [busy, setBusy] = useState(false);
    const body = useRef<HTMLDivElement>(null);
    const sessionRef = useRef('');
    const busyRef = useRef(false);
    const bootDone = useRef(false);
    const bootIndex = useRef(0);

    // Ephemeral per-page session id. Never persisted, never put in localStorage.
    useEffect(() => {
        if (!sessionRef.current) sessionRef.current = newSessionId();
    }, []);

    // Demo boot copy, appended one line at a time. Timer cleaned up on unmount.
    useEffect(() => {
        const boot = bootLines();
        const t = window.setInterval(() => {
            const line = boot[bootIndex.current];
            if (!line) {
                window.clearInterval(t);
                bootDone.current = true;
                return;
            }
            setLines((l) => pushBounded(l, [line]));
            bootIndex.current += 1;
            if (bootIndex.current >= boot.length) {
                window.clearInterval(t);
                bootDone.current = true;
            }
        }, 550);
        return () => window.clearInterval(t);
    }, []);

    useEffect(() => {
        const el = body.current;
        if (el) el.scrollTop = el.scrollHeight;
    }, [lines]);

    async function send(e: React.FormEvent) {
        e.preventDefault();
        const text = val.trim();
        if (!text || busyRef.current) return;

        // Finalise the boot animation so the intro cannot land after a reply.
        if (!bootDone.current) {
            bootDone.current = true;
            const remaining = bootLines().slice(bootIndex.current);
            bootIndex.current = bootLines().length;
            setLines((l) => pushBounded(l, remaining));
        }

        // Bounded history: prior turns only, user/assistant roles, max 8.
        const history = lines
            .filter((l) => l.who !== 'sys')
            .map((l) => ({
                role: (l.who === 'visitor' ? 'user' : 'assistant') as 'user' | 'assistant',
                content: l.text,
            }))
            .slice(-SALES_CHAT_LIMITS.maxTurns);

        busyRef.current = true;
        setBusy(true);
        setVal('');
        setLines((l) => pushBounded(l, [{ who: 'visitor', text }]));

        const result = await requestSalesReply({
            message: text,
            sessionId: sessionRef.current || undefined,
            history,
        });

        if (!result.ok) {
            // Backend failure: keep the visitor's text and say so plainly.
            setVal((current) => (current ? current : text));
            setLines((l) =>
                pushBounded(l, [
                    { who: 'sys', text: `backend unavailable (${result.reason}) - scripted reply shown` },
                ]),
            );
        }

        const scripted = scriptReply(text, persona);
        if (scripted.action?.kind === 'mailto') {
            // Existing, user-initiated booking transport. Nothing is sent by us.
            window.location.href = scripted.action.href;
        }
        setPersona(scripted.persona);
        setLines((l) => pushBounded(l, scripted.lines));

        busyRef.current = false;
        setBusy(false);
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
                                <span className={l.who === 'sol' ? 'st-sol' : l.who === 'jarvis' ? 'st-jarvis' : 'st-g'}>
                                    {l.who === 'visitor' ? 'visitor@web' : PERSONA_LABEL[l.who]}
                                </span>
                                <span className="st-d"> ~ $</span> {l.text}
                            </div>
                        ),
                    )}
                    {busy && <div className="st-m st-sys">{persona === 'sol' ? 'sol' : 'advisor'} is typing ...</div>}
                </div>
                <form className="st-in" onSubmit={send}>
                    <label htmlFor="st-input" className="st-g">visitor@web<span className="st-d"> ~ $</span></label>
                    <input
                        id="st-input"
                        value={val}
                        onChange={(e) => setVal(e.target.value)}
                        maxLength={SALES_CHAT_LIMITS.maxMessageChars}
                        placeholder="ask about the Box, pricing, or type consultant..."
                        autoComplete="off"
                    />
                </form>
                <div className="st-foot">{DISCLOSURE}</div>
            </div>
        </section>
    );
}
