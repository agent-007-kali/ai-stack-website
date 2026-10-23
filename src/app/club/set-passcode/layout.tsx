import type { Metadata } from 'next';

// Setup URLs carry a one-time token in the query string, so keep this page
// out of search indexes and avoid leaking the URL through the Referer header.
export const metadata: Metadata = {
  title: 'Set your passcode - AI Money Club',
  description: 'Set your own AI Money Club passcode.',
  robots: { index: false, follow: false },
  other: { referrer: 'no-referrer' },
};

export default function SetPasscodeLayout({ children }: { children: React.ReactNode }) {
  return children;
}
