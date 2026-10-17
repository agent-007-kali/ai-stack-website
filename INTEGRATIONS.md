# Bow Chat API — Integration Guide

Bow Chat is the Bow Bot 3-day free-trial chat served at `/try`. It is backed by
one documented HTTP endpoint: **`POST /api/bow-chat`**. This document explains
how a shop, a landing page, or another bot could integrate with that endpoint
later. **No external integration is built or enabled now** — this is a written
contract only.

---

## Endpoint

```
POST /api/bow-chat
Content-Type: application/json
```

## Request body

```json
{
  "message": "How does the free trial work?",
  "sessionId": "bow-abc123",
  "history": [
    { "role": "user", "content": "hi" },
    { "role": "assistant", "content": "Hello!" }
  ]
}
```

| Field       | Type   | Required | Constraints                                              |
| ----------- | ------ | -------- | -------------------------------------------------------- |
| `message`   | string | yes      | non-empty, max 500 characters                             |
| `sessionId` | string | no       | `[A-Za-z0-9_-]` only, max 64 characters                   |
| `history`   | array  | no       | max 8 turns; each `{ role, content }`; `role` is `user` or `assistant` only |

`system` roles and any unknown top-level field are rejected. `history.content`
follows the same 500-character limit as `message`.

## Response body

### Fallback mode (default — no provider key configured)

```json
{
  "fallback": true,
  "active": false,
  "label": "scripted demo, not live",
  "reply": "Great! Your 3-day free trial gives you full access to explore Bow Bot.",
  "persona": "bowbot",
  "reason": "no_provider_key"
}
```

`reason` is one of: `no_provider_key`, `budget_exhausted`, `provider_error`,
`provider_timeout`, `provider_malformed`.

### Live mode (only when a provider key + budget are configured by the owner)

```json
{
  "fallback": false,
  "active": true,
  "label": "live",
  "reply": "…",
  "persona": "bowbot",
  "reason": null
}
```

### Error responses

Malformed requests return `4xx` with the same envelope plus an `error` field
(`invalid-content-type`, `payload-too-large`, `invalid-json`, `validation-error`)
and `reason: "validation_failed"`.

---

## How to integrate (later)

A shop or another bot would:

1. `POST` the visitor's `message` (plus optional `sessionId` / `history`) to
   `/api/bow-chat` with `Content-Type: application/json`.
2. Read `reply` from the JSON response and render it.
3. Read `label` and display it verbatim next to the reply. **Never drop the
   label** — in fallback mode it is the honest disclosure that the reply is a
   scripted demo, not live.
4. Append the turn to its own `history` and send it back on the next request so
   the conversation stays coherent.

Integrators should treat the response `label` as authoritative for whether a
reply came from a live provider or the scripted fallback, and must not rebrand a
fallback reply as live.

## Budget, keys, and spend

- The provider key lives in an environment variable only. It is never in the
  repository, never logged and never returned in a response.
- A hard monthly budget cap is checked before any provider call. When the cap is
  reached, the route falls back to scripted replies and makes **no** provider
  call and incurs **no** spend.
- With no key configured (the default for previews), the route always returns
  the scripted fallback and makes **zero** provider calls.

This endpoint is provided for evaluation and preview only. Going live —
choosing a provider, setting a budget, and activating a key — is a separate
owner decision.
