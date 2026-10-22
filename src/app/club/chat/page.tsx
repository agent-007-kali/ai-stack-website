import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import ClubChat from '@/components/club/ClubChat';
import { SESSION_COOKIE, sessionFromCookieHeader } from '@/lib/club-members';
import './chat.css';

export const metadata: Metadata = {
  title: 'Club chat - AI Money Club',
  robots: { index: false, follow: false },
};

// Members-only chat room (issue #53). Session gate runs here server-side;
// the client component never sees credentials, only the display-name roster.
export default async function ClubChatPage() {
  const store = await cookies();
  const session = store.get(SESSION_COOKIE)?.value;
  const record = session ? await sessionFromCookieHeader(`${SESSION_COOKIE}=${session}`) : null;
  if (!record) redirect('/club/login');

  return (
    <main style={{ maxWidth: 1180, margin: '0 auto', padding: '32px 16px 48px' }}>
      <ClubChat />
    </main>
  );
}
