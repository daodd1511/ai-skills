<!--
  TEMPLATE — the ONLY domain-model content that belongs in a project's context file
  (CLAUDE.md, AGENTS.md, or whichever the project's agents load; see ../../SETUP.md for
  picking one when there are several). The full rulebook lives at docs/DOMAIN-RULEBOOK.md
  (see `rulebook.md` in this directory) and is read on demand by the domain-modeling and
  grill-with-docs skills; the context file is loaded every session, so it carries only what
  binds an agent that never triggers one of those skills.

  DELETE this comment block before appending the section.
  Keep the heading and the `<!-- domain-rulebook vN -->` marker verbatim — the skills grep
  for both. Keep this stub's version in step with rulebook.md's; they upgrade together.

  Adding rules here is how a context file bloats again. New rules go in DOMAIN-RULEBOOK.md
  unless an agent writing ordinary code or copy needs them.
-->

## Domain Model & Decisions
<!-- domain-rulebook v1 -->

`CONTEXT.md` (repo root) is the project's glossary. Use its canonical terms — and avoid the
synonyms it marks `_Avoid_` — in code, docs, specs, and UI copy. It is a glossary only:
never add schema, file references, or implementation detail to it.

Recording a new term, or a decision worth keeping? Read `docs/DOMAIN-RULEBOOK.md` first — it
routes between `CONTEXT.md`, `docs/adr/`, and a spec's `PLAN.md`, and defines what does and
doesn't qualify as an ADR.
