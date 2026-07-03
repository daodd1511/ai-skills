---
name: terse-commit
description: >
  Ultra-compressed commit message generator. Cuts noise from commit messages while preserving
  intent and reasoning. Plain imperative subject, no Conventional Commits prefix, no AI
  attribution. Subject short and concise, body only when "why" isn't obvious. Flags unrelated
  changes for splitting into separate commits. Use when user says "write a commit",
  "commit message", "generate commit", "/commit", or invokes /terse-commit. Auto-triggers
  when staging changes.
---

Write commit messages terse and exact. Plain imperative subject, no type/scope prefix. No fluff. Why over what.

## Rules

**Subject line:**
- Plain imperative summary — no `<type>(<scope>):` prefix
- Imperative mood: "add", "fix", "remove" — not "added", "adds", "adding"
- Short and concise — aim ≤50 chars, hard cap 72
- No trailing period
- Match project convention for capitalization

**Split changes:**
- If the diff contains unrelated changes, do not lump them into one message
- Flag it and propose one message per logical change, staged separately

**Body (only if needed):**
- Skip entirely when subject is self-explanatory
- Add body only for: non-obvious *why*, breaking changes, migration notes, linked issues
- Wrap at 72 chars
- Bullets `-` not `*`
- Reference issues/PRs at end: `Closes #42`, `Refs #17`

**What NEVER goes in:**
- "This commit does X", "I", "we", "now", "currently" — the diff says what
- `Co-authored-by` trailer or any other AI attribution for the agent, ever — no exceptions
- Emoji (unless project convention requires)

## Examples

Diff: new endpoint for user profile with body explaining the why
- ❌ "feat: add a new endpoint to get user profile information from the database"
- ✅
  ```
  add GET /users/:id/profile

  Mobile client needs profile data without the full user payload
  to reduce LTE bandwidth on cold-launch screens.

  Closes #128
  ```

Diff: breaking API change
- ✅
  ```
  rename /v1/orders to /v1/checkout

  BREAKING CHANGE: clients on /v1/orders must migrate to /v1/checkout
  before 2026-06-01. Old route returns 410 after that date.
  ```

Diff: touches auth middleware and also fixes an unrelated typo in README
- ✅ flag it: "Unrelated changes detected — split into 2 commits:"
  ```
  1. fix session token expiry check in auth middleware
  2. fix typo in README
  ```

## Auto-Clarity

Always include body for: breaking changes, security fixes, data migrations, anything reverting a prior commit. Never compress these into subject-only — future debuggers need the context.

## Boundaries

Only generates the commit message(s). Does not run `git commit`, does not stage files, does not amend. Output each message as a code block ready to paste. "stop terse-commit" or "normal mode": revert to verbose commit style.