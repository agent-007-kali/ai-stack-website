'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

function SetPasscodeForm() {
  const searchParams = useSearchParams();
  const u = searchParams.get('u');
  const t = searchParams.get('t');

  const [passcode, setPasscode] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  if (!u || !t) {
    return <p style={{ color: '#f66', marginTop: 18 }}>Invalid or expired setup link</p>;
  }

  if (done) {
    return (
      <div style={{ marginTop: 18 }}>
        <p style={{ color: '#e8f1f5' }}>Passcode set.</p>
        <p style={{ color: '#9bb', marginTop: 10 }}>
          <Link href="/club/login" style={{ color: '#38d6e6' }}>
            Go to login
          </Link>
        </p>
      </div>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (passcode !== confirm) {
      setError('Invalid or expired setup link');
      return;
    }
    if (passcode.length < 10 || passcode.length > 64 || !/^[A-Za-z0-9_-]+$/.test(passcode)) {
      setError('Invalid or expired setup link');
      return;
    }

    try {
      const res = await fetch('/api/club/set-passcode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: u, token: t, passcode }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError('Invalid or expired setup link');
        return;
      }
      setDone(true);
    } catch {
      setError('Invalid or expired setup link');
    }
  };

  return (
    <form onSubmit={submit} style={{ marginTop: 24, display: 'grid', gap: 12 }}>
      <label style={{ display: 'grid', gap: 6 }}>
        <span style={{ color: '#9bb' }}>New passcode</span>
        <input
          type="password"
          autoComplete="new-password"
          value={passcode}
          onChange={(e) => setPasscode(e.target.value)}
          style={{
            padding: '10px 12px',
            background: '#0f1a1f',
            color: '#e8f1f5',
            border: '1px solid #1f2a2f',
            borderRadius: 6,
          }}
        />
      </label>
      <label style={{ display: 'grid', gap: 6 }}>
        <span style={{ color: '#9bb' }}>Confirm passcode</span>
        <input
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          style={{
            padding: '10px 12px',
            background: '#0f1a1f',
            color: '#e8f1f5',
            border: '1px solid #1f2a2f',
            borderRadius: 6,
          }}
        />
      </label>
      {error && <p style={{ color: '#f66', margin: 0 }}>{error}</p>}
      <button
        type="submit"
        style={{
          padding: '10px 14px',
          background: '#38d6e6',
          color: '#001014',
          border: 0,
          borderRadius: 6,
          fontWeight: 600,
        }}
      >
        Set passcode
      </button>
    </form>
  );
}

export default function SetPasscodePage() {
  return (
    <main style={{ maxWidth: 560, margin: '0 auto', padding: '56px 20px', color: '#e8f1f5' }}>
      <h1 style={{ fontSize: 36, lineHeight: 1.1, margin: 0 }}>
        Set your passcode.
      </h1>
      <p style={{ color: '#9bb', marginTop: 14, lineHeight: 1.55 }}>
        Choose your own passcode for the AI Money Club.
      </p>
      <Suspense fallback={<p style={{ color: '#9bb', marginTop: 18 }}>Loading...</p>}>
        <SetPasscodeForm />
      </Suspense>
    </main>
  );
}
