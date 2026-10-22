# Sample chapter PDFs — not built yet (issue #128)

Draft note only; **no PDF is committed here and nothing under `public/`**.

Issue #128 asked for four free sample chapter PDFs (branded cover page +
unchanged chapter pages from each full guide) uploaded to the **private**
Vercel Blob store at `samples/<slug>.pdf`. None could be built, because every
source guide PDF was unreadable both ways:

- **Local copies** — the only guide-like PDF on this desktop is
  `listener-73/jobs/issue-115/private/Hire-Your-First-AI-Employee.pdf`, a
  1-page test placeholder (`pdfinfo` Title `PLACEHOLDER - Hire Your First AI
  Employee`; `pdftotext`: "PLACEHOLDER PDF - NOT THE REAL GUIDE"). The other
  three guides have no local copy anywhere under `~/jarvis-work`,
  `~/Downloads` or `~/Desktop`.
- **Private Blob** — reading the four source pathnames with `@vercel/blob`
  `get(pathname, { access: "private" })` fails for every one of them with:

  ```text
  Vercel Blob: No blob credentials found. Pass a `token` option, set
  `BLOB_READ_WRITE_TOKEN`, or use `oidcToken` (or `VERCEL_OIDC_TOKEN`) with
  `storeId` or `BLOB_STORE_ID`.
  ```
  The same error is returned by `put()` for `samples/<slug>.pdf`, so the
  uploads could not be performed either. No `BLOB_READ_WRITE_TOKEN`,
  `VERCEL_OIDC_TOKEN` or `BLOB_STORE_ID` exists in this worker's environment
  and `vercel whoami` reports "Logged out."

Missing for all four slugs — `prompt-pack`, `admin-guide`, `accountants-guide`,
`hire-first-ai-employee`. With a readable guide PDF (or a working
`BLOB_READ_WRITE_TOKEN`) the remaining steps are unchanged: extract the
verified chapter ranges with `qpdf`/`pdfseparate` + `pdfunite`, render the
cover page from HTML with headless Chrome at the guide's own page size, and
upload `samples/<slug>.pdf` with `access: "private"`, `addRandomSuffix: false`,
`contentType: "application/pdf"`.

Full probe logs: `evidence/issue-128/` in the issue #128 working copy
(`local-copy-probe.txt`, `blob-probe.txt`, `fallback-report.txt`).
