## What

Email-based passcode setup for AI Money Club members (re-file of #150, originally #139), on a fresh branch off `main`. Members get a one-time link, open it, and choose their own passcode. No email sending in this PR - the admin copies the setup URL and delivers it manually.

**PR-only: do not merge.**

## Initial setup vs reset

Both flows use the same endpoint; the difference is the context the admin uses it in:

- **Initial setup** - a member was created with the existing admin `issue` action (which returns a temporary passcode). The admin then calls the new `setup-link` action and sends that URL to the member. The temporary passcode keeps working until the member successfully sets their own passcode.
- **Reset** - an existing member forgot their passcode. The admin calls the same `setup-link` action for that member. Issuing the link is non-destructive: the current passcode keeps working until the member successfully sets a new one, so a lost/expired/failed link can never lock them out. Any earlier setup link for that member stops working when a new one is issued.

There is no separate destructive "reset" step in this PR.

## Changes

- `src/app/api/club/members/route.ts` - new authenticated `setup-link` action. It issues a one-time setup token with a 24h expiry, stores only `setupTokenHash` + `setupTokenExpiresAt` on the member record, and returns `{ setupUrl, expiresAt }` once. The plaintext token appears only in that admin response body. Reissuing overwrites the previous hash; admin `reissue`/`revoke` also clear any pending setup link.
- `src/app/api/club/set-passcode/route.ts` - public rate-limited POST. Checks the member, token hash, 24h expiry and passcode rules, then writes a fresh salt + `scrypt(passcode, salt, 64)` hex exactly as `club-members.ts hashPasscode`, clearing the setup token in the same write (one-time use). Wrong/expired/used links return one generic error.
- `src/app/club/set-passcode/page.tsx` - branded member page ("AI Solutions / AI Money Club"), with the invalid/expired-link state and the same 10-64 char `[A-Za-z0-9_-]` rules used by the API.
- `src/app/club/set-passcode/layout.tsx` - `robots: noindex, nofollow` and a `no-referrer` meta tag so token-bearing URLs are not indexed or leaked through Referer.
- `src/lib/club-members.ts` - setup-token helpers (`newSetupToken`, `hashSetupToken`, `verifySetupToken` with expiry), `isValidChosenPasscode`, and shared constants (`SETUP_TOKEN_TTL_MS`, passcode min/max).
- `src/components/club/ClubLoginForm.tsx` - login passcode input accepts up to 64 characters, matching the set-passcode rules (was 40).
- `src/lib/club-members.test.ts` - tests for token utilities, passcode rules, the full setup flow, reissue invalidation, and expired/wrong links preserving the active passcode.
- `evidence/issue-155/` - local E2E script/results, unit-test output, build output, lint output and screenshots.

## Branding

The setup URL is generated as:

```
https://ai-solutions.company/club/set-passcode?u=<username>&t=<one-time-token>
```

The host is a hardcoded constant, deliberately **not** an env var, so a Vercel preview deployment cannot accidentally hand out a preview URL. The page reads AI Solutions / AI Money Club. No third-party host is used.

## Security review items

1. **Active login preserved until success** - issuing a setup link only adds `setupTokenHash`/`setupTokenExpiresAt`; the existing `salt` and `passcodeHash` are untouched. A failed, invalid or expired link does not change them. E2E verifies the old passcode still logs in after link issuance, after a rejected short passcode, and after an expired link.
2. **Older setup tokens invalidated** - every new link overwrites the stored token hash; E2E verifies the first link now returns 400 while the newest succeeds. Admin passcode rotation and revoke also clear any pending link.
3. **Initial setup vs reset** - documented above.
4. **Token never in logs/artifacts** - plaintext token is returned only in the admin `setup-link` response body; only a scrypt hash is stored; responses are `Cache-Control: no-store`; the setup page is `noindex`/`no-referrer`; nothing logs the token. The E2E run scans the local production server log for every token issued during the run and finds 0. Screenshots/PR text use no real tokens (invalid/no-token states only).

## Known limitation accepted for v1

Existing sessions are **not** invalidated by a passcode change: session tokens are username-signed and last 30 days. Follow-up candidate.

## Verification (local)

- `npm run build` -> exit 0; `/club/set-passcode` is built (static route).
- Unit tests: 18/18 pass (`evidence/issue-155/unit-tests.txt`; run with `tsx` because this runner's Node build lacks TypeScript support - the `test:club` script itself is unchanged).
- E2E against the local production build: **29/29 checks pass** (`evidence/issue-155/e2e-results.txt`), covering issue -> setup-link -> old login still works -> set passcode -> replay rejected -> old passcode 401/new passcode 200, invalid passcode not burning the link, reissue invalidation, expired link preserving login, branded URL and no token in the server log.
- Screenshots: `evidence/issue-155/set-passcode-invalid.png` (invalid-link state) and `evidence/issue-155/set-passcode-form.png` (form with a bogus token).
- Lint on every changed file: clean (`evidence/issue-155/eslint-changed.txt`). Repo-wide `npm run lint` still reports pre-existing errors in unrelated files.

## Preview

The admin route and Blob member store are shared with production, so this PR does **not** create test members or issue setup tokens against the deployed preview/production environments. The page itself contains no environment-specific data and the production build above renders both the form and invalid-link states. The Vercel preview build status is on this PR.

No email sending, no deploy, no merge.
