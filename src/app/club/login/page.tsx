import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import ClubLoginForm from '@/components/club/ClubLoginForm';
import { SESSION_COOKIE, sessionFromCookieHeader } from '@/lib/club-members';
import { cookies } from 'next/headers';

export const metadata: Metadata = {
  title: 'Member login - AI Money Club',
  robots: { index: false, follow: false },
};

// Paid-member login for the club chat (issue #53). Already signed in ->
// straight to /club/chat. Free tier has no chat access; passes are issued
// by the founder, never generated here.
export default async function ClubLoginPage() {
  const store = await cookies();
  const session = store.get(SESSION_COOKIE)?.value;
  const record = session
    ? await sessionFromCookieHeader(`${SESSION_COOKIE}=${session}`)
    : null;
  if (record) redirect('/club/chat');

  return (
    <main style={{ maxWidth: 560, margin: '0 auto', padding: '56px 20px', color: '#e8f1f5' }}>
      <h1 style={{ fontSize: 36, lineHeight: 1.1, margin: 0 }}>
        Club chat.
        <br />
        <span style={{ color: '#38d6e6' }}>Members only.</span>
      </h1>
      <p style={{ color: '#9bb', marginTop: 14, lineHeight: 1.55 }}>
        Chat is part of the £12/month paid membership. Your username and passcode come from Neo
        (the founder) when he sets up your membership - this page never creates accounts.
      </p>
      <div style={{ marginTop: 24 }}>
        <ClubLoginForm />
      </div>
      <p style={{ color: '#678', marginTop: 18, fontSize: 13, lineHeight: 1.5 }}>
        Five wrong attempts lock the username for ten minutes. Wrong username and wrong passcode
        give the same message on purpose. No passcode reset here - message Neo.
      </p>
    </main>
  );
}
