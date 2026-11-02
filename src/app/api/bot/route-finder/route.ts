import { NextRequest, NextResponse } from 'next/server';

// A URL builder for a small, source-checked set of official public read APIs.
// No outbound requests, credentials, account actions or arbitrary proxying.
const docs = {
  github: 'https://docs.github.com/en/rest/repos/contents',
  govuk: 'https://content-api.publishing.service.gov.uk',
};
const supported = ['github-file', 'govuk-page'];
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams;
  const job = q.get('job');
  const fail = (error: string) => NextResponse.json({ error, supported_jobs: supported }, { status: 400 });
  if (!job || !supported.includes(job)) return fail('unsupported_job');
  if ([...q.keys()].some(k => !['job', 'owner', 'repo', 'path', 'ref'].includes(k))) return fail('unknown_parameter');
  if ([...q.keys()].some(k => q.getAll(k).length !== 1)) return fail('duplicate_parameter');
  const path = q.get('path') ?? '';
  if (path.length > 1000 || /[\\?#\x00-\x20\x7f%]/.test(path) || path.split('/').some(p => p === '.' || p === '..')) return fail('invalid_path');
  let url: string;
  let limits: string[];
  if (job === 'github-file') {
    const owner = q.get('owner') ?? '';
    const repo = q.get('repo') ?? '';
    const ref = q.get('ref');
    if (!/^[a-zA-Z0-9][a-zA-Z0-9-]{0,38}$/.test(owner) || !/^[a-zA-Z0-9_.-]{1,100}$/.test(repo) || repo === '.' || repo === '..') return fail('invalid_repository');
    if (path.startsWith('/') || path.endsWith('/') || path.includes('//')) return fail('invalid_path');
    if (ref !== null && (!ref || ref.length > 200 || /[\x00-\x20\x7f]/.test(ref))) return fail('invalid_ref');
    url = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents${path ? '/' + path.split('/').map(encodeURIComponent).join('/') : ''}`;
    if (ref) url += '?ref=' + encodeURIComponent(ref);
    limits = ['Public repositories only without authentication; private access needs separately authorised credentials at GitHub, never supplied here.', 'Primary unauthenticated limit: 60 requests/hour per IP; honour current rate-limit and Retry-After headers and stop on 403/429.', 'Directories return listings (up to 1,000 entries); files over 100 MB are unsupported. File response encoding and media type vary.'];
  } else {
    if (q.has('owner') || q.has('repo') || q.has('ref')) return fail('parameters_not_applicable');
    if (!path.startsWith('/') || path.startsWith('//') || path.includes('//') || path.length < 2) return fail('invalid_govuk_path');
    url = 'https://www.gov.uk/api/content' + path.split('/').map(encodeURIComponent).join('/');
    limits = ['Only HTML content hosted on www.gov.uk, not other gov.uk subdomains, search results or arbitrary websites.', 'Some pages are unavailable, redirects or placeholders. Attachment/image contents are not included.', 'No numeric request allowance verified here. Use modest rates, cache results and honour service error/backoff responses.'];
  }
  return NextResponse.json({
    status: 'route_found', job, request: { method: 'GET', url, headers: { Accept: 'application/json' } },
    evidence_class: 'DECLARED', checked: '2026-11-02', source_url: job === 'github-file' ? docs.github : docs.govuk,
    rate_limit_source: job === 'github-file' ? 'https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api' : null,
    authentication: 'No authentication for the supported public read task. This preview itself still requires Vercel access.',
    limitations: limits,
    verification: 'Official route documented; this builder has not fetched your target or verified its availability, contents or suitability. No score is inferred from building a URL.',
  });
}
