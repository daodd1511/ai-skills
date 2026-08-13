# Spec workflow — per-project setup

The skills in this folder install globally (`~/.claude/skills/`, `~/.agents/skills/`), but
the thing they need most is per-project: **where this project keeps its specs**. Nothing in
a globally installed skill can know that, so each project states it once, in the context
file its agents load every session.

"Context file" means whichever of these the project actually uses — `CLAUDE.md` (Claude
Code), `AGENTS.md` (Codex and most other agents), or both. The workflow doesn't care which,
only that the section below is in whatever gets loaded.

Skip this and the workflow still half-works, in the worst way: `/grill-me` runs a full
interview, then writes `PLAN.md` to the repo root next to `package.json`, because nothing
told it a `specs/` directory is part of the deal. `/spec-plan` then can't find it and tells
you to run `/grill-me` — which you just did.

## The one-time step

Append this to the project's context file, replacing `<SPECS_DIR>` with the specs root
(`specs`, or `docs/specs` — whatever the repo prefers). Keep the heading and the
`<!-- spec-workflow v1 -->` marker verbatim; the skills grep for both.

```markdown
## Spec-Driven Execution Workflow
<!-- spec-workflow v1 -->

Specs live in `<SPECS_DIR>/<feature-slug>/`. Flow: `/grill-me` → `PLAN.md` →
`/spec-plan` → `EXECUTION.md` → `/spec-phase` per phase.

A grill session that lands a plan writes it to `<SPECS_DIR>/<feature-slug>/PLAN.md` —
never to the repo root. Create the directory if it doesn't exist yet.

Doing spec work? Read `<SPECS_DIR>/RULEBOOK.md` first — the state model
(`done-with-debt`, `[~]`, verification debt), gate tiers, branch model, checkpoints, and
capability baseline are defined there, not here. Don't improvise substitutes for those
terms from this summary.
```

### Which file, when the project has several

- **One context file** — put it there.
- **`AGENTS.md` redirects to `CLAUDE.md`** (or the reverse) — a one-line "refer to
  @CLAUDE.md" stub is the common shape. Edit the file that holds the real content; the
  redirect carries it. Don't duplicate the section into both — two copies drift, and the
  marker check will start finding the stale one.
- **Both are real, independently maintained files** — the section goes in both, identical.
  Whichever an agent loads, it needs the mapping.

That is the whole mapping. Everything else about the workflow lives in
`<SPECS_DIR>/RULEBOOK.md`, which `/spec-plan` writes for you on first run — the section
above is a pointer, not a copy. Adding rules to it is how a context file bloats: new rules
go in the rulebook, which is read on demand and costs nothing in sessions doing ordinary
work.

Using `domain-modeling` or `/grill-with-docs` as well? Those need a second, independent
pointer — see `domain-modeling/references/context-file-stub.md` for the block, and
`domain-modeling/references/rulebook.md` for the `docs/DOMAIN-RULEBOOK.md` it points at.

## Then, first spec

1. Run `/spec-plan` once. Finding no `<SPECS_DIR>/RULEBOOK.md`, it resolves the
   placeholders with you (specs root, integration branch, index command, whether to keep
   the opt-in capability baseline) and writes the file. That plus the context-file section
   above are the only two things the workflow adds to a project.
2. From then on: `/grill-me` a feature, `/spec-plan` to phase it, `/spec-phase` to run
   each phase, `/spec-archive` when the last one merges.

## Verifying it took

Run a short `/grill-me` on any small idea and see where the plan lands. If it writes
`<SPECS_DIR>/<feature-slug>/PLAN.md`, the mapping is live. A root-level `PLAN.md` means the
section is missing, misspelled, or sitting in a file that agent doesn't load — check
nesting (a context file in a subpackage does not apply to the whole repo) and check that
you edited the file this particular agent reads.

## Why `/grill-me` isn't in this folder

It stays deliberately agnostic. Grilling is useful on its own — a decision, a design, a
thing with no repo behind it at all — and hardcoding a specs path into it would drag the
whole spec workflow into projects that never wanted it. The path belongs to projects that
opted in, which is exactly what the section above is.

## Skills in this folder

| Skill | Role |
|---|---|
| grill-with-docs | `/grill-me` plus domain-model upkeep — glossary and ADRs as terms crystallise |
| domain-modeling | Owns `CONTEXT.md` (glossary) and `docs/adr/`; its own rulebook, separate from the spec one |
| spec-plan | PLAN.md → phased `EXECUTION.md`; also bootstraps `RULEBOOK.md` on first run |
| spec-phase | Runs one phase: branch, implement, gates, checkpoints |
| spec-archive | Folds a finished spec's `## Spec Delta` into the capability baseline |
