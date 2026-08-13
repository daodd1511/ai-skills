---
name: spec-phase
description: Drive phased execution of a spec produced by /grill-me — start the next phase, or resume mid-phase work correctly. Use when the user says "start phase N", "continue the spec", "resume execution", "next phase", or references a specs/<feature>/EXECUTION.md. Also use for ANY work on a branch named <feature>/phase-<n>-<desc> — that name means a spec is mid-execution: git is its state store, so do not commit, squash, rebase, push, or open a PR on such a branch by hand. Its rules live in specs/RULEBOOK.md, which the project's context file only points at.
argument-hint: "<feature-slug> [phase-n] — omit phase-n to auto-detect where to resume"
---

Drives execution of `specs/<feature-slug>/PLAN.md` + `specs/<feature-slug>/EXECUTION.md`.
The rulebook (state model, branch model, gate lanes, checkpoints, parking) is
`specs/RULEBOOK.md` — this skill is the procedure that implements it. Read it at Step 0; it
is not in context by default. The project's context file (`CLAUDE.md` / `AGENTS.md`) carries
only the workflow's pointer section (the specs-root mapping), never the rules themselves.

## Step 0 — Locate state from git first

1. **Read `specs/RULEBOOK.md`** (or the project's `<SPECS_DIR>`). If it's absent, stop and
   tell the user — do not improvise meanings for `done-with-debt`, `[~]`, or the checkpoint
   rules; they are defined in the rulebook only, and the pointer section in a project's
   context file is a signpost, not a fallback source for them. Setup is `spec-plan`'s Step 0,
   so a project without the file should run `/spec-plan` first. If the rulebook's `<!-- rulebook vN -->` marker is below
   the template's (`../spec-plan/references/rulebook.md`), mention it once and carry on —
   upgrading mid-spec would change the rules under an in-flight phase, so it belongs to
   `spec-plan` at the start of the next one.
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
- If the checklist is fully checked but the phase gate was never actually run → stop, run
  it now, before anything else.

## Step 2 — Starting a new phase

1. Read EXECUTION.md's header for the branch model.

   **Stacked (default, `gh stack`):**
   - Phase 1 — create the spec's stack: `gh stack init -b <integration-branch>`. Tell the
     user first that this enables `git rerere` in the repo.
   - Every phase — from the stack top, `gh stack add <feature-slug>/phase-<n>-<short-desc>`.
     Always pass the branch name; never `-m`/`-A`/`-u` (they commit for you). If an earlier
     phase has merged since, run `gh stack sync` before adding — it fast-forwards the trunk
     and cascade-rebases the rest of the stack, replacing the manual rebase.
   - Never run `gh stack merge` or `gh stack modify`; `unstack`/`delete` needs an explicit
     ask. Never run a bare interactive subcommand — `submit`, `checkout`, `switch` and
     `view` open an editor or pager and hang. Use `--auto`, an explicit argument, `--json`.
   - If `gh stack` turns out to be unavailable here (exit 9, unknown command), stop and
     tell the user — the spec was planned as a stack; switching it to sequential is a
     header change, not something to improvise mid-phase.

   **Sequential:** checkout the integration branch, `git pull`, wait for the previous
   phase's PR to merge, then `git checkout -b <feature-slug>/phase-<n>-<short-desc>`.
2. Confirm you are on the new branch before touching code.
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
- **User-visible behaviour changes amend the delta too** (baseline projects only): if an
  amended item changes what the system does for a user, update PLAN.md's `## Spec Delta` in
  the same commit. Skip this and the delta records what was planned while the code does
  something else — and `spec-archive` will refuse to reconcile the difference later, exactly
  when the context to resolve it is gone.
- **Interfaces are part of the contract**: if a phase ends up exporting something different
  from its `Produces:` line, correct that line before completing the phase. Later phases are
  planned against it.
- Restructuring phases (splitting, reordering, adding one) is spec-plan's job — stop and
  ask rather than doing it here.

## Step 3 — Completing a phase

1. Run the **phase gate** exactly as written in `EXECUTION.md` (project-wide typecheck +
   dependency-aware tests). Exactly means exactly: do not substitute a different command,
   and in particular do not narrow it — never swap a dependency-aware test command for a
   list of test files you think are the relevant ones, and never scope a project-wide
   typecheck down to the phase's packages. That narrowing is what lets a shared-type
   change pass the gate. Filling in the changed-file arguments a gate command expects is
   not substitution — that's the gate working as written. Equally, do not *widen* it:
   running the full suite or a build here is the spec gate's job, once, and pulling it
   forward into every phase is exactly the repeated cost this model removes. If a written
   gate command is wrong or won't run, stop, fix it in EXECUTION.md, tell the user, then
   run the corrected command. When a gate fails, quote only the failing portion of the
   output, not the full log.
   All must actually pass. An item may become `[~]` deferred only if environment-blocked
   (missing tool/credentials, not effort) — record substitute evidence inline and mirror
   it in STATUS's verification-debt list; the phase state is then `done-with-debt`.

   **If this is the final phase**, also run the `## Spec gate` items at the end of
   EXECUTION.md — full local suite, plus the build if one is listed — over the whole
   accumulated spec diff, under the same rules. Failures here are fixed on this branch as
   `(amended <date>)` items; if the cause sits in an already-merged phase, fix it forward,
   never reopen the merged phase. A CI item appears only when the user asked for CI gating
   (see step 7); otherwise no agent watches checks and these gates are the verdict.
2. **Resolve the fresh-review decision from the actual diff.** Keep `required` if the phase
   records it. For a legacy phase with no `Fresh review:` line, start from `not required`.
   Upgrade to `required` when the actual diff crosses a rulebook hard trigger (auth,
   crypto/secrets/injection, payments/financial calculations, destructive or irreversible
   durable-data changes, CI/test-gate infrastructure, or money/data-loss error paths), the
   same behavior needed two correction attempts, or the answer to "Am I less confident in
   this change than usual, or did it grow beyond what was asked?" is yes. Add the missing
   line for a legacy phase; when upgrading, record the reason on it. Never downgrade
   `required`. If review remains `not required`, do not invoke the skill or build a review
   packet.
3. If review is required, invoke `fresh-review` now with the phase goal, complete base/head
   change set, constraints and interfaces, and the exact gate evidence from step 1.
   This workflow invocation authorizes the skill's single read-only fresh-context
   delegation; it does not authorize edits, remote actions, or provider selection by the
   reviewer. Handle the result as follows:
   - No P0-P2 findings: continue.
   - P0-P2 findings: make the minimal corrections in this implementation context, add
     correction work as `(amended <date>)` items rather than rewriting checked items,
     commit at a logical sub-step, rerun the complete phase gate, then invoke one
     `fresh-review` re-review with the prior findings.
   - Actionable findings remaining after that re-review: stop and surface them to the user
     for direction. Do not start a third review or ask to push/open a PR.
4. **Commit-integrity check**: `git status` must be clean, and every new file this phase
   introduced must appear in `git show --stat` of a commit on the phase branch — a file
   described in a commit message but never `git add`ed has happened before.
5. Update the STATUS block and checkboxes to reflect reality.
6. Report to the user: phase gate passed (plus the spec gate on the final phase), fresh
   review result when one ran, and N commits — then one ask: stacked → **"push + update the
   stack on GitHub?"**, answered with `gh stack submit --auto --open`; sequential → **"push
   + open PR?"** against the integration branch. Say in the ask that `submit` covers every
   active branch in the stack (earlier phases are no-ops) — do not compute a PR base
   yourself under the stacked model. The PR description must include the phase's **Review
   checklist** lane, so manual verification happens in the user's review before they merge.
   If a diverged stack aborts the submit, surface it and stop; do not retry interactively.
   With no CI
   item in the file, the phase is complete once the PR is open — do not invent a
   checks-watching step.
7. **Only if EXECUTION.md carries a CI gate item** (the user opted in at plan time): after
   the PR opens, watch the checks (`gh pr checks --watch`, or the project's CI equivalent)
   — do not report complete while CI is running or red. If CI fails, fix it on the branch,
   push (`gh stack push` when stacked; pushing CI fixes to the already-authorized PR needs
   no new ask), and re-watch. For
   a failure that is demonstrably unrelated to the diff (pre-existing on the base branch, or
   an infra flake), re-run it once; if it persists, mark the CI item `[~]` with the evidence
   of unrelatedness and surface it to the user — never chase unrelated red across sessions.
   Only when CI is green (or `[~]` with evidence) check the item, update STATUS, and report
   complete. If the user asks for CI gating mid-spec, add the item to the `## Spec gate`
   block first, then run this step.

## Step 4 — After the user merges

1. **Stacked:** run `gh stack sync` — it fetches, fast-forwards the trunk, cascade-rebases
   every remaining phase onto it, pushes, and syncs PR state. That single command replaces
   the old pull-and-rebase; do not also rebase by hand. If it reports divergence it aborts
   without pushing — surface that rather than forcing it.
   **Sequential:** checkout the integration branch, `git pull`.
2. Ask before deleting the merged phase branch (local + remote). Only after a yes, re-run
   `gh stack sync --prune` (stacked) or delete the branch directly (sequential).
3. Update STATUS (phase → `done`, or `done-with-debt` if debt remains). Then, if phases
   remain, ask whether to start the next one (Step 2).
5. If that was the **final** phase and the project keeps a capability baseline, offer the
   `spec-archive` skill — it folds PLAN.md's `## Spec Delta` into
   `specs/capabilities/` and archives the feature. Offer, don't run it: it writes the
   project's source of truth. Do not apply the delta yourself here.

## Step 5 — Parking (mid-phase stop)

If work must stop before a phase completes (user redirects, session ends mid-flight):
commit uncommitted work as `WIP: parked <date>` on the phase branch, and note in STATUS
that the phase is parked and why. Never `git stash` — stashes are detached from branches
and invisible to a cold agent. Resume = checkout the branch, continue, squash-or-keep the
WIP commit at the next real commit.

## Common rationalizations

Every rule below gets broken the same way: a plausible sentence arrives first, and the
violation follows from it. The excuse is the tell.

| Excuse | Reality |
|--------|---------|
| "HANDOFF.md says where I left off" | It's advisory prose from a past session. State is git + STATUS, and only those. |
| "The user clearly wants the next phase, they said continue the spec" | Starting a phase needs a fresh explicit go-ahead. Resuming an in-progress one doesn't — know which you're doing. |
| "The phase is done, pushing is implied" | Starting a phase authorized commits and nothing else. Push, PR, and merge are each a separate ask, every time. |
| "I should wait for phase 1's PR to merge before starting phase 2" | Stacking is the default: `gh stack add` on top and keep going. Waiting is sequential mode, and that is only for repos where `gh stack` doesn't run. |
| "`git checkout -b` is the same thing as `gh stack add`" | It isn't — the branch exists but the stack doesn't track it, so `submit` won't chain its PR and `sync` won't rebase it. Use the CLI for branch creation under the stacked model. |
| "`gh stack submit` wants to push branches I didn't work on" | That is how the stack updates; earlier phases are no-ops. Say so in the ask rather than hand-picking a push. |
| "The stack is tangled, `gh stack modify` would fix it" | Restructuring phases is spec-plan's job, and `modify` desyncs EXECUTION.md from the branches it describes. Stop and ask. |
| "All the phase PRs are approved, `gh stack merge` lands them at once" | Never. Merging is the user's, one phase at a time, and that command is all-or-nothing across the stack. |
| "This check is too tedious to run, I'll mark it deferred" | `[~]` is for environment blocks — missing tool, missing credentials — with substitute evidence. Effort is not a block. |
| "Cleaner history if I squash the phase into one commit" | Commit at logical sub-steps, and check items off as they land. Both exist so a cold agent can see where the work actually stopped. |
| "I'll re-read PLAN.md to rebuild context" | Checklist items name their own files. Open PLAN.md only for the section a specific ambiguous item points at — a full read is a recurring token cost for nothing. |
| "The gate's test command is broader than this phase needs" | That breadth is the point: a shared-type change breaks consumers the edited-file list never mentions. Never narrow a project-wide typecheck, never swap dependency-aware selection for hand-picked files. |
| "This phase touches shared types, I'd better run the full suite too" | The full suite is the spec gate, run once before the final phase's PR. Pulling it into every phase is the repeated cost this model exists to remove. |
| "I'll watch CI on this PR to be safe" | CI is opt-in. No CI item in EXECUTION.md means the user chose not to gate on it; watching checks anyway spends turns on a gate nobody asked for. |
| "The spec gate failed on code from phase 2, I should reopen that phase" | Merged phases are closed. Fix it forward on the current branch as an `(amended)` item. |
| "The written gate command won't run, I'll use a close equivalent" | Stop, fix the command in EXECUTION.md, tell the user, then run the corrected one. A silent substitution means the gate that passed is not the gate that was agreed. |
| "The plan marked fresh review unnecessary, so I can ignore what the diff became" | The plan is the initial decision. Re-evaluate the actual diff against the rulebook triggers and confidence question after the phase gate. |
| "The review found one more issue, so another loop is safer" | One re-review is the cap. Remaining actionable findings go to the user; do not create an unbounded review loop. |
| "This checked item was done wrong, I'll fix it in place" | Checked items are immutable. Corrections are new `(amended)` items — the record of what happened must survive being wrong. |
| "Let me re-verify the earlier items to be safe" | The checklist is the record. Re-opening checked work burns context to re-learn what is already written down. |

## Model choice

Stay on the strong model for anything requiring judgment: interpreting an ambiguous item,
diagnosing a gate failure, deciding whether an amendment is new scope. Dropping to a cheap
tier is worth it only for phases that are pure transcription — the plan names every file and
every change, and the work is typing. Weigh it by **turns, not token price**: a cheap model
that needs three attempts at a multi-step phase costs more than a strong one that needs one,
and it burns your context on the retries.
