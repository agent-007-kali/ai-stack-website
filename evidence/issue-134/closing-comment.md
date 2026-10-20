**PR #24 fix — "Free sample chapter" promo removed (samples are not live)**

**Branch tip (read back from GitHub):** `6c6c45153002af4840c324e96c5ab841790e4edb` — `gh api repos/agent-007-kali/ai-stack-website/commits/feature/homepage-storefront --jq .sha` equals the local pushed HEAD. PR #24 head SHA on GitHub matches.

**Per-file grep counts (read back FROM GitHub `contents` API, `?ref=feature/homepage-storefront`):**
- `src/app/page.tsx`: `grep -ci "free sample chapter"` → **0**
- No other homepage files were edited (`git show --stat` on the fix commit touches only `src/app/page.tsx`; repo-wide case-insensitive grep of `src/` for "free sample chapter" → 0 matches).

**What changed:** exactly 4 deleted lines in `src/app/page.tsx`, both homepage occurrences of "Free sample chapter available":
1. the promo-ticker array entry (top ticker) — the ticker renders `TICKER.map()` with a `✦` separator after every item, so removing the array entry leaves no stray separator;
2. the guides-section header `<Link className="sf-promo-line" href="/guide">Free sample chapter available →</Link>` — the whole link element removed, no empty anchor left behind.

Nothing else touched: no other copy, no layout, `/guide`, `/sample`, Stripe, env vars and `public/` untouched. `/sample` remains gated behind the unset `NEXT_PUBLIC_SAMPLE_ENABLED`; the storefront no longer advertises it anywhere.

**Proof:** `npm run build` → exit 0 (✓ Compiled successfully, 33/33 static pages) on the exact pushed tree.

**PR:** https://github.com/agent-007-kali/ai-stack-website/pull/24 (OPEN, not merged)
**Vercel preview (redeployed automatically for the new tip, status `success` on `6c6c451`):** https://ai-stack-website-git-feature-home-50c39f-neos-projects-63c1f9f5.vercel.app
