---
name: terse-commit
description: >
  Ultra-compressed commit message generator. Cuts noise from commit messages while preserving
  intent and reasoning. Conventional Commits subject (`type(scope): summary`), no AI
  attribution. Subject short and concise, body only when "why" isn't obvious. Flags unrelated
  changes for splitting into separate commits. Use when user says "write a commit",
  "commit message", "generate commit", "/commit", or invokes /terse-commit. Auto-triggers
  when staging changes.
---

Write commit messages terse and exact. Conventional Commits subject, imperative summary. No fluff. Why over what.

## Rules

**Subject line:**
- `<type>(<scope>): <summary>` — scope optional, omit it when the diff is repo-wide or
  the type alone is unambiguous
- Types: `feat`, `fix`, `docs`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`.
  Pick by what the change does to the shipped artifact, not by which files moved —
  a rewrite that changes no behavior is `refactor`, not `feat`
- Breaking change: `!` before the colon (`feat(auth)!: drop v1 tokens`) **and** a
  `BREAKING CHANGE:` footer. The footer is what tooling parses; the `!` is the human signal
- Summary in imperative mood, lowercase: "add", "fix", "remove" — not "added", "adds", "adding"
- Short and concise — aim ≤50 chars including the prefix, hard cap 72. The prefix spends
  part of that budget; cut the summary, not the type
- No trailing period

**Existing history wins.** Check `git log --oneline -20` before writing the first commit in
an unfamiliar repo. If the history is prefix-free, stay prefix-free — a lone `feat:` among
plain subjects is noise, and consistency beats the convention. Ask before switching a
repo's style.

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
  — prefix is right, summary restates the diff and blows the budget
- ✅
  ```
  feat(api): add GET /users/:id/profile

  Mobile client needs profile data without the full user payload
  to reduce LTE bandwidth on cold-launch screens.

  Closes #128
  ```

Diff: breaking API change
- ✅
  ```
  feat(api)!: rename /v1/orders to /v1/checkout

  BREAKING CHANGE: clients on /v1/orders must migrate to /v1/checkout
  before 2026-06-01. Old route returns 410 after that date.
  ```

Diff: touches auth middleware and also fixes an unrelated typo in README
- ✅ flag it: "Unrelated changes detected — split into 2 commits:"
  ```
  1. fix(auth): correct session token expiry check
  2. docs: fix typo in README
  ```

Diff: extracting a helper, behavior identical
- ❌ "feat: extract retry helper" — no new capability shipped
- ✅ `refactor(http): extract retry helper from client`

## Auto-Clarity

Always include body for: breaking changes, security fixes, data migrations, anything reverting a prior commit. Never compress these into subject-only — future debuggers need the context.

## Boundaries

Only generates the commit message(s). Does not run `git commit`, does not stage files, does not amend. Output each message as a code block ready to paste. "stop terse-commit" or "normal mode": revert to verbose commit style.