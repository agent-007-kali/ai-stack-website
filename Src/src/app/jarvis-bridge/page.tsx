export const metadata = {
  title: "Jarvis Bridge | AI Solutions",
  description:
    "Text your computer. It builds things. Jarvis Bridge turns one phone message into agents that research, code and deploy.",
};

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
`;

export default function JarvisBridgePage() {
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
      <footer>Built live by agents &middot; AI Solutions</footer>
    </main>
  );

}
