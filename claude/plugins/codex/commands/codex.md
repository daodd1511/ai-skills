---
description: Delegate a task to OpenAI Codex CLI and return its output.
argument-hint: <prompt>
allowed-tools: [Bash]
---

# codex

Run OpenAI's Codex CLI non-interactively on the user's prompt.

Arguments: $ARGUMENTS

## Instructions

1. Run `codex exec` with the full argument text as the prompt:
   ```
   codex exec --skip-git-repo-check "$ARGUMENTS" < /dev/null
   ```
   - If `$ARGUMENTS` is empty, ask the user what they want Codex to do instead of running the command.
   - Preserve the user's working directory context — run from the current directory (codex operates on cwd by default).
   - `< /dev/null` is required — `codex exec` blocks waiting on stdin otherwise.
   - `--skip-git-repo-check` is only needed outside a git repo; harmless to always include.
2. Stream/return codex's output verbatim to the user.
3. If `codex` exits non-zero or is not found on PATH, report the exact error — do not silently retry or fall back to solving the task yourself.

## Notes

- This shells out to the real `codex` CLI (`codex-cli`), not a simulation. It must be installed and authenticated (`codex login`) for this to work.
- Use `codex exec --full-auto "$ARGUMENTS"` only if the user explicitly asks for autonomous/sandboxed execution of file edits; otherwise use the default (safer) mode.
