# Groq-first tier — proof (issue #92, PR #10)

Adds the Groq-first tier to the Bow live relay on `feature/bow-live-relay` (owner
update on jarvis-bridge#81, 2026-10-17 ~12:37). The GitHub-issue relay already
built in #81 is kept as the middle tier; the labelled scripted demo stays behind
it. PR-only: no merge, no production deploy, **no Vercel env or settings change**
by the agent.

## Answer chain

1. **Escalation** (price / payment / custom-promise question): deterministic,
   runs before any model call, so nothing is improvised. Reply is the exact
   holding line `That's one for the team - they'll confirm by email` and the
   enquiry is forwarded to `tradersbooking@gmail.com` (captured server-side, see
   `escalations.txt`). This also works when the key is absent.
2. **Groq** (`src/lib/bow-relay/groq.ts`): OpenAI-compatible chat completion,
   model `llama-3.3-70b-versatile` then fallback `openai/gpt-oss-120b`.
3. **GitHub-issue relay** (`src/lib/bow-relay/relay.ts`, unchanged): used when
   the Groq tier returns `skip` — missing key, per-IP limit, daily budget or
   upstream error. Falls through silently.
4. **Scripted demo** (client, clearly labelled): when the relay is unreachable.

`GROQ_API_KEY` is read from the server env only. It is never committed, never
sent client-side, never logged and never accepted through chat. A missing key is
not an error — the chain falls through silently. Server-side guards: per-session
(reused relay limiter: 1 msg / 3 s, 30 / hour) plus a per-IP hourly limit and a
daily call budget (`GROQ_DAILY_BUDGET`, default 500). Both guards **fail closed**
— any unexpected error refuses the Groq tier.

## What is proven, and how

**No key present (GROQ_API_KEY absent).**
- Normal question → Groq tier `skip` → relay has no token → 503
  `{"ok":false,"error":"relay_unavailable"}` → client shows the labelled
  scripted demo. Screenshot: `try-fallback-m1.png` (status
  "live unavailable - scripted demo").
- Price/payment/custom-promise question → holding line, mode `holding`:
  `sales-escalation-m1.png`. Forwarded enquiry: `escalations.txt`.

**Key present (local OpenAI-compatible stub upstream).**
The agent does not hold a real `GROQ_API_KEY` (Cesar adds it in Vercel), so the
Groq tier was exercised end to end against a **local stub upstream**
(`scripts/groq-stub.mjs`, run with `GROQ_API_KEY=<dummy>` +
`GROQ_API_BASE=http://127.0.0.1:3400`). The tier code, prompts, guards, history
and routing are the real ones; only the upstream endpoint is local. The stub
echoes the persona and the number of prior user turns it was sent (`ctx=N`),
which is the isolation marker.
- `/try` session A, two messages → `ctx=0` then `ctx=1`:
  `try-groqA-m1.png`, `try-groqA-m2.png`.
- `/try` session B, separate Chrome profile → `ctx=0`, never sees A's history:
  `try-groqB-m1.png`. Stub request log: `groq-stub-requests.txt`.
- `/sales` normal question → persona **Bow Sales Customer Advisor**, `ctx=0`
  (`sales-groq-m1.png`); price question with the key present still returns the
  holding line with **no** model call (`sales-groq-m2.png`, stub log has only the
  one sales request).
- Raw HTTP for the above: `tier-http.txt`.
- Client bundle scan (no key name, no `api.groq.com`, no dummy value):
  `no-leak.txt`.

## Files

- `src/lib/bow-relay/groq.ts` — tier: prompts/personas, escalation + forward,
  per-session history, per-IP + daily-budget guards (fail closed), Groq call.
- `src/app/api/bow-relay/route.ts` — Groq first, relay second, generic errors.
- `src/lib/bow-relay/useRelay.ts` — carries the tier `mode`; only the relay tier
  polls; instant replies are applied as they arrive.
- `src/app/_lobby/BowChat.tsx`, `src/app/sales/SalesAgentChat.tsx` — status text
  reflects the tier.
- `scripts/groq-stub.mjs`, `scripts/capture-bow-groq.mjs` — test-only tooling.

Rollback = delete the branch / revert the commit. No merge, no go-live.
