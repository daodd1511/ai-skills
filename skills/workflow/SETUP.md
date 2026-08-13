# Spec workflow — per-project setup

These skills install globally (`~/.claude/skills/`, `~/.agents/skills/`), but what they need
most is per-project: **where this project keeps its specs**. No globally installed skill can
know that, so each project states it once, in the context file its agents load every session
— `CLAUDE.md`, `AGENTS.md`, or both. The workflow doesn't care which, only that the section
below is in whatever gets loaded.

Skip it and the workflow half-works, in the worst way: `/grill-me` runs a full interview,
then writes `PLAN.md` to the repo root next to `package.json`, because nothing told it a
`specs/` directory is part of the deal. `/spec-plan` then can't find it and tells you to run
`/grill-me` — which you just did.

## The one-time step

Append this to the project's context file, replacing `<SPECS_DIR>` with the specs root
(`specs`, `docs/specs`, whatever the repo prefers). Keep the heading and the
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

**Which file, when a project has several:** one context file → put it there. One redirecting
to the other (`refer to @CLAUDE.md`) → edit the file holding the real content; don't
duplicate, since two copies drift and the marker check starts finding the stale one. Both
real and independently maintained → identical section in both.

That is the whole mapping. Everything else lives in `<SPECS_DIR>/RULEBOOK.md`, which
`/spec-plan` writes on first run — the section above is a pointer, not a copy. Adding rules
to it is how a context file bloats; new rules go in the rulebook, read on demand, free in
sessions doing ordinary work.

Using `domain-modeling` or `/grill-with-docs` too? They need a second, independent pointer:
`domain-modeling/references/context-file-stub.md` has the block,
`domain-modeling/references/rulebook.md` the `docs/DOMAIN-RULEBOOK.md` it points at.

## Then, first spec

Run `/spec-plan` once. Finding no `<SPECS_DIR>/RULEBOOK.md`, it resolves the placeholders
with you (specs root, integration branch, index command, opt-in capability baseline) and
writes the file — that plus the section above are the only two things this workflow adds to
a project. From then on: `/grill-me` a feature, `/spec-plan` to phase it, `/spec-phase` per
phase, `/spec-archive` when the last merges.

**Verify it took** by running a short `/grill-me` on any small idea and seeing where the plan
lands. `<SPECS_DIR>/<feature-slug>/PLAN.md` means the mapping is live. A root-level `PLAN.md`
means the section is missing, misspelled, or in a file that agent doesn't load — check
nesting (a context file in a subpackage doesn't apply repo-wide) and check you edited the
file this particular agent reads.

## Why `/grill-me` isn't in this folder

It stays deliberately agnostic. Grilling is useful on its own — a decision, a design, a thing
with no repo behind it — and hardcoding a specs path into it would drag the whole workflow
into projects that never wanted it. The path belongs to projects that opted in, which is what
the section above is.

## What's in this folder

Two shared files sit beside the skills, describing the workflow rather than any one step:
`SETUP.md` (this guide) and `RULEBOOK-TEMPLATE.md`, the canonical source for a project's
`<SPECS_DIR>/RULEBOOK.md` — `spec-plan` fills its placeholders at first run, `spec-phase`
reads its `<!-- rulebook vN -->` marker to spot a project on a stale copy.

Skills reach both as `../<file>`, which resolves through the symlink into this folder from
`~/.claude/skills/<name>` as well as in the repo: `..` follows a symlink's target, not the
link's parent.

**Installing some other way?** Copying one skill folder alone, or vendoring into a project's
`.claude/skills/`, leaves those `../` paths dangling. Nothing degrades silently — `spec-plan`
asks you for the template (a path, or paste it) and refuses to invent a rulebook; `spec-phase`
skips its version check and says so. To avoid the prompt, keep the `workflow/` shape: copy the
whole folder, or symlink per-skill as `bootstrap.sh` does.

| Skill | Role |
|---|---|
| grill-with-docs | `/grill-me` plus domain-model upkeep — glossary and ADRs as terms crystallise |
| domain-modeling | Owns `CONTEXT.md` (glossary) and `docs/adr/`; its own rulebook, separate from the spec one |
| spec-plan | PLAN.md → phased `EXECUTION.md`; also bootstraps `RULEBOOK.md` on first run |
| spec-phase | Runs one phase: branch, implement, gates, checkpoints |
| spec-archive | Folds a finished spec's `## Spec Delta` into the capability baseline |
