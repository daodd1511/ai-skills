#!/usr/bin/env bash
# Symlinks curated skills/agents/instruction files from this repo into
# ~/.claude, ~/.agents, and ~/.codex, per links.txt. Idempotent: safe to re-run.
#
# First-time adoption: if the install path already has a real file/dir
# (not a symlink) and the repo copy doesn't exist yet, move it into the
# repo first, then re-run this script to link it back.

set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LINKS_FILE="$REPO_DIR/links.txt"

while IFS= read -r line; do
  [[ -z "$line" || "$line" == \#* ]] && continue

  repo_rel="${line%% -> *}"
  install_raw="${line##* -> }"
  install_path="${install_raw/#\~/$HOME}"
  repo_path="$REPO_DIR/$repo_rel"

  if [[ ! -e "$repo_path" ]]; then
    echo "SKIP (missing in repo): $repo_rel"
    continue
  fi

  if [[ -L "$install_path" ]]; then
    current_target="$(readlink "$install_path")"
    if [[ "$current_target" == "$repo_path" ]]; then
      echo "OK (already linked): $install_path"
      continue
    else
      echo "REPLACE (stale symlink): $install_path"
      rm "$install_path"
    fi
  elif [[ -e "$install_path" ]]; then
    echo "SKIP (real file exists, not a symlink — resolve manually): $install_path"
    continue
  fi

  mkdir -p "$(dirname "$install_path")"
  ln -s "$repo_path" "$install_path"
  echo "LINKED: $install_path -> $repo_path"
done < "$LINKS_FILE"
