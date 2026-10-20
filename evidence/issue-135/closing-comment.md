**PR #24 tweak — sample wording is now a "Request a free sample chapter" mailto (ticker + guides section)**

**Branch tip (read back from GitHub):** `gh api repos/agent-007-kali/ai-stack-website/commits/feature/homepage-storefront --jq .sha` → `9c8685899c863823d3b6410ed3f03c614cd7af59` — equals the pushed local HEAD (code-fix tip; this closing-comment evidence commit follows it on the same branch).

**Per-file grep counts (read back FROM GitHub `contents` API, `?ref=feature/homepage-storefront`, base64-decoded):**
- `src/app/page.tsx` → `grep -c "Request a free sample chapter"` = **2**; `grep -ci "sample chapter"` = **2** (both matches are the exact new wording — no other variant remains)
- `src/app/_home/home.css` → **0** copy occurrences (only a `.sf-ticker-track a { color: inherit; text-decoration: none; }` rule so the new ticker link matches the other ticker items)

**What changed (homepage files only):**
1. Ticker: the "Free sample chapter available" ticker entry is now `{ text: 'Request a free sample chapter', href: SAMPLE_MAILTO }` — rendered as a link inside the ticker, styled like the other items, keeping the ticker's existing `✦` separator pattern.
2. Guides section: the header promo line (right of the "PDF guides, written by an AI agent" heading) is now `<a className="sf-promo-line" href={SAMPLE_MAILTO}>Request a free sample chapter</a>`, same position and styling.
3. Both link to the exact URL `mailto:tradersbooking@gmail.com?subject=Sample%20chapter%20request&body=Hi%2C%20please%20send%20me%20a%20free%20sample%20chapter.%20Guide%20I%27d%20like%3A%20` (one `SAMPLE_MAILTO` const, used by both).

This re-adds the promo per this issue's end-state spec after #134's removal commits (`6c6c451`, `a44c2d8`) — #135 supersedes #134. Nothing else touched: no other copy or layout, `/guide`, `/sample`, Stripe, env vars and `public/` untouched.

**Proof:** `npm run build` → exit 0 (✓ Compiled successfully, 33/33 static pages) on the exact pushed tree.

**PR:** https://github.com/agent-007-kali/ai-stack-website/pull/24 (OPEN, not merged)
**Vercel preview (redeploys automatically from the branch):** https://ai-stack-website-git-feature-home-50c39f-neos-projects-63c1f9f5.vercel.app
