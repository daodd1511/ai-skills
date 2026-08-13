---
name: spec-plan
description: Turn a /grill-me PLAN.md into a phased specs/<feature>/EXECUTION.md ready for the spec-phase skill to run. Use when a grill session just produced a PLAN.md with no EXECUTION.md yet, or when the user says "make the execution plan", "break this into phases", "turn PLAN.md into an execution file".
argument-hint: "<feature-slug> — the specs/<feature-slug>/PLAN.md must already exist"
---

Produces `specs/<feature-slug>/EXECUTION.md` from `specs/<feature-slug>/PLAN.md`: plans
phases and writes the checklist, no code. Then hand off to `spec-phase` to run a phase.

The rulebook (state model, branch model, gate lanes, checkpoints) is `specs/RULEBOOK.md` —
this skill implements it, never restates it. Read it at Step 0; it is not in context by
default. The project's context file (`CLAUDE.md` / `AGENTS.md`) carries only the pointer
section mapping the specs root (`../SETUP.md`); the rules themselves never go there.

## Step 0 — Load state

1. **Read the rulebook**: `specs/RULEBOOK.md` (or the project's `<SPECS_DIR>`). Its state
   model (`done-with-debt`, `[~]`, checkpoints, parking) is defined nowhere else —
   improvised substitutes leave EXECUTION.md meaning something different to spec-phase.

   **Absent → fresh setup.** Read `../RULEBOOK-TEMPLATE.md` (sibling of this skill's
   directory) and resolve its placeholders: `<SPECS_DIR>` (specs root, default `specs`),
   `<INTEGRATION_BRANCH>` (from `git branch`), `<SPECS_INDEX_CMD>` (index-regen command, or
   delete the INDEX.md bullet if there's no generator). Decide with the user whether to keep
   the opt-in "Capability baseline", drop the `<!-- TEMPLATE -->` comment, confirm the values,
   write `specs/RULEBOOK.md`.

   *Template unreachable* — a flat install breaks `../`. Look once in this skill's directory
   and any `workflow/` beside it, then ask: a path to the file, or paste its contents.
   Neither → say setup can't finish here, point at the skills repo, stop. Never reconstruct it
   from memory: spec-phase treats whatever you write as authoritative, so an invented rulebook
   that reads plausibly surfaces phases later, as work done under rules nobody agreed to.

   **Then the context file.** Check `CLAUDE.md` and `AGENTS.md` both — which one a project
   uses is a property of the project, not of which agent you are — and read what you find; one
   is often a stub redirecting to the other, in which case edit the target. Two independently
   maintained files both need the section.

   No `<!-- spec-workflow vN -->` marker → offer to append the pointer section, resolved to
   the same `<SPECS_DIR>`. `../SETUP.md` carries the block; missing too → write it from this
   step (heading `## Spec-Driven Execution Workflow`, marker `<!-- spec-workflow v1 -->`, the
   specs-root mapping, a pointer to the rulebook). That section is what routes a `/grill-me`
   plan into `<SPECS_DIR>` instead of the repo root, and no globally installed skill can
   supply it. Offer, don't impose — it edits instructions the user's teammates read — and if
   they decline, say plainly what breaks. Rulebook plus that section is all this workflow adds;
   never grow the section with rules belonging in the rulebook.

   Do not proceed until the rulebook exists and you have read it.

   **Version check** (when it did exist): its `<!-- rulebook vN -->` marker against the
   template's. Missing or lower → say so, show what changed, offer the upgrade. Never bump a
   marker without applying the changes; a number that lies is worse than an absent one. If
   the user declines, proceed on the old rulebook and don't re-ask this session.
2. Read `specs/<feature-slug>/PLAN.md` in full. Missing → stop, ask for the slug or send the
   user to `/grill-me`.
3. If `specs/<feature-slug>/EXECUTION.md` exists with any checked-off items, stop —
   regenerating destroys execution history. Ask whether to append new phases or start over
   (start over only on an explicit say-so). Mid-phase corrections to unchecked items and gate
   scope are spec-phase's job as recorded amendments, not a reason to regenerate.
4. **One-spec-in-flight check**: one `rg -l 'in-progress' specs/*/EXECUTION.md`; don't read
   the other files in full. Another spec in `in-progress` (or uncommitted work on its branch)
   → stop; the user must finish or park it before a new spec is planned on top.
5. Resolve the **integration branch** — the rulebook's branch model names it, otherwise
   `git branch` for the convention in use. Name it explicitly in EXECUTION.md; never
   hardcode an assumption.
6. **Probe `gh stack`** — the default branch model depends on it. `gh stack view --json` at
   the repo root, read the exit code: `2` (not in a stack) means the command works and the
   repo has stacked PRs enabled → **stacked**. `9` ("not enabled for repository"), an
   unknown-command error from an older `gh`, or a non-GitHub remote → **sequential**; say
   which of those it was rather than silently downgrading. The user may ask for sequential
   outright. Record the resolved model in EXECUTION.md's header.

## Step 1 — Surface ambiguity before phasing anything

PLAN.md often ends with "Open Items" / "TBD at implementation time", or phrases decisions as
ranges ("check constraint vs. trigger — TBD"). Don't silently pick one and bake it into the
checklist: a wrong guess means rework discovered mid-phase or an unreviewed assumption
shipped in a migration.

- List every open item / unresolved mechanism in PLAN.md.
- Ask the user before writing into a checklist item anything that changes which files get
  touched, what an item says to build, or that is hard to reverse (schema/migration shape,
  id types, auth/infra choices).
- For what's genuinely inconsequential to phase structure (exact error wording), proceed and
  note the judgment call inline in the item so it's visible at execution time.

**If the project keeps a capability baseline** (rulebook → "Capability baseline"), validate
PLAN.md's `## Spec Delta` against it first: every `ADDED` title must be free in the target
capability file, every `MODIFIED`/`REMOVED` title must exist there. A colliding `ADDED`
usually means this feature contradicts an earlier one — stop and put it to the user, since
that contradiction is invisible anywhere else. A `MODIFIED` with no entry means the backfill
was skipped during the grill — stop and run it (evidence classes per rulebook), don't invent
the requirement. Derive review-checklist items from the delta's scenarios: a `WHEN/THEN` pair
converts to a manual verification step almost verbatim.

## Step 2 — Derive phase boundaries

Phases split along dependency layers, not size. Common full-stack shape (adjust to what
PLAN.md describes — don't force a phase count):

1. Schema / shared types / API — nothing downstream starts until this lands.
2. Frontend data layer — new fields/endpoints wired through, no UI.
3. Frontend UI.

Split further only where PLAN.md's own sections imply a real dependency boundary, never
because "this felt like a lot". Each phase must be independently verifiable and revertable,
because **phases stack and may not have merged** when the next one starts.

Branch name per phase: `<feature-slug>/phase-<n>-<short-desc>`. Under the default stacked
model the spec is one `gh stack` rooted at the integration branch, one branch per phase —
`spec-phase` runs `gh stack init`/`add`, so write no base branches or PR targets into
EXECUTION.md; the CLI owns the chain. Under sequential (Step 0's probe failed, or the user
asked) every phase bases off the integration branch and waits for the previous merge. Either
way the resolved model goes in EXECUTION.md's header.

## Step 3 — Write each phase's checklist and gates

Every item names the actual file(s)/function(s)/table(s), pulled from PLAN.md's own "Schema
Changes" / "API Changes" / "Frontend Changes" sections rather than re-derived. Vague items
("update the backend") are unacceptable: an agent picking the phase up cold should not have
to re-read PLAN.md to know where to start.

**Placeholders are plan failures, not shorthand.** Scan the finished checklist and fix every
hit — each defers a decision to an agent with less context than you have now: `TBD` / `TODO`
/ "decide at implementation time"; "add appropriate error handling" / "add validation" /
"handle edge cases"; "update the tests" with no named file; "same as phase N" (name the files
again — phases are read out of order on resume); any type, function, or table referenced by
no item that creates it.

**Interfaces.** Each phase declares what it consumes from earlier phases and what later ones
build on — exact exported names and signatures, not descriptions. Phases execute in separate
sessions, so phase 3's agent has no cheap way to learn what phase 2 named things; without
this it guesses, and the guess surfaces as a red typecheck two phases later. Omit either line
when genuinely empty.

Gates come in **three lanes**, two agent-owed plus the user's:

- **Phase gate (hard, every phase)**: exactly two items, kept cheap because they run n times.
  - *Typecheck*: project-wide, never scoped — it has no runtime, fixtures, or services, and
    it is what catches a shared type breaking every package that imports it. `tsc --noEmit`
    at the root (or the project's `typecheck` script); narrow only if there's no root-level
    typecheck at all, and say why in the item.
  - *Tests*: dependency-aware selection, never hand-picked paths. Prefer a runner resolving
    the reverse-dependency closure itself (`jest --findRelatedTests <files>`, `vitest related
    --run <files>`), so every test transitively importing the changes runs — including ones
    the phase never looked at. Leave the changed-file arguments for execution time; spec-phase
    fills them from the real diff. No related-tests mode → fall back to the narrowest *suite*
    containing the consumers, not a file list, and mark it a fallback.

  Never put the full suite or a build here, and never escalate a phase gate for touching
  shared surfaces — that's the spec gate's job.
- **Spec gate (hard, once — before the final phase's PR)**: at the end of EXECUTION.md, not
  inside a phase. Full local suite over the accumulated spec diff, plus a build if the changes
  can plausibly break one (config, entry points, codegen) — skip it for leaf code typecheck
  already covers. This lane exists because the import graph is least trustworthy exactly where
  specs do damage: fixtures, DI wiring, and serialized shapes carry no import edge, so
  dependency-aware selection misses them. Once at the end is one full run per spec, not per
  phase.
- **Review checklist**: manual scenarios (browser walkthroughs, visual checks) the *user*
  verifies at PR review; spec-phase copies the lane into the PR description. Never blocks
  phase completion, never becomes agent debt.

**CI is opt-in.** No `CI green on the … PR` item unless the user asks for CI gating on this
spec. When they do it is a **spec gate** item (`- [ ] CI green on the final phase PR`), never
per-phase, and spec-phase watches checks after that PR opens. Without the ask, the phase and
spec gates are the verdict.

Write concrete command(s) into every gate item — the executing agent must not have to decide
scope. Only write checks runnable in this environment; if an agent-owed check is foreseeably
environment-blocked (credentials, a live service), say so now, and at execution time it
becomes `[~]` with substitute evidence per the rulebook. Manual, agent-unrunnable checks
belong in the review lane, never a gate.

**Fresh-review decision.** Classify each phase from its planned scope using the rulebook's
hard triggers, as exactly one line: `Fresh review: required — <trigger>` or `Fresh review:
not required`. Not a third lane, no checkbox. Never invoke `fresh-review` while planning:
`spec-phase` owns invocation after the local phase gate and may upgrade `not required` from
the actual diff, never downgrade `required`.

## Step 4 — Assemble EXECUTION.md

Use this skeleton exactly — don't copy the shape from older `specs/*/EXECUTION.md` files,
which predate v2 and carry stale conventions:

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

**Keep it terse.** EXECUTION.md is re-read at the start of every spec-phase session, so every
line is a recurring cost for the life of the spec. One line per item, one line of phase
rationale. Never paste PLAN.md's prose or restate its reasoning — reference its sections by
name (`per PLAN.md → "Schema Changes"`) and let the executing agent open that section only
when an item alone is ambiguous.

Write the file. No branches, no code.

## Step 5 — Hand off

Report: number of phases, what each covers, the Step 1 open items and how they resolved. Ask
whether to proceed into Phase 1 via `spec-phase` — never auto-start; starting a phase needs
the explicit go-ahead `spec-phase`'s own procedure requires.

## Do not

- Invent scope beyond what PLAN.md decided. Something feels missing → ask whether it belongs
  in this feature or is out of scope; don't quietly add it.
- Silently resolve an "Open Items" entry touching schema, auth, or anything hard to reverse.
- Regenerate an EXECUTION.md with checked-off progress without explicit confirmation.
- Scope the typecheck to the phase, or write the test gate as hand-picked files — both let a
  shared-model change ship with its consumers broken, surfacing as a red PR after the gate
  passed.
- Omit the spec gate: a spec with no full-suite run has never had its accumulated diff
  verified as a whole.
- Write base branches or PR targets into a stacked spec — `gh stack` owns the chain, and a
  hand-written base goes stale after a merge.
- Assume the stacked model without Step 0's probe. `gh stack` is in public preview and gated
  per repository; planning a stack a repo can't run strands the spec at its first push.
- Omit a phase's `Fresh review:` line, invoke the reviewer for a `not required` phase absent
  an end-of-phase upgrade, or downgrade a planned requirement.
- Resolve a `MODIFIED` with no baseline entry by writing the requirement yourself — that is
  the backfill, and it needs test evidence or the user's confirmation.
