<!--
  TEMPLATE — the ONLY spec-workflow content that belongs in a project's CLAUDE.md. The full
  rulebook lives at <SPECS_DIR>/RULEBOOK.md (see `rulebook.md` in this directory) and is read
  on demand by the spec skills; CLAUDE.md is loaded every session, so it carries only what
  binds an agent that never triggers one of those skills.

  Fill <SPECS_DIR> (specs root the skills glob — they hardcode `specs`), then DELETE this
  comment block before appending the section to CLAUDE.md.
  Keep the heading and the `<!-- rulebook vN -->` marker verbatim — the skills grep for both.
  Keep this stub's version in step with rulebook.md's; they upgrade together.

  Adding rules here is how CLAUDE.md bloats again. New rules go in RULEBOOK.md unless an
  agent doing ad-hoc work would damage something without them.
-->

## Spec-Driven Execution Workflow
<!-- rulebook v6 -->

Specs live in `<SPECS_DIR>/<feature>/`. Flow: `/grill-me` → `PLAN.md` → `/spec-plan` →
`EXECUTION.md` → `/spec-phase` per phase.

Binding on all work in this repo, spec skill or not:

- **Git is the authoritative state store.** Branch `<feature-slug>/phase-<n>-<desc>` encodes
  spec + phase and commits encode progress. Never infer spec state from prose, and never
  rewrite history to make it tidy.
- **One spec in flight.** Do not start or resume a second spec's phase while another has an
  unfinished one.
- **Never push, open a PR, or merge without a separate explicit ask** — regardless of what
  earlier work in the session was authorized.

Doing spec work? Read `<SPECS_DIR>/RULEBOOK.md` first — the state model (`done-with-debt`,
`[~]`, verification debt), gate lanes, branch model, checkpoints, and capability baseline are
defined there, not here. Don't improvise substitutes for those terms from this summary.
