'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';

// ---- EDIT THESE TWO ----
const ACCESS_PASSWORD = "santiago"; // the password Jorge types
const INBOX = "9qa50y@mail.instinct.com"; // where messages are delivered (via formsubmit.co)
const REPLIES_URL =
  "https://api.github.com/repos/agent-007-kali/ai-stack-website/issues/1/comments?per_page=100"; // Jarvis replies = comments on this issue
// ------------------------

const css = `
.jb{min-height:100vh;background:#0b0f17;color:#e6edf3;line-height:1.5;font-family:system-ui,-apple-system,Segoe UI,sans-serif}
.jb *{box-sizing:border-box}
.jb header{padding:96px 24px 64px;text-align:center;background:radial-gradient(circle at 50% 0,#1d3b6e,#0b0f17 70%)}
.jb h1{font-size:clamp(2.2rem,6vw,4rem);margin:0 0 16px;font-weight:800;line-height:1.1}
.jb h1 span{color:#58a6ff}
.jb .lead{max-width:640px;margin:0 auto 32px;color:#9fb1c7;font-size:1.2rem}
.jb .btn{display:inline-block;background:#58a6ff;color:#06101f;padding:14px 28px;border-radius:10px;font-weight:700;text-decoration:none}
.jb .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:20px;max-width:960px;margin:0 auto;padding:48px 24px}
.jb .card{background:#121a27;border:1px solid #243247;border-radius:14px;padding:24px}
.jb .card h3{margin:0 0 8px;color:#58a6ff;font-size:1.25rem;font-weight:700}
.jb .card p{margin:0}
.jb .flow{text-align:center;color:#9fb1c7;padding:0 24px 48px}
.jb code{background:#121a27;padding:2px 8px;border-radius:6px}
.jb footer{text-align:center;padding:32px;color:#6b7c93;border-top:1px solid #1b2636}
.jb .chat{max-width:480px;margin:0 auto;padding:0 24px 56px}
.jb .chat h2{text-align:center;margin:0 0 4px;font-size:1.4rem;font-weight:700}
.jb .chat .sub{text-align:center;color:#6b7c93;font-size:.9rem;margin:0 0 16px}
.jb .phone{background:#0f1622;border:1px solid #243247;border-radius:22px;padding:18px;display:flex;flex-direction:column;gap:10px}
.jb .msg{max-width:82%;padding:10px 14px;border-radius:16px;font-size:.98rem}
.jb .me{align-self:flex-end;background:#1f5fbf;color:#fff;border-bottom-right-radius:4px}
.jb .bot{align-self:flex-start;background:#1b2636;color:#e6edf3;border-bottom-left-radius:4px}
.jb .who{display:block;font-size:.72rem;opacity:.65;margin-bottom:2px}
.jb .gate{max-width:480px;margin:0 auto;padding:0 24px 64px;text-align:center}
.jb .gate h2{margin:0 0 6px;font-size:1.4rem;font-weight:700}
.jb .gate p{margin:0 0 16px;color:#9fb1c7}
.jb .gate form{display:flex;flex-direction:column;gap:10px;text-align:left}
.jb .gate .row{display:flex;gap:10px}
.jb .gate input,.jb .gate textarea{width:100%;background:#121a27;border:1px solid #243247;border-radius:10px;padding:12px 14px;color:#e6edf3;font-size:1rem;font-family:inherit}
.jb .gate textarea{min-height:120px;resize:vertical}
.jb .gate button{background:#58a6ff;color:#06101f;border:0;border-radius:10px;padding:12px 22px;font-weight:700;font-size:1rem;cursor:pointer}
.jb .gate button:disabled{opacity:.6;cursor:default}
.jb .err{color:#ff7b72;margin:12px 0 0}
.jb .ok{background:#0f2a1c;border:1px solid #1f6b3f;border-radius:14px;padding:20px;color:#b9efd1;margin-bottom:16px;text-align:left}
.jb .ok strong{color:#7ee2a8}
.jb .thread{background:#0f1622;border:1px solid #243247;border-radius:18px;padding:14px;height:340px;overflow-y:auto;display:flex;flex-direction:column;gap:8px;text-align:left;margin-bottom:12px}
.jb .thread .msg{white-space:pre-wrap;word-break:break-word;font-size:.95rem}
.jb .thread .note{align-self:center;color:#6b7c93;font-size:.8rem}
.jb .composer{display:flex;gap:10px;align-items:flex-end}
.jb .composer textarea{min-height:46px;height:46px;resize:none}
.jb .hp{position:absolute;left:-9999px;height:0;overflow:hidden}
`;

export default function JarvisBridgePage() {
  const [pw, setPw] = useState('');
  const [unlocked, setUnlocked] = useState(false);
  const [badPw, setBadPw] = useState(false);
  type Bubble = { id: string; from: 'me' | 'jarvis'; text: string; ts: number };
  const [message, setMessage] = useState('');
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);

  const unlock = (e: FormEvent) => {
    e.preventDefault();
    if (pw === ACCESS_PASSWORD) {
      setUnlocked(true);
      setBadPw(false);
      try {
        const saved = localStorage.getItem('jb-mine');
        if (saved) setBubbles(JSON.parse(saved));
      } catch {}
    } else {
      setBadPw(true);
    }
  };

  // keep only my own bubbles in storage; Jarvis replies always come from the issue
  useEffect(() => {
    if (!unlocked) return;
    try {
      localStorage.setItem('jb-mine', JSON.stringify(bubbles.filter((b) => b.from === 'me')));
    } catch {}
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [bubbles, unlocked]);

  // poll Jarvis replies (GitHub issue comments), backing off if rate limited
  useEffect(() => {
    if (!unlocked) return;
    let stop = false;
    let delay = 30000;
    let timer: ReturnType<typeof setTimeout>;
    const tick = async () => {
      if (stop) return;
      if (document.visibilityState === 'visible') {
        try {
          const res = await fetch(REPLIES_URL, { headers: { Accept: 'application/vnd.github+json' } });
          if (res.ok) {
            const list = await res.json();
            const replies: Bubble[] = (Array.isArray(list) ? list : []).map(
              (c: { id: number; body: string; created_at: string }) => ({
                id: 'c' + c.id,
                from: 'jarvis' as const,
                text: c.body,
                ts: Date.parse(c.created_at),
              })
            );
            setBubbles((prev) => {
              const mine = prev.filter((b) => b.from === 'me');
              const next = [...mine, ...replies].sort((x, y) => x.ts - y.ts);
              const same =
                next.length === prev.length && next.every((b, i) => b.id === prev[i].id);
              return same ? prev : next;
            });
            delay = 30000;
          } else {
            delay = Math.min(delay * 2, 300000);
          }
        } catch {
          delay = Math.min(delay * 2, 300000);
        }
      }
      timer = setTimeout(tick, delay);
    };
    tick();
    return () => {
      stop = true;
      clearTimeout(timer);
    };
  }, [unlocked]);

  const send = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const text = message.trim();
    if (!text || sending) return;
    const hp = (e.currentTarget.elements.namedItem('_honey') as HTMLInputElement | null)?.value;
    if (hp) return;
    setSending(true);
    setSendError(false);
    const mine: Bubble = { id: 'm' + Date.now(), from: 'me', text, ts: Date.now() };
    setBubbles((prev) => [...prev, mine]); // show immediately
    setMessage('');
    try {
      const res = await fetch('https://formsubmit.co/ajax/' + INBOX, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          from: 'Jorge',
          message: text,
          _subject: 'Mensaje de Jorge desde jarvis-bridge',
          _template: 'table',
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || String(data.success) === 'false') throw new Error('send failed');
    } catch {
      setSendError(true);
      setBubbles((prev) => prev.filter((b) => b.id !== mine.id));
      setMessage(text);
    }
    setSending(false);
  };

  return (
    <main className="jb">
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <header>
        <h1>
          Text your computer.
          <br />
          <span>It builds things.</span>
        </h1>
        <p className="lead">
          Jarvis Bridge turns one message from your phone into agents that
          research, code and deploy, live on your machine.
        </p>
        <a className="btn" href="#how">
          See how it works
        </a>
      </header>
      <section className="grid" id="how">
        <div className="card">
          <h3>1. Send</h3>
          <p>One WhatsApp message becomes a task on GitHub.</p>
        </div>
        <div className="card">
          <h3>2. Fan out</h3>
          <p>Your PC picks it up and OpenCode agents work in parallel.</p>
        </div>
        <div className="card">
          <h3>3. Ship</h3>
          <p>The result can land as a pull request or a live website.</p>
        </div>
      </section>
      <p className="flow">
        Phone <code>&rarr;</code> Instinct <code>&rarr;</code> GitHub{" "}
        <code>&rarr;</code> OpenCode <code>&rarr;</code> Live site
      </p>
      <section className="chat">
        <h2>Live from the stage</h2>
        <p className="sub">A demo conversation</p>
        <div className="phone">
          <div className="msg me">
            <span className="who">Cesar</span>
            jarvis, get me a landing page for the demo
          </div>
          <div className="msg bot">
            <span className="who">Jarvis</span>
            On it. Repo, page, deploy - 3 minutes.
          </div>
          <div className="msg bot">
            <span className="who">Jarvis</span>
            Shipped &#9989; ai-solutions.company/jarvis-bridge
          </div>
          <div className="msg me">
            <span className="who">Cesar</span>
            you&apos;re looking at it &#128526;
          </div>
        </div>
      </section>
      <section className="gate">
        {!unlocked ? (
          <>
            <h2>&iquest;Tienes la clave? / Got the password?</h2>
            <p>Enter it to talk to Jarvis.</p>
            <form onSubmit={unlock}>
              <div className="row">
                <input
                  type="password"
                  value={pw}
                  onChange={(e) => setPw(e.target.value)}
                  placeholder="Password"
                  autoComplete="off"
                  autoCapitalize="none"
                />
                <button type="submit">Enter</button>
              </div>
            </form>
            {badPw && <p className="err">Clave incorrecta. Wrong password, try again.</p>}
          </>
        ) : (
          <>
            <h2>Habla con Jarvis / Talk to Jarvis</h2>
            <p>Escribe tu mensaje. Las respuestas aparecen aqu&iacute;. / Replies show up here.</p>
            <div className="thread">
              {bubbles.length === 0 && (
                <div className="note">Env&iacute;a un mensaje para empezar / Send a message to start</div>
              )}
              {bubbles.map((b) => (
                <div key={b.id} className={'msg ' + (b.from === 'me' ? 'me' : 'bot')}>
                  <span className="who">{b.from === 'me' ? 'Jorge' : 'Jarvis'}</span>
                  {b.text}
                </div>
              ))}
              <div ref={endRef} />
            </div>
            <form className="composer" onSubmit={send}>
              <textarea
                required
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Tu mensaje / Your message"
              />
              <input className="hp" name="_honey" tabIndex={-1} autoComplete="off" aria-hidden="true" />
              <button type="submit" disabled={sending}>
                {sending ? '...' : 'Enviar'}
              </button>
            </form>
            {sendError && <p className="err">No se pudo enviar. Could not send, try again.</p>}
            <p className="sub" style={{ marginTop: 10, fontSize: '.8rem', color: '#6b7c93' }}>
              Jarvis responde en unos minutos / Jarvis replies within a few minutes
            </p>
          </>
        )}
      </section>
      <footer>Built live by agents &middot; AI Solutions</footer>
    </main>
  );
}
