# Pull request for issue #122 (ready to open — blocked by read-only credentials here)

Title: Make /guide a shelf of four paid guides; shared product table and handlers (issue #122)

Base: main
Head: feature/guide-shelf
Supersedes #120 and #121 (no separate product pages).

## What changed

- `src/lib/guides.ts` — one table for all four guides: slug, title, copy, 3 bullets,
  price env (`*_PRICE_PENCE`), label env (`NEXT_PUBLIC_*_PRICE_LABEL`), Stripe
  `metadata.product` and private Blob pathname, plus `guideBySlug`,
  `guideByMetaProduct` and price helpers. The `NEXT_PUBLIC_` labels are read with
  literal member expressions so the client bundle inlines them.
- `src/lib/guide-handlers.ts` — shared handlers used by both routes.
  - `createGuideCheckout`: no body = guide 1 (unchanged behaviour);
    `{product:'<slug>'}` buys another guide; unknown/malformed slug = 400;
    refuses (500) when that guide's price env is unset or < 100; trims the
    Stripe key; `try/catch` returns `{error:'Checkout unavailable'}`.
    Product name `"<title> (PDF)"`, description “Digital PDF, written by an AI
    agent. Instant download after payment.”, `payment_method_types:['card']`,
    that guide's metadata, success `/guide/thanks?session_id={CHECKOUT_SESSION_ID}`,
    cancel `/guide?canceled=1`.
  - `guideDownload`: `cs_` id required, Stripe retrieve (bad id = 404),
    unpaid = 402, `metadata.product` must map to a known guide (unknown = 404),
    then streams the private Blob with `get(path, {access:'private'})` and
    `Cache-Control: private, no-store`. No public URL.
- `src/app/guide/page.tsx` — shelf of the four guides, each its own dark card
  (title, teal "Written by an AI agent", 2–3 line description, 3 bullets,
  price label when set, its own Buy button posting `{product: slug}`).
  Heading "Guides for small businesses" + one-line intro, Stripe footer note once.
- `src/app/guide/thanks/page.tsx` — still shows the download link; adds the
  purchased guide's title when the paid session's metadata can be read.
- The two route files are thin wrappers over the shared handlers.

Homepage/nav untouched (PR #17 owns the homepage /guide link). No PDF committed,
nothing under `public/` or `private/`. No other Stripe route or the webhook touched.

## Local verification (see evidence/issue-122/)

`npm run build` passes. Local `next start` (price env set, Stripe SDK redirected
to an in-process stub because no Stripe credential exists in this sandbox):

- `/guide` = 200, four cards in order, prices £14 / £9 / £14 / £14,
  "Written by an AI agent" ×4, "No coding needed" ×4, one Stripe footer note.
- checkout POST (no body), prompt-pack, admin-guide, accountants-guide = 200;
  captured Stripe bodies show unit_amount 1400 / 900 / 1400 / 1400, currency gbp,
  `payment_method_types=['card']`, the right metadata and URLs.
- unknown slug = 400; malformed body = 400
- unpaid session download = 402; fake id = 404; no id / bad prefix = 404;
  paid session with unknown `metadata.product` = 404
- price env unset or < 100 = 500 "Guide checkout not configured"

Screenshot: `evidence/issue-122/01-guide-shelf.png`.
