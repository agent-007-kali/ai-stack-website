**Homepage redesign shipped for review — PR + Vercel preview**

**PR:** https://github.com/agent-007-kali/ai-stack-website/pull/24 (`feature/homepage-storefront` → `main`, OPEN, not merged — PR only, nothing goes live)
**Vercel preview:** https://ai-stack-website-git-feature-home-50c39f-neos-projects-63c1f9f5.vercel.app
**Branch tip (read back from GitHub via `gh api`, not the local clone):** `bc5dd71d7ad1a73f20eb7d8438ddacd654e76841` — verified `src/app/page.tsx` exists on the branch (13130 B). Commits: `5a584f0` redesign, `bc5dd71` refreshed proof screenshots. Based on latest green `main` (`ad75631`, PRs #19/#20/#21 + hotfix #23 merged).

**What changed (homepage only):** `src/app/page.tsx`, `src/app/_home/StoreHeader.tsx`, `src/app/_home/home.css`, `next.config.ts` (drops the `/` → `/bowbot/index.html` rewrite so the new page serves at `/`). `/guide`, `/sample`, `/lobby`, `/try`, `/sales`, `/box*`, all checkout/Stripe code, env vars and `public/guides/` untouched; `mailto:tradersbooking@gmail.com` and the `/lobby` link kept (hero contact row + footer).

**Sections, top to bottom:** 0) sticky header with storefront search bar (type-ahead over this page's sections/products; Enter/click scrolls to and pulses the section — no backend, no new API routes) · 1) Bow Bot hero banner ("A frontier-grade AI agent that actually does the work.", 3-day free trial, £49 launch setup + £20/mo, Stripe buy link, WhatsApp angle) · 2) GUIDES side-scrolling carousel (4 guides from `src/lib/guides.ts` + the "All four guides" £35 bundle card, covers from `public/guides/<slug>.jpg`, Buy → `/guide` exactly as `/guide` links today; promo "Free sample chapter available →" → `/guide`, not `/sample`) · 3) BOW BOT product row → `/try` + Stripe buy link · 4) THE BOXES: Vega £2,995 → `/box`, Altair £3,995 → `/box-pro`, Rigel £7,995 → `/box-max` (copy/prices from the `/lobby` cards) · 5) ACADEMY promo → `/academy` (no invented pricing) · 6) TAILORED AGENTS promo → `/lobby` + `/sales`.

**Proof**
- `npm run build` → pass (exit 0); `npx tsc --noEmit` → clean (exit 0).
- No new console errors: `evidence/issue-133/checks.json` → `consoleErrors: []` at 1280 and 390.
- DOM order at both widths: `hero, guides, bowbot, boxes, academy, agents`.
- No horizontal overflow at 390: `docScrollWidth 390 === docClientWidth 390`, `overflowing: []`.
- Carousel scrolls sideways: desktop `1428 > 1168`, mobile `1268 > 358`, `couldScroll: true`.
- Screenshots (local Chrome CDP against the production build, committed): `evidence/issue-133/home-desktop-1280.png` (1280×3614), `evidence/issue-133/home-mobile-390.png` (390×6074), `evidence/issue-133/home-mobile-390-guides-scrolled.png` (390 carousel scrolled sideways). Reproduce with `node evidence/issue-133/storefront-check.mjs http://127.0.0.1:3199 evidence/issue-133`.

**Exact error — Vercel preview screenshots could not be captured from this runner.** The preview URL is up (Vercel bot reports deployment `Ready`), but every unauthenticated request from here is redirected to the login wall, so no screenshot of the hosted preview can be taken:

```
curl -sI https://ai-stack-website-git-feature-home-50c39f-neos-projects-63c1f9f5.vercel.app/
HTTP/2 302
location: https://vercel.com/sso-api?url=https%3A%2F%2Fai-stack-website-git-feature-home-50c39f-...vercel.app%2F&nonce=...
```

Same `302 → vercel.com/login` for static assets (`/icon.svg`) and for the previous preview (`feature-samp-66ab99...vercel.app`) — it is project-wide SSO/deployment protection, not a bad URL. No Vercel token or browser credentials are available here (and using them would be out of scope), so the 1280/390 screenshots above are of the identical build served from the production build locally. Please review the preview URL while signed in.

Not merged. Cesar reviews the preview first.
