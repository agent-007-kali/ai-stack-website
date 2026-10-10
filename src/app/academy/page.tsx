'use client';
import React, { useState } from 'react';

const GATE = '94a9b48b67c6de6fc02044cace73ae68e1fb57c1713843f29ca62afcdd20c67f';

function sha(msg: string): string {
    const K = [0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
    const bytes = Array.from(unescape(encodeURIComponent(msg)), (c) => c.charCodeAt(0));
    const bitLen = bytes.length * 8;
    bytes.push(0x80);
    while (bytes.length % 64 !== 56) bytes.push(0);
    for (let i = 7; i >= 0; i--) bytes.push(i >= 4 ? 0 : (bitLen >>> (i * 8)) & 0xff);
    const H = [0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];
    const rotr = (x: number, n: number) => (x >>> n) | (x << (32 - n));
    for (let o = 0; o < bytes.length; o += 64) {
        const w: number[] = [];
        for (let i = 0; i < 16; i++) w[i] = (bytes[o+i*4] << 24) | (bytes[o+i*4+1] << 16) | (bytes[o+i*4+2] << 8) | bytes[o+i*4+3];
        for (let i = 16; i < 64; i++) {
            const s0 = rotr(w[i-15],7) ^ rotr(w[i-15],18) ^ (w[i-15] >>> 3);
            const s1 = rotr(w[i-2],17) ^ rotr(w[i-2],19) ^ (w[i-2] >>> 10);
            w[i] = (w[i-16] + s0 + w[i-7] + s1) | 0;
        }
        let [a,b,c,d,e,f,g,h] = H;
        for (let i = 0; i < 64; i++) {
            const t1 = (h + (rotr(e,6) ^ rotr(e,11) ^ rotr(e,25)) + ((e & f) ^ (~e & g)) + K[i] + w[i]) | 0;
            const t2 = ((rotr(a,2) ^ rotr(a,13) ^ rotr(a,22)) + ((a & b) ^ (a & c) ^ (b & c))) | 0;
            h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
        }
        const v = [a,b,c,d,e,f,g,h];
        for (let i = 0; i < 8; i++) H[i] = (H[i] + v[i]) | 0;
    }
    return H.map((x) => (x >>> 0).toString(16).padStart(8, '0')).join('');
}

const modules = [
    { name: 'Meet your AI agent', detail: 'What an agent is, what it can do on your phone and desktop, and how to get set up in 15 minutes.', value: 'Starter' },
    { name: 'Talking to AI properly', detail: 'Prompts that work, giving context, and getting the same quality twice.', value: 'Starter' },
    { name: 'Your inbox and calendar on autopilot', detail: 'Triage email, draft replies, book meetings, with you approving each step.', value: 'Starter' },
    { name: 'Research and writing', detail: 'Briefings, summaries, proposals and social posts in minutes, with sources checked.', value: 'Builder' },
    { name: 'Sell more with AI', detail: 'Lead lists, outreach, follow-ups and booking confirmations that sound like you.', value: 'Builder' },
    { name: 'Build your own custom agent', detail: 'Pick a job in your business and build an agent for it, step by step.', value: 'Builder' },
    { name: 'Stay safe', detail: 'Privacy, prompt injection, scams, and what never to let an agent do alone.', value: 'Pro' },
    { name: 'Capstone: launch your agent', detail: 'Deploy your agent for real, present it, and get feedback from the team.', value: 'Pro' },
];


const tiers = [
  ['Taster', 'Module 1 only', 'Free'],
  ['Single module', 'Buy any module on its own', '£19'],
  ['Track', 'One track of 3 modules (Pro is 2)', '£49'],
  ['Full Academy', 'All 8 modules, lifetime access, updates', '£129'],
  ['Academy + 1:1', 'Full Academy plus the £100 online 1:1', '£199'],
  ['Team', 'Full Academy for 5 staff, plus a group call', '£499'],
];
const steps = [
  'Start with a free taster: module 1, no payment.',
  'Each module is about 45 minutes: a short video from Ana, one hands-on task, and a quick check.',
  'Modules unlock in order inside a track: Starter, Builder, Pro.',
  'Every track ends with a small project the student keeps, such as a working inbox agent.',
  'Optional: book the £100 online 1:1 to go through your own setup with a person.',
];

const ink = '#251f21', sub = '#585254', teal = '#4f8c7c', line = '#eae9ea';
const wrap: React.CSSProperties = { maxWidth: 640, margin: '0 auto', padding: '32px 20px 64px', fontFamily: 'system-ui, sans-serif', color: ink, background: '#fff', minHeight: '100vh' };
const h2: React.CSSProperties = { fontSize: 22, margin: '36px 0 12px' };
const row: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', gap: 16, padding: '12px 0', borderBottom: '1px solid ' + line };

export default function AcademyPage() {
  const [ok, setOk] = useState(false);
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [err, setErr] = useState(false);
  const submit = () => { if (sha(user.trim() + ':' + pass) === GATE) setOk(true); else setErr(true); };
  const ana = <div style={{ textAlign: 'center', margin: '16px 0' }}><img src="/academy/ana.jpg" alt="Ana, the Academy mascot, waving in a graduation cap" width={180} style={{ maxWidth: '60%', height: 'auto', borderRadius: 24 }} /></div>;
  return (
    <main style={wrap}>
      <h1 style={{ fontSize: 32, margin: 0 }}>AI Solutions Academy</h1>
      <p style={{ color: sub }}>Learn AI with Ana</p>
      {!ok ? (
        <section>
          <h2 style={h2}>Student login</h2>
          {ana}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 360 }} onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontWeight: 600 }}>Username
              <input value={user} onChange={(e) => setUser(e.target.value)} autoCapitalize="none" autoComplete="username" style={{ font: 'inherit', padding: 12, border: '1px solid ' + line, borderRadius: 4, minHeight: 44 }} /></label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontWeight: 600 }}>Password
              <input type="password" value={pass} onChange={(e) => setPass(e.target.value)} autoComplete="current-password" style={{ font: 'inherit', padding: 12, border: '1px solid ' + line, borderRadius: 4, minHeight: 44 }} /></label>
            <button type="button" onClick={submit} style={{ font: 'inherit', fontWeight: 600, padding: 12, minHeight: 44, border: 0, borderRadius: 4, background: ink, color: '#fff', cursor: 'pointer' }}>Enter the Academy</button>
            {err && <span style={{ color: '#ed313e' }}>That username or password is not right. Try again.</span>}
          </div>
        </section>
      ) : (
        <section>
          <h2 style={h2}>Hello from Ana</h2>
          {ana}
          <p>Hi, I&apos;m Ana! I run the AI Solutions Academy. I&apos;ll walk you through eight short modules, one at a time, so you can use AI for real work. Pick up where you left off any time.</p>
          <h2 style={h2}>The modules</h2>
          {modules.map((m, i) => (
            <div key={m.name} style={row}><div><strong>{i + 1}. {m.name}</strong><div style={{ color: sub, fontSize: 14 }}>{m.detail}</div></div><strong style={{ color: teal }}>{m.value}</strong></div>
          ))}
          <h2 style={h2}>How students take them</h2>
          <ol style={{ paddingLeft: 20, lineHeight: 1.6 }}>{steps.map((s) => <li key={s}>{s}</li>)}</ol>
          <h2 style={h2}>Pricing</h2>
          {tiers.map(([n, d, v]) => (
            <div key={n} style={row}><div><strong>{n}</strong><div style={{ color: sub, fontSize: 14 }}>{d}</div></div><strong style={{ color: teal }}>{v}</strong></div>
          ))}
        </section>
      )}
    </main>
  );
}
