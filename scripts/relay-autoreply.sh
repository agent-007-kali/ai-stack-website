#!/usr/bin/env bash
# Test helper for issue #81: acts as "Jarvis" by replying to any new private
# bow-relay thread that has a visitor message and no reply yet. Bounded loop.
REPO=agent-007-kali/jarvis-bridge
FLOOR=85
for _ in $(seq 1 45); do
  JSON=$(env -u GITHUB_TOKEN gh issue list -R "$REPO" --label bow-relay --state open --json number,title,comments --limit 50 2>/dev/null)
  echo "$JSON" | jq -r '.[] | select(.number > '"$FLOOR"') | select([.comments[] | select(.body | startswith("**Visitor:**") | not)] | length == 0) | select([.comments[] | select(.body | startswith("**Visitor:**"))] | length > 0) | "\(.number)\t\(.title)"' | while IFS=$'\t' read -r num title; do
    [ -z "$num" ] && continue
    env -u GITHUB_TOKEN gh issue comment "$num" -R "$REPO" --body "Jarvis test reply (issue #81 relay proof): I received your message on ${title}." >/dev/null 2>&1 && echo "replied to $num"
  done
  sleep 2
done
