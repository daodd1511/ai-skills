<!--
  TEMPLATE — spec-workflow rulebook. This is the canonical source both the spec-plan and
  spec-phase skills copy from when a project has no rulebook yet. Fill the placeholders,
  then DELETE this comment block before appending the section to the project's CLAUDE.md:
    <SPECS_DIR>          specs root the spec skills use — must match what they glob for
                         (they hardcode `specs`; only change if you also change the skills)
    <INTEGRATION_BRANCH> the project's integration branch (e.g. `develop` or `main`)
    <SPECS_INDEX_CMD>    command that regenerates <SPECS_DIR>/INDEX.md (e.g. `pnpm specs:index`).
                         If the project has no such generator, DELETE the INDEX.md bullet
                         in "State model" instead of filling this in.
  Keep the "## Spec-Driven Execution Workflow" heading verbatim — the skills grep for it.
-->

## Spec-Driven Execution Workflow

Large/architectural changes flow: `/grill-me` → `<SPECS_DIR>/<feature>/PLAN.md` →
`<SPECS_DIR>/<feature>/EXECUTION.md` (via the `spec-plan` skill) → phased implementation
(via the `spec-phase` skill). These rules bind even when neither skill is invoked.

### State model
- **Git is the authoritative state store**: branch name encodes spec+phase
  (`<feature-slug>/phase-<n>-<desc>`), commits encode progress. Each `EXECUTION.md` opens
  with a **STATUS block** (current phase, per-phase state, verification debt) — the only
  prose trusted as state. **On any conflict, git wins silently** for mechanical facts
  (branch, commits, merged-or-not); STATUS is trusted only for what git can't express
  (debt, park reasons). `HANDOFF.md` is a session baton from `/handoff` — advisory context,
  never authority; do not resume from it.
- Phase states: `pending` / `in-progress` / `done` / `done-with-debt`. Gate items are
  `[ ]`/`[x]`; an item may be `[~]` (deferred) only when environment-blocked (missing
  tool/credentials, not effort), with substitute evidence inline and a mirrored STATUS debt
  entry. A phase is in-progress iff it has unchecked **non-deferred** items.
- `<SPECS_DIR>/INDEX.md` is a **generated report** (`<SPECS_INDEX_CMD>`), never hand-edited.
  After touching any STATUS block, rerun it and commit the regenerated INDEX.md in the same
  commit. STATUS blocks must keep the canonical format the script enforces; the script fails
  loudly on drift. On conflict, git and STATUS win — INDEX.md is advisory, like `HANDOFF.md`.
  <!-- DELETE this bullet if the project has no specs-index generator. -->

### Branch model — stacked by default
- **Default: stacked.** Each phase branches off the **previous phase's branch** (phase 1
  off the integration branch, currently `<INTEGRATION_BRANCH>`; resolve at plan time, never
  hardcode). Push → PR to the previous phase's branch (or to the integration branch if the
  previous phase already merged) → continue to the next phase without waiting for
  review/merge. Rebase onto the integration branch after an earlier phase's PR merges.
- **Sequential (off the integration branch, wait for merge) is opt-in only** — use it only
  when the user explicitly says so for this spec (e.g. "do phases sequentially" / "wait for
  merge before the next phase"). When opted in: each phase branches off the integration
  branch → push → PR → user reviews & merges → pull → next phase branches off the updated
  integration branch.
- After a phase's PR merges, ask before deleting the merged phase branch (local + remote).

### Checkpoints
- Starting a phase authorizes its commits — nothing else.
- Gate pass → one ask: "push + open PR?". Remote actions are never bundled with anything
  else.
- A phase is complete only when its **agent gate** (typecheck, tests, build) actually
  passed — checking boxes doesn't substitute for running it — **and the phase PR's CI is
  green**. The local gate is a pre-PR smoke check; CI's full run is authoritative, and red
  CI on a phase PR is the agent's to fix before the phase is done. Manual verification scenarios
  are the **review checklist**, listed in the PR description for the user to walk through
  before merging — they are the user's, not agent debt.
- **One spec in flight at a time.** Do not start or resume a different spec's phase while
  another has an unfinished phase. Finish the current phase, or explicitly **park** it with
  the user's go-ahead: a `WIP: parked <date>` commit on the phase branch plus a STATUS note
  (never `git stash` — stashes are invisible to a cold agent and easy to orphan).

Procedure lives in the skills — planning in the `spec-plan` skill, execution and resume in
the `spec-phase` skill — invoke the relevant one rather than re-deriving it.
