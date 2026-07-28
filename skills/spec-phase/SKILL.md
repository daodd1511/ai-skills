---
name: spec-phase
description: Drive phased execution of a spec produced by /grill-me — start the next phase, or resume mid-phase work correctly. Use when the user says "start phase N", "continue the spec", "resume execution", "next phase", or references a specs/<feature>/EXECUTION.md.
argument-hint: "<feature-slug> [phase-n] — omit phase-n to auto-detect where to resume"
---

Drives execution of `specs/<feature-slug>/PLAN.md` + `specs/<feature-slug>/EXECUTION.md`.
The rulebook (state model, branch model, gate lanes, checkpoints, parking) is `CLAUDE.md` →
"Spec-Driven Execution Workflow" — this skill is the procedure that implements it.

## Step 0 — Locate state from git first

1. Verify the rulebook exists: project `CLAUDE.md` must contain a "Spec-Driven Execution
   Workflow" section. If it's absent, stop and tell the user — do not improvise meanings
   for `done-with-debt`, `[~]`, or the checkpoint rules; they are defined there. Offer to
   add it from the `spec-plan` skill's `references/rulebook.md` template (sibling skill dir:
   `../spec-plan/references/rulebook.md`): resolve its placeholders against the project,
   drop the leading `<!-- TEMPLATE -->` comment, confirm the values with the user, and
   append the section to the project `CLAUDE.md`. Do not proceed until it exists — normally
   `spec-plan` already added it, so a fresh project should run `/spec-plan` first. If the
   section's `<!-- rulebook vN -->` marker is missing or below the template's, mention it
   once and carry on — upgrading mid-spec would change the rules under an in-flight phase,
   so it belongs to `spec-plan` at the start of the next one.
2. Run `git status` and `git branch --show-current`. The branch name encodes spec+phase;
   the working tree and commit log encode progress. **This is the authoritative state.**
3. Read `specs/<feature-slug>/EXECUTION.md` — its STATUS block and checklist (ask the user
   for the slug if not given and the current branch doesn't encode it — do not guess
   between multiple specs under `specs/`).
4. If STATUS disagrees with git on a mechanical fact (which branch exists, what's
   committed, what's merged), **git wins silently** — correct STATUS to match, no
   user-reconciliation ceremony. STATUS is only trusted for what git can't express:
   verification debt, park reasons, phase intent.
5. Do **not** read PLAN.md up front. Checklist items name their exact files/functions
   (spec-plan guarantees this), so the checklist is normally sufficient. Open PLAN.md only
   when a specific item is ambiguous, and read only the section that item references —
   never the whole file on a routine start or resume.
6. `HANDOFF.md`, if present, is advisory context only (why something was parked, what the
   user said) — never resume from it, never treat it as state.
7. **One-spec-in-flight check**: one `rg -l 'in-progress' specs/*/EXECUTION.md` — do not
   read the other EXECUTION.md files in full. If a different spec has an `in-progress`
   phase, stop — the user must finish or park it before this spec proceeds.

## Step 1 — Decide: resume, or start the next phase

- A phase is **in-progress** iff it has unchecked **non-deferred** items — `[~]` deferred
  items do not count as unfinished. If the current branch matches an in-progress phase →
  **resume**: continue from the first unchecked item, do not re-do checked items, do not
  re-ask for authorization (the original phase-start already covers it). Trust checked
  items — do not re-open or re-verify the files behind them "to rebuild context"; read a
  prior item's files only when the current item directly builds on them.
- If the current phase is `done` or `done-with-debt` and merged → **start next phase**:
  requires a fresh explicit go-ahead from the user, do not assume it.
- If the checklist is fully checked but the agent gate was never actually run → stop, run
  the gate now, before anything else.

## Step 2 — Starting a new phase

1. Determine the base per EXECUTION.md's branch model. **Stacked (default):** the
   previous phase's branch — even if its PR hasn't merged yet; phase 1 bases off the
   integration branch. **Sequential (only if opted in for this spec):** checkout the
   integration branch, `git pull`, and wait for the previous phase's PR to merge before
   basing off it.
2. Create branch `<feature-slug>/phase-<n>-<short-desc>` from that base. If stacked and an
   earlier phase in the chain has since merged to the integration branch, rebase this
   phase's branch onto the integration branch before starting new work.
3. Work the checklist top to bottom. Commit at logical sub-steps (never one giant commit).
   Check off each `EXECUTION.md` item immediately when done — not batched at the end.
4. Do not push or open a PR without a separate explicit go-ahead, even though the commits
   themselves were pre-authorized by starting the phase.

## Mid-phase amendments

Execution discovers scope plans miss. EXECUTION.md may be amended during an in-progress
phase, but only under these rules:

- **Necessary-but-unplanned work** (a checklist item can't be completed without it): add
  unchecked item(s) naming the exact files, tagged `(amended <date>)`, and list the
  amendments in the phase-completion report. If instead it's *new scope* beyond what
  PLAN.md decided, stop and ask — new scope goes through the plan, not smuggled into a
  phase.
- **Gate arguments come from the real diff**: a dependency-aware test gate
  (`vitest related --run <files>`, `jest --findRelatedTests <files>`) takes the phase's
  actual changed files as arguments — compute them from the diff at run time, don't reuse
  a stale list the plan guessed. The runner resolves consumers from there.
- **Checked items are immutable**: never edit, uncheck, or delete a checked item. A
  correction to already-done work is a new `(amended)` item.
- Restructuring phases (splitting, reordering, adding one) is spec-plan's job — stop and
  ask rather than doing it here.

## Step 3 — Completing a phase

1. Run the local **agent gate** exactly as written in `EXECUTION.md` (typecheck, tests,
   build). The `CI green on the phase PR` item is the one exception — it cannot run
   pre-PR and resolves in step 5. Exactly means exactly: do not substitute a different command, and in particular do not
   narrow it — never swap a dependency-aware test command for a list of test files you
   think are the relevant ones, and never scope a project-wide typecheck down to the
   phase's packages. That narrowing is what lets a shared-type change pass the gate and
   fail CI. Filling in the changed-file arguments a gate command expects is not
   substitution — that's the gate working as written. If a written gate command is wrong
   or won't run, stop, fix it in
   EXECUTION.md, tell the user, then run the corrected command. When a gate fails, quote
   only the failing portion of the output, not the full log.
   All must actually pass. An item may become `[~]` deferred only if environment-blocked
   (missing tool/credentials, not effort) — record substitute evidence inline and mirror
   it in STATUS's verification-debt list; the phase state is then `done-with-debt`.
2. **Commit-integrity check**: `git status` must be clean, and every new file this phase
   introduced must appear in `git show --stat` of a commit on the phase branch — a file
   described in a commit message but never `git add`ed has happened before.
3. Update the STATUS block and checkboxes to reflect reality.
4. Report to the user: local gate passed, N commits — then one ask: **"push + open
   PR?"** (target: the previous phase's branch if stacked and still unmerged, else the
   integration branch). The PR description must include the phase's **Review checklist**
   lane, so manual verification happens in the user's review before they merge.
5. After the PR opens, resolve the CI gate item: watch the checks (`gh pr checks
   --watch`, or the project's CI equivalent) — do not report the phase complete while CI
   is running or red. If CI fails, fix it on the phase branch, push (pushing CI fixes to
   the already-authorized PR needs no new ask), and re-watch. For a failure that is
   demonstrably unrelated to the phase's diff (pre-existing on the base branch, or an
   infra flake), re-run it once; if it persists, mark the CI item `[~]` with the evidence
   of unrelatedness and surface it to the user — never chase unrelated red across
   sessions. Only when CI is green (or `[~]` with evidence) check the item, update
   STATUS, and report the phase complete.

## Step 4 — After the user merges

1. Checkout the integration branch, `git pull`.
2. Ask before deleting the merged phase branch (local + remote).
3. If a later phase is already stacked on the branch that just merged, rebase that phase's
   branch onto the integration branch now — don't wait for it to become the active phase.
4. Update STATUS (phase → `done`, or `done-with-debt` if debt remains). Then, if phases
   remain, ask whether to start the next one (Step 2).

## Step 5 — Parking (mid-phase stop)

If work must stop before a phase completes (user redirects, session ends mid-flight):
commit uncommitted work as `WIP: parked <date>` on the phase branch, and note in STATUS
that the phase is parked and why. Never `git stash` — stashes are detached from branches
and invisible to a cold agent. Resume = checkout the branch, continue, squash-or-keep the
WIP commit at the next real commit.

## Do not

- Do not resume from `HANDOFF.md` — state comes from git + STATUS only.
- Do not silently start a new phase without a fresh explicit go-ahead.
- Do not push, open a PR, or merge without a separate explicit confirmation, regardless of
  how much of the phase's commit work was pre-authorized.
- Do not wait for the previous phase's PR to merge before starting the next one unless
  sequential mode was explicitly opted into for this spec — stacking is the default.
- Do not mark `[~]` for anything that is merely tedious — deferral is for environment
  blocks only, with evidence.
- Do not squash a phase's commits into one, and do not batch-check the checklist at the end.
- Do not read PLAN.md in full on a routine start or resume — only the section a specific
  ambiguous item references.
- Do not narrow the agent gate — no swapping a dependency-aware test command for
  hand-picked test files, no scoping a project-wide typecheck to the phase's packages —
  and do not silently substitute a different command when the written one fails to run.
- Do not report a phase complete while its PR's CI is red or still running — the local
  gate is the pre-PR smoke check; CI's full run is the authoritative verdict.
- Do not edit, uncheck, or delete checked items when amending — corrections are new items.
- Do not re-verify already-checked items when resuming — the checklist is the record.
