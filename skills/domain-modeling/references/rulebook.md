<!--
  TEMPLATE — domain-model rulebook. Canonical source for a project's
  docs/DOMAIN-RULEBOOK.md. It lives in its own file, NOT in CLAUDE.md: the domain-modeling
  and grill-with-docs skills read it on demand when they run, so sessions doing ordinary work
  don't carry it. CLAUDE.md gets the short stub in `claude-md-stub.md` instead.

  Fill the placeholder, then DELETE this comment block before writing the file:
    <SPECS_DIR>   specs root the spec-plan/spec-phase skills use (e.g. `docs/specs`).
                  If the project has no spec workflow, replace the third bullet's
                  path with wherever feature-scoped decisions should live instead.
  Keep the `<!-- domain-rulebook vN -->` marker verbatim — it is how the skills detect that a
  project's copy has fallen behind this template. Never hand-edit the number in a project.
  Bump the version here AND in claude-md-stub.md whenever either changes.

  The stub repeats the "use the canonical terms" rule on purpose — it binds anyone writing
  code or copy, not just this skill. Do not "deduplicate" it out of either place.
-->

# Domain Model & Decisions
<!-- domain-rulebook v1 -->

Three homes for terminology and decisions — keep them from bleeding into each
other. The `domain-modeling` skill (and `grill-with-docs`, which folds it into a
grilling session) maintains the first two.

- **`CONTEXT.md`** (repo root) — the ubiquitous-language glossary, and nothing
  else. Use its canonical terms (and avoid the `_Avoid_` synonyms) in code,
  docs, specs, and UI copy. It is devoid of implementation detail: no schema, no
  file references, no "how it works". Add or sharpen a term the moment grilling
  resolves one; never let it become a spec or scratchpad.
- **`docs/adr/`** — one short ADR per **app-wide** decision that is hard to
  reverse, surprising without context, and the result of a real trade-off (all
  three, or it is not an ADR). A handful, ever. Numbered `NNNN-slug.md`, 1–3
  sentences.
- **`<SPECS_DIR>/<feature>/PLAN.md` "Decisions"** — feature-scoped choices that live
  and die with the spec. The default home. If a decision only matters inside one
  feature, it stays here and does **not** become an ADR.
