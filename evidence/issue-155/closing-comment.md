**Club email-based passcode setup shipped for review - PR open, not merged**

**PR #64:** https://github.com/agent-007-kali/ai-stack-website/pull/64
**Branch:** `feature/club-email-passcode-setup-155` (fresh off `main`, pushed to origin)
**Head at PR creation:** `7bc4dae` (read back from GitHub: PR #64 `headRefOid`)

**What is in the PR**
- Admin `setup-link` action on `POST /api/club/members`: one-time 24h token, only its hash stored, plaintext token only in the admin response body. Reissuing invalidates the previous link; admin passcode rotation/revoke also clears pending links.
- `/club/set-passcode` page + `POST /api/club/set-passcode`: member sets their own passcode (10-64 chars, `[A-Za-z0-9_-]`), stored as salt + `scrypt(passcode, salt, 64)` exactly like `hashPasscode`.
- Branded setup URL hardcoded to `https://ai-solutions.company/club/set-passcode` - never a Vercel preview or third-party host. Page reads AI Solutions / AI Money Club and is `noindex`/`no-referrer`.
- No email sending; the admin delivers the URL manually.

**Initial setup vs reset:** both use the same link; initial setup replaces the temporary passcode issued at member creation, reset is the same flow for a member who forgot theirs. Issuing a link never changes the current passcode, so a failed/expired link cannot lock the member out.

**Security review items**
1. Active login preserved until the new passcode is successfully set - verified E2E after link issuance, rejected passcode, and expired link.
2. Older setup tokens invalidated on reissue - older link returns 400, newest succeeds.
3. Initial setup vs reset documented in the PR body.
4. Token never in logs/artifacts - hash-only storage, no-store responses, noindex/no-referrer, E2E scans the server log for all issued tokens (0 found). No real tokens in screenshots or PR text.

**Known limitation (accepted v1):** existing 30-day username-signed sessions are not invalidated by a passcode change - follow-up candidate.

**Verification**
- `npm run build` exit 0; `/club/set-passcode` built.
- Unit tests 18/18; changed-file lint clean.
- Local production-build E2E 29/29: issue -> setup-link -> old login works -> set passcode -> replay rejected -> old 401/new 200; invalid passcode does not burn the link; reissue invalidation; expired link preserves login; branded URL; no token in server log.
- Screenshots of invalid-link state and form: `evidence/issue-155/set-passcode-invalid.png`, `evidence/issue-155/set-passcode-form.png`.
- No test members created and no setup tokens issued against the deployed preview/production environments (shared admin route + Blob store).

PR-only, no merge, no deploy.
