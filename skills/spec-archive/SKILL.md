---
name: spec-archive
description: Fold a finished spec's Spec Delta into the capability baseline and archive the feature. Use when a spec's final phase has merged and the project keeps a capability baseline, or when the user says "archive the spec", "apply the delta", "update the capabilities".
argument-hint: "<feature-slug> — every phase must be merged first"
---

Applies `specs/<feature-slug>/PLAN.md` → `## Spec Delta` to `specs/capabilities/`, then
archives the feature. The rulebook (baseline format, delta verbs, provenance, backfill
evidence classes) is `CLAUDE.md` → "Spec-Driven Execution Workflow" → "Capability baseline"
— this skill implements it, not restates it.

This skill writes the project's source of truth. It is mechanical by design: the model
authors nothing here, it only moves text the delta already contains.

## Step 0 — Preconditions, from git

Stop on any failure. Do not "mostly" apply a delta.

1. The rulebook must contain the "Capability baseline" subsection. If it doesn't, this
   project doesn't keep a baseline — stop and say so.
2. `specs/<feature-slug>/EXECUTION.md`: every phase `done` or `done-with-debt`. A `pending`
   or `in-progress` phase means the feature isn't finished.
3. Every phase branch merged into the integration branch (`git branch --merged`). The
   baseline describes the integration branch — unmerged work must not appear in it.
4. Current branch is the integration branch, `git pull` done, `git status` clean.
5. `specs/<feature-slug>/PLAN.md` has a `## Spec Delta` section. If it has none, the feature
   changed no stated behaviour — skip to Step 4 and archive it alone.

## Step 1 — Read the delta only

Read the `## Spec Delta` section. Not the rest of PLAN.md — nothing outside that section
affects the baseline, and reading the whole file invites reconciling it against the code.

## Step 2 — Dry run

Resolve every entry against its target capability file and report the plan before writing
anything:

- `ADDED` — the title must **not** exist in the target file. A collision means this delta
  contradicts an earlier feature: stop, show both, let the user decide.
- `MODIFIED` — the title must exist. Its whole block is replaced by the delta's text.
- `REMOVED` — the title must exist. Its block is deleted.

Report as `<verb> <capability> → <title>` lines plus any mismatches. **Every mismatch is a
hard stop.** A missing `MODIFIED` target means the backfill was skipped during the grill; it
belongs there, with evidence — not here, from memory.

If the target capability file doesn't exist yet, `ADDED` entries create it with a
`# Capability: <Area>` heading.

## Step 3 — Apply

All-or-nothing. A half-applied baseline is worse than a stale one: it still looks
authoritative.

1. Swap/append/delete blocks by exact title match. Copy the delta's text **verbatim** —
   do not reword, tighten, or "improve" it in transit.
2. Give each new or replaced requirement its provenance line:
   `Origin: delta ← specs/<feature-slug>`. Backfilled requirements keep the provenance the
   grill assigned them (`backfill (test: …)` / `backfill (user-confirmed)`).
3. Stamp the file header: `Applied: <date> ← specs/<feature-slug>`.
4. Split any capability file past ~300 lines along its natural area boundary, in this same
   commit.

## Step 4 — Archive

1. `git mv specs/<feature-slug> specs/archive/<YYYY-MM-DD>-<feature-slug>` (date = today).
   Keeping finished specs in the glob path slows every later `rg` for in-flight work.
2. Regenerate the specs index if the project has one.
3. One commit: `docs(specs): apply <feature-slug> delta to capabilities`.
4. Report: entries applied per capability, files split, archive path.

## Do not

- Do not reconcile a stale delta from the code diff. If what shipped no longer matches the
  delta, **stop and ask** — the amendment rule was supposed to keep them in sync, and
  inferring requirements from an implementation is how a baseline becomes a description of a
  bug.
- Do not write a requirement the delta doesn't contain, and do not touch a capability the
  delta doesn't name.
- Do not run before every phase is merged.
- Do not edit the baseline by hand to "fix" something you noticed while applying. That is a
  new delta, through a grill.
- Do not proceed past any title mismatch in the dry run.
