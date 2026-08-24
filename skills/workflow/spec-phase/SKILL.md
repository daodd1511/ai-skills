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

1. **Read `specs/RULEBOOK.md`** (or the project's `<SPECS_DIR>`). Absent → stop and tell the
   user; `done-with-debt`, `[~]`, and the checkpoint rules are defined there and nowhere
   else, and the context file's pointer section is a signpost, not a fallback source. Setup
   is `spec-plan`'s Step 0, so run `/spec-plan` first.

   Version check: if the rulebook's `<!-- rulebook vN -->` marker is below the template's
   (`../RULEBOOK-TEMPLATE.md`), mention it once and carry on — upgrading mid-spec changes the
   rules under an in-flight phase, so it belongs to `spec-plan` at the next one's start. If
   the template isn't there at all (skills installed flat, not as a `workflow/` directory),
   skip the check and say so in one line; don't send the user hunting. The project's own
   rulebook is what this phase runs on, and it is present — a missing template is never
   licence to improvise the terms above.
2. `git status` and `git branch --show-current`. The branch name encodes spec+phase, the
   working tree and log encode progress. **This is the authoritative state.**
3. Read `specs/<feature-slug>/EXECUTION.md` — STATUS block and checklist. Ask for the slug if
   it wasn't given and the branch doesn't encode it; never guess between specs.
4. STATUS disagreeing with git on a mechanical fact (branch exists, what's committed, what's
   merged) → **git wins silently**; correct STATUS, no reconciliation ceremony. STATUS is
   trusted only for what git can't express: verification debt, park reasons, phase intent.
5. Do **not** read PLAN.md up front. Checklist items name their exact files/functions
   (spec-plan guarantees it). Open PLAN.md only when a specific item is ambiguous, and only
   the section that item references.
6. `HANDOFF.md` is advisory context (why something was parked, what the user said) — never
   resume from it, never treat it as state.
7. **One-spec-in-flight check**: one `rg -l 'in-progress' specs/*/EXECUTION.md`, without
   reading the others in full. A different spec `in-progress` → stop; the user finishes or
   parks it first.

## Step 1 — Decide: resume, or start the next phase

- A phase is **in-progress** iff it has unchecked **non-deferred** items; `[~]` doesn't count
  as unfinished. Current branch matches an in-progress phase → **resume** from the first
  unchecked item. Don't re-do checked items, don't re-ask for authorization (phase start
  covered it), don't re-open the files behind checked items "to rebuild context" — read them
  only when the current item directly builds on them.
- Current phase `done`/`done-with-debt` and merged → **start next phase**, which needs a
  fresh explicit go-ahead. Never assume it.
- Checklist fully checked but the phase gate never actually ran → stop and run it first.

## Step 2 — Starting a new phase

1. Read EXECUTION.md's header for the branch model.

   **Stacked (default, `gh stack`):**
   - Phase 1 — create the stack: `gh stack init -b <integration-branch>`. Tell the user first
     that this enables `git rerere` in the repo.
   - Every phase — from the stack top, `gh stack add <feature-slug>/phase-<n>-<short-desc>`.
     Always pass the branch name; never `-m`/`-A`/`-u`, which commit for you. If an earlier
     phase merged since, `gh stack sync` first — it fast-forwards the trunk and
     cascade-rebases the rest, replacing the manual rebase.
   - Never `gh stack merge` or `modify`; `unstack`/`delete` needs an explicit ask. Never run a
     bare interactive subcommand — `submit`, `checkout`, `switch`, `view` open an editor or
     pager and hang. Use `--auto`, an explicit argument, or `--json`.
   - `gh stack` unavailable here (exit 9, unknown command) → stop and tell the user. The spec
     was planned as a stack; switching to sequential is a header change, not a mid-phase
     improvisation.

   **Sequential:** checkout the integration branch, `git pull`, wait for the previous phase's
   PR to merge, then `git checkout -b <feature-slug>/phase-<n>-<short-desc>`.
2. Confirm you are on the new branch before touching code.
3. Work the checklist top to bottom. Commit at logical sub-steps, never one giant commit.
   Check off each item the moment it's done, never batched at the end.
4. No push, no PR without a separate explicit go-ahead — starting the phase pre-authorized
   the commits and nothing more.

## Mid-phase amendments

Execution discovers scope plans miss. EXECUTION.md may be amended during an in-progress
phase, under these rules only:

- **Necessary-but-unplanned work** (a checklist item can't complete without it): add
  unchecked item(s) naming exact files, tagged `(amended <date>)`, and list them in the
  completion report. *New scope* beyond what PLAN.md decided → stop and ask; it goes through
  the plan, not smuggled into a phase.
- **Gate arguments come from the real diff**: a dependency-aware test gate takes the phase's
  actual changed files, computed from the diff at run time, never a stale list the plan
  guessed.
- **Checked items are immutable** — never edit, uncheck, or delete one. A correction to done
  work is a new `(amended)` item.
- **User-visible behaviour changes amend the delta too** (baseline projects): update PLAN.md's
  `## Spec Delta` in the same commit. Skip it and the delta records what was planned while the
  code does something else — `spec-archive` then refuses to reconcile the difference later,
  exactly when the context to resolve it is gone.
- **Interfaces are part of the contract**: a phase exporting something different from its
  `Produces:` line corrects that line before completing. Later phases are planned against it.
- Restructuring phases (splitting, reordering, adding) is spec-plan's job — stop and ask.

## Step 3 — Completing a phase

1. Run the **phase gate** exactly as written (project-wide typecheck + dependency-aware
   tests). Never narrow — swapping dependency-aware selection for files you think are
   relevant, or scoping the typecheck to this phase's packages, is what lets a shared-type
   change pass. Filling in the changed-file arguments a command expects isn't substitution;
   that's the gate working. Never widen either: full suite and builds belong to the spec
   gate, once. A written command that's wrong or won't run → stop, fix it in EXECUTION.md,
   tell the user, run the corrected one. On failure quote only the failing portion.

   All must actually pass. An item becomes `[~]` only when environment-blocked (missing
   tool/credentials, not effort), with substitute evidence inline and mirrored in STATUS's
   verification-debt list; the phase is then `done-with-debt`.

   **Final phase** also runs the `## Spec gate` items — full local suite plus any listed
   build — over the accumulated spec diff, same rules. Fix failures here as `(amended <date>)`
   items; a cause inside an already-merged phase is fixed forward, never by reopening it. A CI
   item exists only if the user opted in (step 7); otherwise these gates are the verdict.
2. **Resolve the fresh-review decision from the actual diff.** Keep `required` if recorded;
   a legacy phase with no `Fresh review:` line starts at `not required`. Upgrade to
   `required` when the actual diff crosses a rulebook hard trigger (auth, crypto/secrets/
   injection, payments/financial calculations, destructive or irreversible durable-data
   changes, CI/test-gate infrastructure, money/data-loss error paths), the same behavior
   needed two correction attempts, or the answer to "Am I less confident in this change than
   usual, or did it grow beyond what was asked?" is yes. Add the line for a legacy phase;
   record the reason when upgrading. Never downgrade `required`. Still `not required` → don't
   invoke the skill or build a review packet.
3. Review required → invoke `fresh-review` now with the phase goal, complete base/head change
   set, constraints and interfaces, and step 1's exact gate evidence. This invocation
   authorizes the skill's single read-only fresh-context delegation — not edits, remote
   actions, or provider selection by the reviewer. Then:
   - No P0-P2 findings: continue.
   - P0-P2 findings: make the minimal corrections here, as `(amended <date>)` items rather
     than rewrites of checked items; commit at a logical sub-step; rerun the complete phase
     gate; invoke one re-review with the prior findings.
   - Actionable findings surviving that re-review: stop and surface them for direction. No
     third review, no asking to push.
4. **Commit-integrity check**: `git status` clean, and every new file this phase introduced
   appears in `git show --stat` of a commit on the branch — a file described in a commit
   message but never `git add`ed has happened before.
5. Update the STATUS block and checkboxes to reflect reality.
6. Report: phase gate passed (plus spec gate on the final phase), fresh-review result if one
   ran, N commits. Then **one** ask — stacked: "push + update the stack on GitHub?";
   sequential: "push + open PR?" against the integration branch. Say in the ask that `submit`
   covers every active branch in the stack (earlier phases are no-ops); never compute a PR
   base yourself under the stacked model. On a yes, stacked, in this order:
   - `gh stack submit --auto` — pushes and creates/updates the stack's PRs as drafts. Never
     add `--open`: it publishes every PR in the stack under its auto-generated title.
   - `gh stack view --json` → this phase's branch → its PR number.
   - `gh pr edit <n> --title '<title>' --body-file <path>` with the description you wrote for
     **this phase only**; `--body-file`, never `--body`. Earlier phases' PRs stay untouched.
   - `gh pr ready <n>`.

   Sequential: one `gh pr create --base <integration-branch> --title '<title>' --body-file
   <path>`. Either way the description must carry the phase's **Review checklist** lane, so
   the user's manual verification happens before they merge. A diverged stack aborting the
   submit → surface it and stop, never retry interactively. The PR counts as open only after
   `gh pr ready`; with no CI item the phase is complete at that point — don't invent a
   checks-watching step.
7. **Only if EXECUTION.md carries a CI gate item** (opted in at plan time): after the PR
   opens, watch checks (`gh pr checks --watch`, or the project's equivalent) — never report
   complete while CI is running or red. Failures get fixed on the branch and pushed
   (`gh stack push` when stacked; CI fixes to an already-authorized PR need no new ask), then
   re-watched. A failure demonstrably unrelated to the diff (pre-existing on base, or an infra
   flake) gets one re-run; if it persists, mark the item `[~]` with the evidence of
   unrelatedness and surface it — never chase unrelated red across sessions. Green (or `[~]`
   with evidence) → check the item, update STATUS, report complete. CI asked for mid-spec →
   add the item to `## Spec gate` first, then run this step.

## Step 4 — After the user merges

1. **Stacked:** `gh stack sync` — fetches, fast-forwards the trunk, cascade-rebases every
   remaining phase onto it, pushes, syncs PR state. That one command replaces pull-and-rebase;
   don't also rebase by hand. It aborts without pushing on divergence — surface that rather
   than forcing it.
   **Sequential:** checkout the integration branch, `git pull`.
2. Ask before deleting the merged phase branch (local + remote). Only after a yes: `gh stack
   sync --prune` (stacked) or delete it directly (sequential).
3. Update STATUS (`done`, or `done-with-debt` if debt remains). Phases remaining → ask whether
   to start the next (Step 2).
4. **Final** phase in a project keeping a capability baseline → offer the `spec-archive`
   skill, which folds PLAN.md's `## Spec Delta` into `specs/capabilities/` and archives the
   feature. Offer, don't run it: it writes the project's source of truth. Never apply the
   delta yourself here.

## Step 5 — Parking (mid-phase stop)

Work stopping before a phase completes (user redirects, session ends mid-flight): commit
uncommitted work as `WIP: parked <date>` on the phase branch, note in STATUS that the phase is
parked and why. Never `git stash` — stashes are detached from branches and invisible to a cold
agent. Resume = checkout the branch, continue, squash-or-keep the WIP commit at the next real
commit.

## Common rationalizations

Every rule above gets broken the same way: a plausible sentence arrives first, the violation
follows from it. The excuse is the tell.

| Excuse | Reality |
|--------|---------|
| "HANDOFF.md says where I left off" | Advisory prose. State is git + STATUS, only. |
| "They said continue, so they want the next phase" | Starting needs a fresh go-ahead; resuming doesn't. Know which you're doing. |
| "The phase is done, pushing is implied" | Phase start authorized commits. Push, PR, merge are each a separate ask, every time. |
| "Wait for phase 1's PR before starting phase 2" | Stacking is the default: `gh stack add` and keep going. Waiting is sequential mode only. |
| "`git checkout -b` is the same as `gh stack add`" | The stack won't track it, so `submit` won't chain its PR and `sync` won't rebase it. |
| "`submit` pushes branches I didn't work on" | That's how the stack updates; earlier phases are no-ops. Say so in the ask. |
| "`--auto --open` does it in one command" | `--auto` can't carry a description and `--open` publishes the whole stack. The checklist lane is what the PR is for. |
| "While editing PRs I'll fix the earlier ones too" | This phase's PR only. Earlier descriptions may be the user's own edits. |
| "`gh stack modify` would fix this tangle" | Restructuring is spec-plan's job; `modify` desyncs EXECUTION.md from its branches. |
| "All PRs approved, `gh stack merge` lands them" | Never. Merging is the user's, one phase at a time; that command is all-or-nothing. |
| "Too tedious to run, I'll defer it" | `[~]` is for environment blocks with substitute evidence. Effort is not a block. |
| "Cleaner history if I squash the phase" | Sub-step commits and immediate check-offs show a cold agent where work stopped. |
| "I'll re-read PLAN.md to rebuild context" | Items name their own files. A full read is a recurring cost for nothing. |
| "The test gate is broader than this phase needs" | That breadth is the point: shared-type changes break consumers the file list never mentions. |
| "Shared types here, better run the full suite" | That's the spec gate, once. Per-phase is the cost this model removes. |
| "I'll watch CI to be safe" | CI is opt-in. No CI item means the user chose not to gate on it. |
| "Spec gate failed on phase 2's code, reopen it" | Merged phases are closed. Fix forward as `(amended)`. |
| "The written command won't run, close equivalent" | Fix it in EXECUTION.md and tell the user first, or the gate that passed isn't the gate agreed. |
| "The plan said review unnecessary" | That was the initial decision. Re-evaluate the actual diff against the triggers. |
| "One more review loop is safer" | One re-review is the cap. Remaining findings go to the user. |
| "This checked item was wrong, fix it in place" | Checked items are immutable — the record must survive being wrong. Corrections are new `(amended)` items. |
| "Re-verify earlier items to be safe" | The checklist is the record. Re-opening checked work re-learns what's already written. |

## Model choice

Stay on the strong model for anything requiring judgment: interpreting an ambiguous item,
diagnosing a gate failure, deciding whether an amendment is new scope. A cheap tier is worth
it only for pure transcription — the plan names every file and change, and the work is typing.
Weigh by **turns, not token price**: a cheap model needing three attempts at a multi-step
phase costs more than a strong one needing one, and burns your context on the retries.
