## What

Redesigns the main homepage `/` (issue #133, re-file of #131) into an "Amazon of AI" storefront: search bar, scrolling promo banners and product rows for AI products and agents. Dark background + teal `#37e0c8` accents kept, no horizontal overflow at 390px.

**Files changed (homepage-only):**

- `src/app/page.tsx` — new storefront homepage (server component + metadata)
- `src/app/_home/StoreHeader.tsx` — sticky header with the storefront search bar (client; filters/scrolls to matching sections on this page only, no backend, no new API routes)
- `src/app/_home/home.css` — storefront styles (scoped `.sf*`)
- `next.config.ts` — drops the `/` → `/bowbot/index.html` rewrite so the new page is served at `/` (the static page is still reachable at `/bowbot/index.html`)
- `evidence/issue-133/` — local proof: CDP check script, checks.json, desktop/mobile screenshots

**Section order, top to bottom:**

0. Header with storefront search bar (type-ahead over this page's sections/products; Enter/click scrolls + pulses the section)
1. Hero — Bow Bot storefront banner: "A frontier-grade AI agent that actually does the work.", 3-day free trial, £49 launch setup (normally £99) + £20/mo, Stripe buy link, WhatsApp angle
2. GUIDES — horizontally side-scrolling carousel, one card per guide from `src/lib/guides.ts` (cover `public/guides/<slug>.jpg`, title, price label, Buy → `/guide`, exactly as `/guide` links today), plus the **All four guides** £35 bundle card; promo line "Free sample chapter available →" → `/guide` (not `/sample`)
3. BOW BOT — product-row promo → `/try` + the existing Stripe buy link
4. THE BOXES — Vega £2,995 → `/box`, Altair £3,995 → `/box-pro`, Rigel £7,995 → `/box-max` (copy/prices from the `/lobby` cards)
5. ACADEMY — promo row → `/academy` (exists), no invented pricing
6. TAILORED AGENTS — promo row → `/lobby` (Sol reception) and `/sales`

`mailto:tradersbooking@gmail.com` and the `/lobby` link are kept (contact row in the hero + footer).

**Not touched:** `/guide`, `/sample`, `/lobby`, `/try`, `/sales`, `/box*`, all checkout/download/Stripe code and env vars, `public/guides/`.

## Proof

- `npm run build` → **pass** (exit 0)
- `npx tsc --noEmit` → **clean** (exit 0)
- No new console errors: `evidence/issue-133/checks.json` — `consoleErrors: []` at both 1280 and 390
- Section order read from the DOM at both widths: `hero, guides, bowbot, boxes, academy, agents`
- No horizontal overflow at 390: `docScrollWidth 390 === docClientWidth 390`, `overflowing: []`
- Guides carousel scrolls sideways: desktop `scrollWidth 1428 > clientWidth 1168`, mobile `1268 > 358`, `couldScroll: true`
- Screenshots (local Chrome CDP against the production build): `evidence/issue-133/home-desktop-1280.png` (1280×3614), `evidence/issue-133/home-mobile-390.png` (390×6074), `evidence/issue-133/home-mobile-390-guides-scrolled.png` (carousel scrolled sideways at 390)
- Vercel preview screenshots could not be captured from this runner: the preview URL (`https://ai-stack-website-git-feature-home-50c39f-neos-projects-63c1f9f5.vercel.app`, deployment **Ready**) answers `302` → `https://vercel.com/sso-api` → `vercel.com/login` for every path (project-wide SSO/deployment protection; same for the earlier `feature-samp-66ab99` preview). Exact error is quoted in the closing comment on issue #133; the screenshots above are of the same production build served locally.

Code commits `5a584f0` (redesign) and `bc5dd71` (proof screenshots) were verified on GitHub via `gh api` against the branch ref and `contents/src/app/page.tsx?ref=feature/homepage-storefront` (13130 B); evidence-only commits follow them. Branch tip at issue-close time: `d9a64adda93c4b4d766a122fa5267db0b5cf4f0a` (read back from GitHub, recorded in the closing comment on issue #133).

**PR only — do not merge.** Cesar reviews the Vercel preview first.
