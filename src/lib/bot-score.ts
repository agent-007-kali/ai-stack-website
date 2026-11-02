// Bot-Friendliness Score engine, v0.2 (private preview).
//
// Deterministic rubric: labelled evidence in, score out. Evidence classes:
//   DECLARED  - the site's own published docs/rules (with source URL + date)
//   OBSERVED  - a dated task test
//   SYNTHETIC-FIXTURE - made-up labelled evidence for exercising the rubric
// U (untested) is the default whenever evidence does not settle the task.
// This preview performs NO network fetch: all evidence is curated below.
// Grades 1-3 require observed enforcement/friction; 7 requires an observed
// completed task; 4-6 are declared-evidence grades. Real-site entries are
// kept only where task-specific owning-source documents support them.

export type ScoreTask = 'read' | 'account' | 'post' | 'buy';
export const SCORE_TASKS: readonly ScoreTask[] = ['read', 'account', 'post', 'buy'];

export type Evidence = {
  kind:
    | 'crawler-directive'        // e.g. robots.txt - reading only, never a terms permission
    | 'official-read-api'        // official documented API/feed for reading
    | 'official-action-api'      // official documented API covering account actions, terms permit automation
    | 'agent-native-route'       // published agent instructions/endpoints
    | 'observed-task-complete'   // dated completed task through a permitted route
    | 'observed-friction'        // dated friction with no published rule explaining it
    | 'published-prohibition'    // published rule barring an agent task
    | 'observed-enforcement';    // dated enforcement of a published rule
  // Required on published-prohibition: is the ban total or conditional?
  severity?: 'total_exclusion' | 'conditional_restriction';
  source: string | null;         // exact owning-source URL, or null for fixtures
  checked: string | null;        // ISO date
  note: string;
};

export type ScoreResult = {
  site: string;
  task: string;
  score: number | 'U';
  evidence_class: 'DECLARED' | 'OBSERVED' | 'SYNTHETIC-FIXTURE' | 'NONE';
  source_url: string | null;
  checked: string | null;
  note: string;
};

// The deterministic rubric. Highest applicable grade wins; nothing without
// supporting evidence grades at all (U).
export function gradeFromEvidence(ev: Evidence[]): { score: number | 'U'; basis: Evidence | null } {
  const has = (...kinds: Evidence['kind'][]) => ev.find((e) => kinds.includes(e.kind));
  const pub = has('published-prohibition');
  if (pub && has('observed-enforcement')) {
    // Grade comes from the explicit severity field, never from prose parsing:
    // total exclusion of agents => 1, conditional restriction => 2.
    return { score: pub.severity === 'total_exclusion' ? 1 : 2, basis: pub };
  }
  const native = has('agent-native-route');
  const done = has('observed-task-complete');
  if (native && done) return { score: 7, basis: done };
  const actionApi = has('official-action-api');
  if (actionApi) return { score: 6, basis: actionApi };
  const readApi = has('official-read-api');
  if (readApi) return { score: 5, basis: readApi };
  const crawl = has('crawler-directive');
  if (crawl) return { score: 4, basis: crawl };
  const friction = has('observed-friction');
  if (friction) return { score: 3, basis: friction };
  return { score: 'U', basis: null };
}

type SiteEvidence = { domain: string; task: ScoreTask; evidence_class: 'DECLARED' | 'SYNTHETIC-FIXTURE'; evidence: Evidence[] };

// Curated evidence. Real sites: DECLARED, task-specific owning sources only.
const EVIDENCE: SiteEvidence[] = [
  {
    domain: 'github.com', task: 'read', evidence_class: 'DECLARED',
    evidence: [{ kind: 'official-read-api', source: 'https://docs.github.com/en/rest/repos/contents', checked: '2026-11-02', note: 'Documented official endpoint for reading repository content.' }],
  },
  {
    domain: 'www.gov.uk', task: 'read', evidence_class: 'DECLARED',
    evidence: [{ kind: 'official-read-api', source: 'https://content-api.publishing.service.gov.uk', checked: '2026-11-02', note: 'Official GOV.UK content API for structured reading.' }],
  },
  {
    domain: 'www.reddit.com', task: 'read', evidence_class: 'DECLARED',
    evidence: [{ kind: 'official-read-api', source: 'https://www.reddit.com/dev/api/', checked: '2026-11-02', note: 'Official API documents reading endpoints. The same documentation also lists posting endpoints; what an agent may do under the API terms is undetermined here, so post stays U.' }],
  },
  {
    domain: 'medium.com', task: 'read', evidence_class: 'DECLARED',
    evidence: [{ kind: 'crawler-directive', source: 'https://medium.com/robots.txt', checked: '2026-11-02', note: 'robots.txt permits most paths to crawlers: evidence about automated reading under that directive only, not a terms-of-service permission.' }],
  },
  {
    domain: 'whop.com', task: 'read', evidence_class: 'DECLARED',
    evidence: [{ kind: 'crawler-directive', source: 'https://whop.com/robots.txt', checked: '2026-11-02', note: 'robots.txt allows crawlers except /api/: evidence about automated reading under that directive only, not a terms-of-service permission.' }],
  },
  // Synthetic labelled fixtures exercising every rubric grade.
  { domain: 'fixture-open.example', task: 'read', evidence_class: 'SYNTHETIC-FIXTURE',
    evidence: [{ kind: 'crawler-directive', source: null, checked: null, note: 'Synthetic: published directive tolerates automated reading. Other tasks have no fixture evidence and return U.' }] },
  { domain: 'fixture-api.example', task: 'read', evidence_class: 'SYNTHETIC-FIXTURE',
    evidence: [{ kind: 'official-read-api', source: null, checked: null, note: 'Synthetic: official documented read API.' }] },
  { domain: 'fixture-api.example', task: 'account', evidence_class: 'SYNTHETIC-FIXTURE',
    evidence: [{ kind: 'official-action-api', source: null, checked: null, note: 'Synthetic: official documented account-action API, terms permit automation.' }] },
  { domain: 'fixture-native.example', task: 'read', evidence_class: 'SYNTHETIC-FIXTURE',
    evidence: [
      { kind: 'agent-native-route', source: null, checked: null, note: 'Synthetic: published agent instructions.' },
      { kind: 'observed-task-complete', source: null, checked: null, note: 'Synthetic: dated completed task through the published route.' },
    ] },
  { domain: 'fixture-friction.example', task: 'post', evidence_class: 'SYNTHETIC-FIXTURE',
    evidence: [{ kind: 'observed-friction', source: null, checked: null, note: 'Synthetic: dated friction, no published rule explains it.' }] },
  { domain: 'fixture-restricted.example', task: 'post', evidence_class: 'SYNTHETIC-FIXTURE',
    evidence: [
      { kind: 'published-prohibition', severity: 'conditional_restriction', source: null, checked: null, note: 'Synthetic: published rule restricts automated posting.' },
      { kind: 'observed-enforcement', source: null, checked: null, note: 'Synthetic: dated enforcement of that rule.' },
    ] },
  { domain: 'fixture-excluded.example', task: 'buy', evidence_class: 'SYNTHETIC-FIXTURE',
    evidence: [
      { kind: 'published-prohibition', severity: 'total_exclusion', source: null, checked: null, note: 'Synthetic: published rule states agents are not permitted to buy at all.' },
      { kind: 'observed-enforcement', source: null, checked: null, note: 'Synthetic: dated enforcement of that rule.' },
    ] },
];

// Domain-only input: no scheme, path, port, credentials or IP literals.
const DOMAIN_RE = /^(?=.{1,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/;

export function normaliseSite(raw: string | null): string | null {
  if (!raw) return null;
  const s = raw.trim().toLowerCase();
  if (s.includes('://') || s.includes('/') || s.includes(':') || s.includes('@')) return null;
  return DOMAIN_RE.test(s) ? s : null;
}

export function normaliseTask(raw: string | null): ScoreTask | null {
  if (!raw) return 'read';
  const t = raw.trim().toLowerCase();
  return (SCORE_TASKS as readonly string[]).includes(t) ? (t as ScoreTask) : null;
}

export function scoreSite(site: string, task: ScoreTask): ScoreResult {
  const entry = EVIDENCE.find((e) => e.domain === site && e.task === task);
  if (entry) {
    const { score, basis } = gradeFromEvidence(entry.evidence);
    return {
      site, task, score,
      evidence_class: entry.evidence_class,
      source_url: basis?.source ?? null,
      checked: basis?.checked ?? null,
      note: basis?.note ?? 'No usable evidence.',
    };
  }
  return {
    site, task, score: 'U',
    evidence_class: 'NONE',
    source_url: null, checked: null,
    note: 'No evidence in the current registry for this site and task. U means unsettled, not restrictive. This preview performs no live fetch; the method is described at /bot.',
  };
}
