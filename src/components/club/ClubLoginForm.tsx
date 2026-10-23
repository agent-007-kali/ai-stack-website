'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

// Login form for the AI Money Club chat (issue #53). Posts JSON to
// /api/club/login; the route answers with a generic error for any wrong
// username/passcode pair, so this form never distinguishes them either.

const input = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '12px 14px',
  fontSize: 16,
  fontFamily: 'inherit',
  color: '#e8f1f5',
  background: '#08111a',
  border: '1px solid #1d3a4d',
  borderRadius: 8,
  outline: 'none',
} as const;

const button = {
  width: '100%',
  padding: '13px 14px',
  fontSize: 16,
  fontWeight: 700,
  fontFamily: 'inherit',
  color: '#04141a',
  background: '#38d6e6',
  border: 'none',
  borderRadius: 8,
  cursor: 'pointer',
} as const;

export default function ClubLoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/club/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, passcode }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (res.ok && data.ok) {
        router.push('/club/chat');
        router.refresh();
        return;
      }
      setError(data.error || 'Wrong username or passcode');
    } catch {
      setError('Could not reach the server. Try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        border: '1px solid #1d3a4d',
        borderRadius: 12,
        padding: '28px 24px 30px',
        background: '#0c1722',
      }}
    >
      <label style={{ display: 'flex', flexDirection: 'column', gap: 7, fontSize: 14, color: '#9bb' }}>
        Username
        <input
          style={input}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          maxLength={24}
          required
        />
      </label>
      <label style={{ display: 'flex', flexDirection: 'column', gap: 7, fontSize: 14, color: '#9bb' }}>
        Passcode
        <input
          style={{ ...input, letterSpacing: '0.12em' }}
          value={passcode}
          onChange={(e) => setPasscode(e.target.value)}
          autoComplete="current-password"
          spellCheck={false}
          maxLength={40}
          required
        />
      </label>
      {error ? (
        <p role="alert" style={{ margin: 0, fontSize: 14, color: '#ff8f8f' }}>
          {error}
        </p>
      ) : null}
      <button style={button} type="submit" disabled={busy}>
        {busy ? 'Checking…' : 'Enter the chat'}
      </button>
    </form>
  );
}
