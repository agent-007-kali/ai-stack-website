// The Club Daily feed (the "Today in AI" section on /club).
//
// Storage follows src/lib/bow-relay/relay.ts and src/lib/club-chat.ts: one
// PRIVATE GitHub issue (title `club-daily`, label `club-daily`) in the
// private jarvis-bridge repo, discovered by label+title. The morning
// research workflow posts each edition as a NEW comment holding one JSON
// object; the page renders the latest comment that parses. Server-side
// only: the token, repo and issue number never reach the client, and any
// failure hides the section instead of breaking the page.
//
// Rules for every edition (enforced by the workflow, mirrored here):
// items are verified against their sources the morning they ship, source
// links are https only, and nothing carries over unchecked.

export type ClubDailyItem = {
  name: string;
  detail: string;
  sourceLabel: string;
  sourceUrl: string;
};

export type ClubDailySection = {
  label: string;
  items: ClubDailyItem[];
};

export type ClubDaily = {
  date: string;
  verifiedAt: string;
  sections: ClubDailySection[];
};

const DAILY_REPO = 'agent-007-kali/jarvis-bridge';
const DAILY_LABEL = 'club-daily';
const DAILY_TITLE = 'club-daily';

// Display safety bounds: a feed comment is a short brief, not an article.
const MAX_SECTIONS = 4;
const MAX_ITEMS = 12;
const MAX_TEXT = 600;
const MAX_LABEL = 40;

type GhIssue = { number: number; title: string; body?: string | null; pull_request?: unknown };
type GhComment = { id: number; body?: string | null; created_at: string };

async function gh(path: string): Promise<Response> {
  return fetch(`https://api.github.com/repos/${DAILY_REPO}${path}`, {
    cache: 'no-store',
    headers: {
      Authorization: 'Bearer ' + process.env.JARVIS_GITHUB_TOKEN,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'club-daily',
    },
  });
}

const clip = (value: unknown, max: number): string | null =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim().slice(0, max) : null;

function parseClubDaily(body: string | null | undefined): ClubDaily | null {
  if (!body) return null;
  let raw: unknown;
  try {
    raw = JSON.parse(body);
  } catch {
    return null;
  }
  if (typeof raw !== 'object' || raw === null) return null;
  const candidate = raw as Record<string, unknown>;
  const date = clip(candidate.date, MAX_LABEL);
  const verifiedAt = clip(candidate.verifiedAt, MAX_LABEL);
  if (!date || !verifiedAt || !Array.isArray(candidate.sections)) return null;
  const sections: ClubDailySection[] = [];
  let items = 0;
  for (const s of candidate.sections.slice(0, MAX_SECTIONS)) {
    if (typeof s !== 'object' || s === null) return null;
    const section = s as Record<string, unknown>;
    const label = clip(section.label, MAX_LABEL);
    if (!label || !Array.isArray(section.items) || section.items.length === 0) return null;
    const parsed: ClubDailyItem[] = [];
    for (const i of section.items) {
      if (typeof i !== 'object' || i === null) return null;
      const item = i as Record<string, unknown>;
      const name = clip(item.name, 120);
      const detail = clip(item.detail, MAX_TEXT);
      const sourceLabel = clip(item.sourceLabel, MAX_LABEL);
      const sourceUrl = typeof item.sourceUrl === 'string' ? item.sourceUrl : '';
      if (!name || !detail || !sourceLabel || !/^https:\/\/[A-Za-z0-9.-]+\.[A-Za-z]{2,}(\/\S*)?$/.test(sourceUrl)) {
        return null;
      }
      parsed.push({ name, detail, sourceLabel, sourceUrl });
      items += 1;
      if (items > MAX_ITEMS) return null;
    }
    sections.push({ label, items: parsed });
  }
  return sections.length > 0 ? { date, verifiedAt, sections } : null;
}

/** Latest parseable edition from the private feed issue, or null to hide the section. */
export async function getClubDaily(): Promise<ClubDaily | null> {
  if (!process.env.JARVIS_GITHUB_TOKEN) return null;
  try {
    const listRes = await gh(`/issues?state=open&labels=${DAILY_LABEL}&per_page=20`);
    if (!listRes.ok) return null;
    const issues = ((await listRes.json()) as GhIssue[]).filter((i) => !i.pull_request);
    const issue = issues.find((i) => i.title === DAILY_TITLE);
    if (!issue) return null;

    const commentsRes = await gh(`/issues/${issue.number}/comments?per_page=10&direction=desc`);
    if (commentsRes.ok) {
      const comments = (await commentsRes.json()) as GhComment[];
      for (const comment of comments) {
        const daily = parseClubDaily(comment.body);
        if (daily) return daily;
      }
    }
    // Fall back to the issue body itself so the seed edition can live there.
    return parseClubDaily(issue.body);
  } catch {
    return null;
  }
}
