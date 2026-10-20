# issue-127 local proof — last run

## What ran
`npm run build` and `npx tsc --noEmit` both pass (see build.txt / tsc.txt).
Server: `next start -p 3277` with `NODE_OPTIONS=--require evidence/issue-127/api-stubs.cjs`
so the route code runs over real HTTP. The stub only replaces the *transports* to
Stripe (in-process) and Vercel Blob (local REST server + local HTTPS blob host) —
no Stripe or Blob credentials exist in this sandbox. Env for the references / sample
signing came from a local `.env.local` (gitignored).

## Headline results (full log: smoke-test.txt)
- /guide: 5 product titles in order, bundle first; 5 Buy buttons
  (`Buy now - £35`, `£14`, `£9`, `£14`, `£14`); the "Not sure which one? Try a free
  chapter" → /sample line present.
- Checkout bundle: captured Stripe request body
  `name='All four guides (4 PDFs)' unit_amount=3500 currency=gbp
  metadata.product='bundle-all-four' payment_method_types='card' mode=payment`.
- Checkout refusal: with `BUNDLE_PRICE_PENCE` unset → 500 "Guide checkout not
  configured"; a control guide still 200.
- Bundle download: each of the four `?item=<slug>` streams its own PDF (200,
  application/pdf); item missing → 400; bad item → 404.
- Single-guide download unchanged (200 application/pdf, correct filename);
  unpaid → 402; unknown product → 404; bad id → 404.
- /guide/thanks for a bundle session renders four per-guide download links.
- /sample: heading, three fields + honeypot, "Send my free chapter", required fine print.
- Real form submit (headless Chrome) → 303 → `/sample/thanks?guide=prompt-pack&t=…`;
  token shape `<expiryMs>.<64-hex>`; thanks page then showed a signed download link and
  read fine while the PDF was absent ("Your sample chapter is on its way…").
- Sample download: absent object → plain-text 404 (not a stack); with the object
  present → 200 application/pdf, `Content-Disposition: attachment`, `Cache-Control:
  private, no-store`. Bad token → 403; expired token → 403; unknown guide → 404.
- /api/sample: unknown guide → 400, bad email → 400, empty name → 400;
  honeypot filled → 303 but nothing stored.
- /api/sample/signups: no key → 404; with key → the test signup JSON; deleted after.
- Rate limit (in-memory 10/hour/IP) observed live: after 10 submits from one IP,
  further submits returned 429.

## Screenshots (1280 and 390)
- guide-1280.png / guide-390.png — bundle card first, five Buy buttons, free-chapter line
- sample-1280.png / sample-390.png
- sample-thanks-1280.png / sample-thanks-390.png (after the real submit)

## Env vars to set in Vercel Preview + Production (names only)
`BUNDLE_PRICE_PENCE`, `NEXT_PUBLIC_BUNDLE_PRICE_LABEL`, `SAMPLE_LINK_SECRET`,
`SAMPLE_ADMIN_KEY`. Checkout safely refuses until `BUNDLE_PRICE_PENCE` is set.

## Blocker (honest note)
This sandbox's Vercel CLI is logged out and its GitHub token has no Vercel access, so
the four env vars above and the Vercel preview screenshots could not be produced here.
Everything else above ran locally against real HTTP. Proof file:
/home/neo/jarvis-work/task-proof/issue-127.json
