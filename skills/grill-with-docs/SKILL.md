---
name: grill-with-docs
description: A relentless interview to sharpen a plan or design that also maintains the domain model as it goes — updating the CONTEXT.md glossary and offering ADRs the moment terms and hard-to-reverse decisions crystallise. Use when the user wants to grill a design AND capture its vocabulary/decisions durably.
disable-model-invocation: true
---

Run a `/grill-me` session while applying the `domain-modeling` skill throughout.

The grilling drives the design decisions; `domain-modeling` captures their
durable residue as they surface:

- When a term is disputed, overloaded, or newly coined during the interview,
  resolve it and write it into `CONTEXT.md` inline (glossary only — no
  implementation detail).
- When the interview lands a decision that is app-wide, hard to reverse, and a
  real trade-off, offer an ADR in `docs/adr/`. Feature-scoped decisions stay in
  the spec's `PLAN.md`, not an ADR (see `docs/DOMAIN-RULEBOOK.md`).

Verify `docs/DOMAIN-RULEBOOK.md` exists and read it — it is not in context by default,
and `CLAUDE.md` carries only a pointer stub. If it's absent, follow the `domain-modeling`
skill's setup: it handles fresh creation and migration from a pre-split inline section
(sibling skill dir: `../domain-modeling/`).

## Capability baseline

Only when the project's rulebook keeps the opt-in "Capability baseline" subsection —
otherwise skip this section entirely.

- **Read first.** Before the interview, read the capability files for the areas this feature
  touches (`specs/capabilities/<area>.md`). They state what the system already guarantees;
  grilling settled behaviour back into existence wastes the session.
- **Close with the delta.** PLAN.md ends with `## Spec Delta`: the capability it targets and
  its `### ADDED|MODIFIED|REMOVED Requirement: <title>` entries, requirements as `SHALL`
  statements with `WHEN`/`THEN` scenarios. `MODIFIED` carries the **complete** post-change
  requirement, never a diff — `spec-archive` applies it as a title-matched block swap.
  `REMOVED` says what supersedes it.
- **Backfill on contact.** When a `MODIFIED` targets behaviour the baseline doesn't describe
  yet, backfill it here, in the interview — by evidence, never by how confident you feel:
  a **passing test** pins the behaviour, so transcribe it (`Origin: backfill (test: <path>)`);
  **readable in code but untested**, draft it and get the user's explicit confirmation
  (`Origin: backfill (user-confirmed)`); **needs inferring intent**, leave it out. Backfill
  only what this feature touches — never a sweep through the codebase. A confidently written
  wrong requirement is worse than an absent one: it looks authoritative and later grills will
  trust it instead of reading the code.

Everything else about the grilling is unchanged: the output is still a
`specs/<feature>/PLAN.md` (or wherever the project's `<SPECS_DIR>` resolves to — see
`specs/RULEBOOK.md`), ready for the `spec-plan` skill.
