// Room set and message shapes for the AI Money Club chat (issue #53).
// Deliberately dependency-free so the client component can import the rooms
// without dragging server-only modules (Blob, GitHub fetch) into the bundle.

export type ClubRoomId =
  | 'ideas'
  | 'help'
  | 'wins'
  | 'jobs-gigs'
  | 'show-tell'
  | 'ask-jarvis'
  | 'collab-board'
  | 'referrals';

export type ClubRoom = { id: ClubRoomId; title: string; blurb: string };

/** Room order and purposes from the spec (issue #53 comments 19:31Z). */
export const CLUB_ROOMS: readonly ClubRoom[] = [
  { id: 'ideas', title: 'ideas', blurb: 'What are you building? Daily prompts land here.' },
  { id: 'help', title: 'help', blurb: 'Stuck on something? Ask the room.' },
  { id: 'wins', title: 'wins', blurb: 'Small wins count. Post them.' },
  { id: 'jobs-gigs', title: 'jobs-gigs', blurb: 'Paid work worth sharing.' },
  { id: 'show-tell', title: 'show-tell', blurb: 'Show what you made this week.' },
  { id: 'ask-jarvis', title: 'ask-jarvis', blurb: 'Jarvis (AI host) answers here.' },
  { id: 'collab-board', title: 'collab-board', blurb: 'Find people to build with.' },
  { id: 'referrals', title: 'referrals', blurb: 'Referral links live here ONLY.' },
] as const;

export function isClubRoom(value: unknown): value is ClubRoomId {
  return typeof value === 'string' && CLUB_ROOMS.some((r) => r.id === value);
}

export type ClubSenderKind = 'member' | 'founder' | 'ai';

export type ClubMessage = {
  id: number;
  kind: ClubSenderKind;
  name: string;
  text: string;
  ts: number;
};

export type ClubBuddy = {
  name: string;
  founder: boolean;
  online: boolean;
  ai: boolean;
};
