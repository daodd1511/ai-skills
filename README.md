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
| grill-me | Interview/stress-test a plan until resolved |
| handoff | Compact a conversation into a handoff doc |
| teach | Teach a concept within the current workspace |
| terse-commit | Ultra-compressed commit message generator |
| angular-frontend-developer | Angular frontend scaffold |
| react-frontend-developer | React frontend scaffold |
| vue-frontend-developer | Vue frontend scaffold |
| spec-plan | Turn a /grill-me PLAN.md into a phased EXECUTION.md |
| spec-phase | Drive phased execution of a spec (start/resume phases) |

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
