---
name: spec-plan
description: Turn a /grill-me PLAN.md into a phased specs/<feature>/EXECUTION.md ready for the spec-phase skill to run. Use when a grill session just produced a PLAN.md with no EXECUTION.md yet, or when the user says "make the execution plan", "break this into phases", "turn PLAN.md into an execution file".
argument-hint: "<feature-slug> — the specs/<feature-slug>/PLAN.md must already exist"
---

Produces `specs/<feature-slug>/EXECUTION.md` from `specs/<feature-slug>/PLAN.md`. This skill
only plans phases and writes the checklist file — it does not write code. Once EXECUTION.md
exists, hand off to the `spec-phase` skill to actually run a phase.

The rulebook (state model, branch model, gate lanes, checkpoints) is `specs/RULEBOOK.md` —
this skill implements it, not restates it. Read it at Step 0; it is not in context by
default. `CLAUDE.md` carries only a stub pointing at it.

## Step 0 — Load state

1. **Locate and read the rulebook**: `specs/RULEBOOK.md` (or the project's `<SPECS_DIR>`).
   Read it — the state model (`done-with-debt`, `[~]`, checkpoints, parking) is defined
   there, and improvising substitute definitions would leave EXECUTION.md meaning different
   things to spec-phase later. Three cases when it's absent:

   - **CLAUDE.md has an inline "Spec-Driven Execution Workflow" section with a rulebook
     marker below v3** — a pre-split project. Offer to migrate: move that section's body to
     `specs/RULEBOOK.md` (promoting its `###` headings to `##`), replace the section in
     CLAUDE.md with this skill's `references/claude-md-stub.md`, and apply any version
     upgrade in the same pass. The project keeps its resolved placeholders and its
     keep-or-drop choice on the "Capability baseline" subsection. Say what this buys — the
     rulebook stops loading in every session and is read only when a spec skill runs.
   - **CLAUDE.md has such a section at v3 or above** — the stub is missing its file. Ask
     before assuming; do not silently regenerate a rulebook the project may have moved.
   - **Neither exists** — fresh setup. Read `references/rulebook.md`, resolve its
     placeholders (`<SPECS_DIR>` = the specs root the skills glob, default `specs`;
     `<INTEGRATION_BRANCH>` from `git branch`, e.g. `develop`/`main`; `<SPECS_INDEX_CMD>` =
     the index-regen command, or delete the INDEX.md bullet if the project has no such
     generator), decide with the user whether to keep the opt-in "Capability baseline"
     subsection, drop the leading `<!-- TEMPLATE -->` comment, and write
     `specs/RULEBOOK.md`. Then do the same with `references/claude-md-stub.md` and append it
     to `CLAUDE.md`. Confirm the resolved values with the user before writing either.

   Do not proceed until the rulebook exists and you have read it.

   **Version check** (when it does exist): compare its `<!-- rulebook vN -->` marker against
   the template's. Missing, or lower → the project is on a stale copy: say so, show what
   changed between the versions, and offer to upgrade both the rulebook and the CLAUDE.md
   stub together — they share a version and drift apart silently otherwise. Never bump a
   marker without applying the corresponding changes; a number that lies is worse than an
   absent one. If the user declines, proceed on the old rulebook and don't re-ask this
   session.
2. Read `specs/<feature-slug>/PLAN.md` in full. If it doesn't exist, stop and ask for the
   slug or tell the user to run `/grill-me` first.
3. Check whether `specs/<feature-slug>/EXECUTION.md` already exists. If it does and has any
   checked-off items, stop — regenerating would destroy execution history. Ask the user
   whether they want to append new phases or start over (only start over if they explicitly
   say so). Mid-phase corrections to unchecked items and gate scope are spec-phase's job
   (recorded amendments), not a reason to regenerate here.
4. **One-spec-in-flight check**: one `rg -l 'in-progress' specs/*/EXECUTION.md` — do not
   read the other EXECUTION.md files in full. If another spec has a phase in `in-progress`
   (or uncommitted work on its branch), stop — don't plan a new spec on top of one
   mid-flight; the user must finish or park it first.
5. Resolve the **integration branch** (the rulebook's branch model names it; otherwise
   `git branch` for the convention in use). Name it explicitly in EXECUTION.md; never write
   a hardcoded assumption.

## Step 1 — Surface ambiguity before phasing anything

PLAN.md often ends with an "Open Items" / "TBD at implementation time" section, or contains
decisions phrased as ranges ("check constraint vs. trigger — TBD"). Do not silently pick one
and bake it into the checklist — a wrong guess here means rework discovered mid-phase or,
worse, an unreviewed assumption shipped in a migration.

- List every open item / unresolved mechanism found in PLAN.md.
- For anything that changes what files get touched, what a checklist item says to build, or
  is hard to reverse (schema/migration shape, id types, auth/infra choices) — ask the user
  before writing it into a checklist item.
- For anything genuinely inconsequential to phase structure (e.g. exact error message
  wording) — proceed and note the judgment call inline in the checklist item so it's visible
  at execution time, don't stop to ask.

**If the project keeps a capability baseline** (rulebook → "Capability baseline"), validate
PLAN.md's `## Spec Delta` against it before phasing: every `ADDED` title must be free in the
target capability file, every `MODIFIED`/`REMOVED` title must exist there. A colliding
`ADDED` usually means this feature contradicts an earlier one — stop and put it to the user;
that contradiction is invisible anywhere else. A `MODIFIED` with no entry means the backfill
was skipped during the grill — stop and run it (evidence classes per rulebook), don't invent
the missing requirement. Derive review-checklist items from the delta's scenarios: a
`WHEN/THEN` pair converts to a manual verification step almost verbatim.

## Step 2 — Derive phase boundaries

Phases split along dependency layers, not arbitrary size. Common shape for a full-stack
feature (adjust to what PLAN.md actually describes — don't force a fixed phase count):

1. Schema / shared types / API — nothing downstream can start without this landing first.
2. Frontend data layer — wiring the new fields/endpoints through without touching UI.
3. Frontend UI — the part users actually see.

Split further only where PLAN.md's own sections imply a real dependency boundary. Do not
split by "this felt like a lot" — a phase should be independently verifiable and
independently revertable, because **phases stack and may not have merged yet** when the
next one starts (stacked model — see rulebook).

For each phase: branch name `<feature-slug>/phase-<n>-<short-desc>`. Base is the
**previous phase's branch** (stacked, default) — phase 1 bases off the integration branch.
Only base every phase off the integration branch (waiting for each merge first) if the
user explicitly opts into sequential mode for this spec; record that choice in
EXECUTION.md's header if so.

## Step 3 — Write each phase's checklist and gates

Every checklist item must name the actual file(s)/function(s)/table(s) from PLAN.md — pull
these directly from PLAN.md's own "Schema Changes" / "API Changes" / "Frontend Changes"
sections rather than re-deriving them. Vague items ("update the backend") are not
acceptable; an agent picking up the phase cold should not have to re-read all of PLAN.md to
know where to start.

**Placeholders are plan failures, not shorthand.** Scan the finished checklist for these and
fix every hit — each one defers a decision to an agent with less context than you have now:
`TBD` / `TODO` / "decide at implementation time"; "add appropriate error handling" /
"add validation" / "handle edge cases"; "update the tests" with no named test file; "same as
phase N" (name the files again — phases are read out of order on resume); any type,
function, or table referenced by no item that creates it.

**Interfaces.** Each phase declares what it consumes from earlier phases and what later
phases build on — exact exported names and signatures, not descriptions. Phases are stacked
and executed in separate sessions, so phase 3's agent has no cheap way to learn what phase 2
actually named things; without this it guesses, and the guess surfaces as a red typecheck
two phases later. Omit either line when it's genuinely empty.

Gates come in **two lanes**:

- **Agent gate (hard)**: a pre-PR smoke check (typecheck, tests, build) plus **CI on the
  PR as the authoritative full run**. The local commands catch the cheap majority before
  a PR exists; they never replace CI, and the phase is not done until the PR's CI is
  green (spec-phase enforces this). Local scoping goes by the *import graph*, never by
  the list of edited files — a phase that edits a shared model breaks its consumers, and
  consumers are not in the edited set.
  - *Typecheck*: project-wide. Do not scope it. It has no runtime, no fixtures, no
    services — it is the cheap check, and it is the one that catches a changed shared
    type breaking every package that imports it. `tsc --noEmit` at the root (or the
    project's own `typecheck` script) is the default; only narrow it if the repo has no
    root-level typecheck at all, and say why in the gate item.
  - *Tests*: dependency-aware selection, not hand-picked paths. Prefer a runner that
    resolves the reverse-dependency closure itself — `jest --findRelatedTests <files>`,
    `vitest related --run <files>` — so every test transitively importing the phase's
    changes runs, including ones the phase never looked at. Write the command with the
    changed-file arguments left for execution time (spec-phase fills them from the real
    diff). If the runner has no related-tests mode, fall back to the narrowest *suite*
    that contains the consumers (a package's or workspace's whole suite), not a list of
    files — and note that it's a fallback. **Escalation**: if a phase's items touch
    shared surfaces (exported types/models, shared schemas or utilities), write the full
    local suite into that phase's gate instead — the import graph is least trustworthy
    exactly there (fixtures, DI, serialized shapes carry no import edge), and that is
    where consumer breakage originates.
  - *Build*: only if the phase's changes can plausibly break it (config, entry points,
    codegen); skip it for leaf-level code already covered by typecheck.
  - *CI*: end every phase's gate with `- [ ] CI green on the phase PR`. spec-phase
    resolves it after opening the PR by watching checks (`gh pr checks --watch` or the
    project's equivalent); red CI is the executing agent's to fix, on the phase branch,
    before the phase can be marked done.

  Write the concrete command(s) into the gate item — an agent picking up the phase must
  not have to decide the scope itself. The local items must pass before the PR is opened;
  the CI item resolves after. Only write items the agent can actually run in this
  environment. If an agent-owed check is foreseeably
  environment-blocked (needs credentials, a live service), say so in the item now — at
  execution time it becomes `[~]` with substitute evidence, per the rulebook.
- **Review checklist**: the manual scenarios (browser walkthroughs, visual checks) the
  *user* verifies while reviewing the PR. spec-phase copies this lane into the PR
  description. These never block phase completion and never become agent debt.

**Fresh-review decision.** Classify each phase from its planned scope using the rulebook's
hard triggers. Write exactly one line: `Fresh review: required — <trigger>` or
`Fresh review: not required`. This is not a third checklist lane and has no checkbox.
Do not invoke `fresh-review` while planning. `spec-phase` owns invocation after the local
gate and may upgrade `not required` from the actual diff; it may never downgrade
`required`.

## Step 4 — Assemble EXECUTION.md

Use this skeleton exactly (do not copy the shape from older `specs/*/EXECUTION.md` files —
they predate v2 and carry stale conventions):

```markdown
# <Feature> — Execution Plan

Spec: [PLAN.md](PLAN.md). Rulebook: `specs/RULEBOOK.md`.
Integration branch: `<resolved-branch>`. Branch model: <stacked (default) | sequential
(opted in)>.

## STATUS

- Current phase: <n> — <state: pending | in-progress | done | done-with-debt>
- Phase 1 — <name>: <state>
- Phase 2 — <name>: <state>
- Verification debt: none

## Phase <n> — <name>

Branch: `<feature-slug>/phase-<n>-<short-desc>` (off `<previous-phase-branch>`, stacked —
or off `<integration-branch>` if phase 1, or if sequential mode is opted in)

<one line: why this is one phase — the dependency boundary it sits on>

Consumes: `<exact names/signatures this phase relies on from earlier phases>`
Produces: `<exact names/signatures later phases build on>`

Fresh review: <required — hard trigger | not required>

- [ ] <item naming exact files/functions>

**Agent gate (hard):**
- [ ] <project-wide typecheck command — not scoped to this phase>
- [ ] <dependency-aware test command, e.g. `vitest related --run <changed files>` — or
  the full suite if this phase touches shared surfaces>
- [ ] CI green on the phase PR

**Review checklist (user, at PR review):**
- [ ] <manual scenario>

**On completion:** run local agent gate; run `fresh-review` when the recorded or actual-diff
decision requires it; update STATUS + checkboxes; stop and ask before push/PR. After the PR
opens, watch CI and fix red before marking the phase done. Review checklist goes into the
PR description.
```

**Keep it terse.** EXECUTION.md is re-read at the start of every spec-phase session, so
every line in it is a recurring token cost for the whole life of the spec. One line per
checklist item; the phase rationale is one line; do not restate PLAN.md's reasoning or
paste its prose — reference its section names (`per PLAN.md → "Schema Changes"`) and let
the executing agent read that section only if the item alone is ambiguous.

Write the file. Do not create branches or touch code yet.

## Step 5 — Hand off

Report to the user: number of phases, what each covers, any open items you flagged in Step 1
and how they were resolved. Ask whether to proceed into Phase 1 now via the `spec-phase`
skill — do not auto-start execution, starting a phase still needs the explicit go-ahead
`spec-phase`'s own procedure requires.

## Do not

- Do not write code, create branches, or run typecheck/tests — this skill only produces the
  plan file.
- Do not invent scope beyond what PLAN.md decided. If something feels missing, ask whether
  it belongs in this feature's plan or is out of scope, don't quietly add it.
- Do not silently resolve an "Open Items" entry from PLAN.md that affects schema, auth, or
  anything hard to reverse — that's Step 1's job, don't skip it under time pressure.
- Do not regenerate an EXECUTION.md that already has checked-off progress without explicit
  confirmation.
- Do not put agent-unrunnable manual checks in the agent gate — they belong in the review
  checklist lane.
- Do not copy PLAN.md prose into EXECUTION.md — reference sections by name instead.
- Do not scope the typecheck to the phase, and do not write a test gate as a hand-picked
  list of test files. Both let a shared-model change ship with its consumers broken, which
  surfaces as a red PR after the gate passed.
- Do not omit the `CI green on the phase PR` gate item, and do not treat the local gate as
  the final verdict — it is the smoke check; CI's full run is authoritative.
- Do not omit the phase's `Fresh review:` decision, invoke the reviewer for a phase marked
  `not required` when no end-of-phase upgrade applies, or downgrade a planned requirement.
- Do not resolve a `MODIFIED` with no baseline entry by writing the requirement yourself —
  that is the backfill, and it needs test evidence or the user's confirmation.
