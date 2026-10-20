---
name: pr-create
description: >
  Write a pull request title and description for a reviewer who already knows the project,
  then open or update the PR as a draft after one confirmation. Use when the user says
  "open a PR", "create a PR", "write the PR description", "update the PR description",
  or invokes /pr-create. Its references/description.md is the PR-description standard
  that other skills, such as spec-phase, follow.
---

A PR description exists for one reader: a reviewer who knows the project. It tells that
reader why the change should exist and where to look hardest. Every sentence must tell the
reviewer something that the diff, title, commits, and CI do not.

Run the steps in order. Do not write any description text before step 3.

## 1. Find the base and the existing PR

- Existing PR for the branch: `gh pr view --json number,baseRefName,body,title,isDraft`.
  If one exists, this run updates it.
- Stack branch: if `gh stack view --json` lists the current branch, the base is the
  branch below it. Stack mechanics belong to the `gh-stack` skill and the project's
  rulebook, if present.
- Otherwise the base is the default branch: `gh repo view --json defaultBranchRef`.

Uncommitted changes → stop and say so. Commits go through `terse-commit`; this skill never
commits.

## 2. Check size and scope

Count changed lines with `git diff --numstat -M <base>...HEAD` (added plus deleted).
Exclude these, and report how many lines each exclusion removed:

- Lockfiles: `package-lock.json`, `pnpm-lock.yaml`, `yarn.lock`, `Cargo.lock`,
  `poetry.lock`, `uv.lock`, `go.sum`, `Gemfile.lock`, `composer.lock`.
- Generated code: paths that `.gitattributes` marks `linguist-generated`, plus `dist/`,
  `build/`, `*.min.*`, and `*.generated.*`.
- Snapshots: `__snapshots__/` and `*.snap`.
- Pure renames: `numstat` reports them as `0 0`.

Tests count toward the total. Report the test lines separately so that the user can judge.

Warn before you write anything when either condition holds:

- The counted total exceeds **1,000 lines**.
- The diff mixes unrelated concerns, such as a refactor, a feature, and an unrelated fix.

The warning gives the counted total, the exclusions, the test lines, and each concern with
its line count. It proposes split points, as a `gh-stack` stack when the pieces depend on
each other. Then ask one question: split, or proceed as one PR? Never block, and never
split the branch yourself.

If the user proceeds with mixed concerns, the description lists each concern in review
order (see `references/description.md`).

## 3. Collect the facts

**Why.** Take the reason for the change from these sources, in order:

1. The current conversation.
2. The linked issue or ticket. Read the ID from the branch name (`[A-Z]+-[0-9]+`), then
   `gh issue view` or the ticket the user provides.
3. Commit message bodies on the branch: `git log --format='%s%n%b' <base>..HEAD`.
4. A spec or `PLAN.md` for the feature, if one exists.

If none of them gives a real reason, ask the user for it in one question. Never infer a
motive from the code. A false premise misdirects the whole review.

**Code.** Read the source changes, not only the stat. Record:

- Decisions and the alternatives the author rejected, with reasons. Take them only from
  the sources above; never invent a rejected alternative.
- The risky lines, as `path:line` at the head commit.
- The mechanical parts that are safe to skim: renames, moves, formatting, generated code.
- Behavior changes for callers outside the feature, especially in shared code.
- Breaking changes, migrations, configuration or environment changes, and deploy order.
- Whether the diff changes UI: components, templates, or styles.

## 4. Write the description

Follow `references/description.md`. Check for a project template first, in the locations
GitHub reads: `.github/pull_request_template.md`, `.github/PULL_REQUEST_TEMPLATE/`,
`docs/pull_request_template.md`, and `pull_request_template.md` at the root. Matching is
case-insensitive. A template wins over the default sections.

## 5. Write the title

1. Apply the `terse-commit` subject rules for the repo's mode. A squash merge turns the
   title into a commit subject.
2. Check merged titles: `gh pr list --state merged --limit 20 --json title`. The repo's
   pattern wins over step 1, including any numbering that its stacks use, such as
   `RD-261 / Create Patient 2 - Date Picker Field`.

## 6. Confirm, then open or update

1. Write the body to a scratch file.
2. Show the title, the body, the base branch, and the action you will take.
3. For an existing PR, also show what changes from the current title and body. The user
   may have edited them by hand.
4. Ask one question, such as "Push `<branch>` and open as a draft PR against `<base>`?"
5. On a yes, take exactly one of these actions:
   - **New PR:** `git push -u origin <branch>` if the branch has no upstream, then
     `gh pr create --draft --base <base> --title '<title>' --body-file <path>`.
   - **Existing PR:** `gh pr edit <n> --title '<title>' --body-file <path>`. Leave its
     draft state alone.
   - **Stack branch:** create or push the PRs through `gh-stack` and the rulebook. Then
     set the title and body on this branch's PR only, with `gh pr edit --body-file`.
6. Open the PR as ready, not draft, only when the user asked for that.
7. Report the PR URL. If the body has screenshot placeholders, tell the user how many
   images to add before marking the PR ready. `gh` cannot attach images.

## Never

- `--body` instead of `--body-file`. Shell quoting mangles a multi-line body.
- AI attribution, "Generated with" footers, or emoji.
- A push, PR creation, or PR edit without the confirmation in step 6.
- A force-push, or an edit to another PR in a stack.
