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
default. The only workflow content in the project's context file (`CLAUDE.md` / `AGENTS.md`)
is the pointer section that maps the specs root (`../SETUP.md`); the rules themselves never
go there.

## Step 0 — Load state

1. **Locate and read the rulebook**: `specs/RULEBOOK.md` (or the project's `<SPECS_DIR>`).
   Read it — the state model (`done-with-debt`, `[~]`, checkpoints, parking) is defined
   there, and improvising substitute definitions would leave EXECUTION.md meaning different
   things to spec-phase later.

   **When it's absent** — fresh setup. Read `references/rulebook.md`, resolve its
   placeholders (`<SPECS_DIR>` = the specs root the skills glob, default `specs`;
   `<INTEGRATION_BRANCH>` from `git branch`, e.g. `develop`/`main`; `<SPECS_INDEX_CMD>` =
   the index-regen command, or delete the INDEX.md bullet if the project has no such
   generator), decide with the user whether to keep the opt-in "Capability baseline"
   subsection, drop the leading `<!-- TEMPLATE -->` comment, and write `specs/RULEBOOK.md`.
   Confirm the resolved values with the user before writing.

   Then find the project's **context file** and check it for a `<!-- spec-workflow vN -->`
   marker. Which file that is depends on the project, not on which agent you are: check
   `CLAUDE.md` and `AGENTS.md` both, and read what you find — one is often a stub redirecting
   to the other (`refer to @CLAUDE.md`), in which case the target holds the real content and
   is the one to edit. Two independently maintained files both need the section.

   If the marker is absent, offer to append the pointer section from `../SETUP.md`, resolved
   to the same `<SPECS_DIR>`. That section is what routes a `/grill-me` plan into
   `<SPECS_DIR>` instead of the repo root — no globally installed skill can supply it, and
   without it the next grill session in this repo lands `PLAN.md` wherever the model guesses.
   Offer, don't impose: it edits instructions the user's teammates read. If they decline, say
   plainly what breaks. The rulebook and that one section are all this workflow adds to a
   project; never expand the section with rules that belong in the rulebook.

   Do not proceed until the rulebook exists and you have read it.

   **Version check** (when it does exist): compare its `<!-- rulebook vN -->` marker against
   the template's. Missing, or lower → the project is on a stale copy: say so, show what
   changed between the versions, and offer to upgrade. Never bump a marker without applying
   the corresponding changes; a number that lies is worse than an absent one. If the user
   declines, proceed on the old rulebook and don't re-ask this session.
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
6. **Probe `gh stack` availability** — the default branch model depends on it. Run
   `gh stack view --json` at the repo root and read the exit code: `2` (not in a stack) means
   the command works and the repo has stacked PRs enabled → stacked. `9` ("stacked pull
   requests not enabled for repository"), an unknown-command error from an older `gh`, or a
   non-GitHub remote → the spec runs **sequential**; say which of those it was, don't just
   silently downgrade. The user may also ask for sequential outright. Record the resolved
   model in EXECUTION.md's header.

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

For each phase: branch name `<feature-slug>/phase-<n>-<short-desc>`. Under the default
stacked model the spec is one `gh stack` rooted at the integration branch and each phase is
one branch added to it — `spec-phase` runs `gh stack init`/`add`, so do not write base
branches or PR targets into EXECUTION.md; the CLI owns the chain. Under sequential
(Step 0's probe failed, or the user asked for it) every phase bases off the integration
branch and waits for the previous merge. Either way the resolved model goes in
EXECUTION.md's header.

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

Gates come in **three lanes** — two agent-owed tiers plus the user's:

- **Phase gate (hard, every phase)**: exactly two items, kept cheap because they run n
  times.
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
    files — and note that it's a fallback.

  Do not put the full suite or a build in a phase gate, and do not escalate a phase gate
  because it touches shared surfaces — that is what the spec gate is for.
- **Spec gate (hard, once — before the final phase's PR)**: written at the end of
  EXECUTION.md, not inside any phase. The full local test suite over the whole accumulated
  spec diff, plus a build command if the spec's changes can plausibly break it (config,
  entry points, codegen) — skip the build for leaf-level code already covered by
  typecheck. This lane exists because the import graph is least trustworthy exactly where
  specs do damage: fixtures, DI wiring, and serialized shapes carry no import edge, so
  dependency-aware selection misses them. Paying it once at the end costs one full run per
  spec instead of one per phase.
- **Review checklist**: the manual scenarios (browser walkthroughs, visual checks) the
  *user* verifies while reviewing the PR. spec-phase copies this lane into the PR
  description. These never block phase completion and never become agent debt.

**CI is opt-in.** Do not write a `CI green on the … PR` item unless the user asks for CI
gating on this spec. When they do, add it as a **spec gate** item (`- [ ] CI green on the
final phase PR`), not to every phase — spec-phase then watches checks after that PR opens.
Without the ask, the phase and spec gates are the verdict.

Write the concrete command(s) into every gate item — an agent picking up the phase must
not have to decide the scope itself. Only write items the agent can actually run in this
environment. If an agent-owed check is foreseeably environment-blocked (needs credentials,
a live service), say so in the item now — at execution time it becomes `[~]` with
substitute evidence, per the rulebook.

**Fresh-review decision.** Classify each phase from its planned scope using the rulebook's
hard triggers. Write exactly one line: `Fresh review: required — <trigger>` or
`Fresh review: not required`. This is not a third checklist lane and has no checkbox.
Do not invoke `fresh-review` while planning. `spec-phase` owns invocation after the local
phase gate and may upgrade `not required` from the actual diff; it may never downgrade
`required`.

## Step 4 — Assemble EXECUTION.md

Use this skeleton exactly (do not copy the shape from older `specs/*/EXECUTION.md` files —
they predate v2 and carry stale conventions):

```markdown
# <Feature> — Execution Plan

Spec: [PLAN.md](PLAN.md). Rulebook: `specs/RULEBOOK.md`.
Integration branch: `<resolved-branch>`. Branch model: <stacked via `gh stack` (default) |
sequential — `<why: gh stack unavailable (exit 9 / old gh / non-GitHub remote) | user
asked>`>.

## STATUS

- Current phase: <n> — <state: pending | in-progress | done | done-with-debt>
- Phase 1 — <name>: <state>
- Phase 2 — <name>: <state>
- Verification debt: none

## Phase <n> — <name>

Branch: `<feature-slug>/phase-<n>-<short-desc>` (stacked: `gh stack add` — sequential: off
`<integration-branch>`)

<one line: why this is one phase — the dependency boundary it sits on>

Consumes: `<exact names/signatures this phase relies on from earlier phases>`
Produces: `<exact names/signatures later phases build on>`

Fresh review: <required — hard trigger | not required>

- [ ] <item naming exact files/functions>

**Phase gate (hard):**
- [ ] <project-wide typecheck command — not scoped to this phase>
- [ ] <dependency-aware test command, e.g. `vitest related --run <changed files>`>

**Review checklist (user, at PR review):**
- [ ] <manual scenario>

**On completion:** run the phase gate; run `fresh-review` when the recorded or actual-diff
decision requires it; update STATUS + checkboxes; stop and ask before push/PR. Review
checklist goes into the PR description.

## Spec gate (hard — once, before the final phase's PR)

- [ ] <full local test suite command>
- [ ] <build command — omit this item entirely if nothing in the spec can break the build>
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
- Do not put agent-unrunnable manual checks in a gate — they belong in the review
  checklist lane.
- Do not copy PLAN.md prose into EXECUTION.md — reference sections by name instead.
- Do not scope the typecheck to the phase, and do not write a test gate as a hand-picked
  list of test files. Both let a shared-model change ship with its consumers broken, which
  surfaces as a red PR after the gate passed.
- Do not put the full suite or a build in a phase gate — those are the spec gate's, run
  once. A phase gate is two items, and every item added to it is paid n times.
- Do not omit the spec gate; a spec with no full-suite run has never had its accumulated
  diff verified as a whole.
- Do not add a CI item unless the user asked for CI gating on this spec — and when they
  do, add it to the spec gate, not to every phase.
- Do not write base branches or PR targets into a stacked spec's phases — `gh stack` owns
  the chain, and a hand-written base is the thing that goes stale after a merge.
- Do not assume the stacked model without Step 0's probe. `gh stack` is in public preview
  and gated per repository; planning a stack for a repo that can't run one strands the
  spec at its first push.
- Do not omit the phase's `Fresh review:` decision, invoke the reviewer for a phase marked
  `not required` when no end-of-phase upgrade applies, or downgrade a planned requirement.
- Do not resolve a `MODIFIED` with no baseline entry by writing the requirement yourself —
  that is the backfill, and it needs test evidence or the user's confirmation.
