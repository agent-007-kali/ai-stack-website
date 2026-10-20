**PR #24 fix — homepage no longer advertises free sample chapters (samples are not live)**

**Branch tip (read back from GitHub):** code-fix tip `a44c2d83da2dbf32559d6c41728a27f4dfa0da5a` — `gh api repos/agent-007-kali/ai-stack-website/commits/feature/homepage-storefront --jq .sha` equals the local pushed HEAD; PR #24 head matches. (This closing-comment evidence commit follows it on the same branch.)

**Per-file grep counts (read back FROM GitHub `contents` API, `?ref=feature/homepage-storefront`, case-insensitive "free sample chapter"):**
- `src/app/page.tsx` → **0**
- `src/app/_home/StoreHeader.tsx` → **0**
- `src/app/_home/home.css` → **0**

**What changed in `src/app/page.tsx` (only file touched by the fix):** all "Free sample chapter" promos removed —
1. the promo-ticker entry (top ticker; the ticker maps items and appends a `✦` separator per remaining item, so no stray separator is left),
2. the guides-section header promo link (whole `<a>` removed — no empty anchor left behind),
3. a concurrent re-add on the branch ("Request a free sample chapter" mailto, issue #135) was also removed per this issue's requirement that the storefront must not advertise free sample chapters anywhere while `/sample` stays gated behind the unset `NEXT_PUBLIC_SAMPLE_ENABLED`; that commit's structural ticker refactor (`string | {text, href}` items) was left intact.

Nothing else touched: no other copy, no layout, `/guide`, `/sample`, Stripe, env vars and `public/` untouched.

**Proof:** `npm run build` → exit 0 (✓ Compiled successfully, 33/33 static pages) on the exact pushed tree.

**PR:** https://github.com/agent-007-kali/ai-stack-website/pull/24 (OPEN, not merged)
**Vercel preview (redeployed automatically for the new tip; commit status `success` on `a44c2d8`):** https://ai-stack-website-git-feature-home-50c39f-neos-projects-63c1f9f5.vercel.app
