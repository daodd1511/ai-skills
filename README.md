# ai-skills

Personal library of authored Claude Code / Codex skills, agents, and
instruction files. Private repo, live-synced via symlinks — this repo is
the source of truth; `~/.claude`, `~/.agents`, and `~/.codex` hold symlinks
pointing here.

No settings, credentials, or machine state live here (see decisions below).

## Layout

```
skills/     - authored skills, shared across agents: symlinked into both
              ~/.claude/skills/<name> and ~/.agents/skills/<name> (the
              latter is a shared cross-provider location — Codex and
              others resolve skills from there; see links.txt)
  workflow/ - the spec-driven workflow: skills that only make sense
              together, plus the two files shared across them
              (SETUP.md, RULEBOOK-TEMPLATE.md). Install paths are
              flat regardless of nesting (~/.claude/skills/spec-plan,
              not .../workflow/spec-plan); skills reach the shared
              files as ../<file>, which resolves through the symlink
              back into this folder. Start at SETUP.md when adopting
              the workflow in a repo.
claude/
  agents/   - subagent definitions, symlinked into ~/.claude/agents/<name>.md
  plugins/  - authored plugins (own .claude-plugin manifest), symlinked
              into ~/.claude/skills/<name>
  CLAUDE.md - symlinked into ~/.claude/CLAUDE.md
codex/
  AGENTS.md - symlinked into ~/.codex/AGENTS.md
```

## What's in here

| Skill | Notes |
|---|---|
| grill-me | Interview/stress-test a plan until resolved (deliberately spec-agnostic) |
| handoff | Compact a conversation into a handoff doc |
| teach | Teach a concept within the current workspace |
| terse-commit | Ultra-compressed commit message generator |
| angular-frontend-developer | Angular frontend scaffold |
| react-frontend-developer | React frontend scaffold |
| vue-frontend-developer | Vue frontend scaffold |
| fresh-review | Fresh-context read-only review of a risky change, on request |
| visualize | Pick the right visual form for data/findings, render as self-contained HTML |
| bro | Restate the last message in plain language, no jargon (`/bro` only) |
| eli5 | Explain a topic to a total beginner as a self-contained HTML page: big pictures, few words |

`skills/workflow/` — the spec-driven workflow, five skills that run as one
pipeline. Setup and the context-file section each project must add
(`CLAUDE.md`, `AGENTS.md`, or both) are in `skills/workflow/SETUP.md`.

| Skill | Notes |
|---|---|
| grill-with-docs | grill-me, plus it maintains the domain model as it goes |
| domain-modeling | Pin down the ubiquitous language; record ADRs |
| spec-plan | Turn a /grill-me PLAN.md into a phased EXECUTION.md |
| spec-phase | Drive phased execution of a spec (start/resume phases) |
| spec-archive | Fold a finished spec's delta into the capability baseline |

`claude/agents/code-locator.md` — read-only subagent for locating code
(file:line lookups) without proposing fixes.

`claude/plugins/codex` — `/codex` command + subagent that shells out to
the OpenAI Codex CLI (`codex exec`). Self-authored, packaged as a plugin
(has its own `.claude-plugin/plugin.json`) rather than a plain skill.

## Deliberately excluded

- **caveman**, **frontend-design** — these came from marketplaces/official
  Anthropic skill packages, not authored here.
- **settings.json / config.toml / auth.json** — secrets and machine-specific
  paths; never committed.

## Bootstrap (new machine)

```
git clone <repo-url> ~/dev/personal/ai-skills
~/dev/personal/ai-skills/bootstrap.sh
```

Reads `links.txt` and symlinks each repo path into its install path.
Idempotent — safe to re-run. If an install path already holds a real file
(not a symlink), the script skips it; move that file into the repo first
(matching the repo-relative path in `links.txt`), then re-run.
