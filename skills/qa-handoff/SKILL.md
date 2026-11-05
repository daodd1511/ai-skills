---
name: qa-handoff
description: >
  Write the "ready for QA" Jira comment for a feature ticket whose pull requests have
  merged, then post it with acli after one confirmation. The comment tells QA what changed,
  what the ticket delivers, what is easy to miss, and what is not there yet, and never tells
  QA how to test. An independent pass reads the ticket without the code, so a gap report
  shows the developer what is missing before QA sees anything. Use when the user says "ready for QA", "write the QA comment",
  "hand off <KEY> to QA", or invokes /qa-handoff <KEY>. Not for bug tickets, retest
  comments, or other Jira comments.
---

A QA handoff comment exists for one reader: a QA engineer who knows the product but not
the code. **Our mission is only to give QA enough information about what we did and what
we provide. QA decides what to test and how.** The comment describes changes, features,
and behavior as facts. It never contains test steps, test cases, checkboxes, or a testing
priority. `references/qa-comment.md` is the standard for every line you write.

The developer's view is the risk. A description written from the diff only repeats what
was built. So pass 1 lists the requirements from the ticket alone, in a fresh context, and
pass 2 compares them with the code. The gaps go to the user before anything goes to QA.

Run the steps in order. Do not draft comment text before step 7.

## Inputs

- A ticket key, such as `SHOP-7`. Without one, ask for it.
- Overrides, each valid for this run only and only when the user asks for it explicitly:
  - `include open PRs`: draft from open and draft PRs as well as merged ones.
  - `pass1=cheap`: run pass 1 on the host's smallest model.
  - `not a feature`: run on a Bug ticket.

Keep working files in the host's scratch directory, or in `mktemp -d` when it has none.
Never write them into the repository. `scripts/` and `references/` paths are relative to
this skill's directory; the scripts need only Python 3.

## 1. Read the ticket

1. `acli jira auth status` gives the site and the user's email.
2. `acli jira workitem view <KEY> --fields summary,issuetype,status,description,comment --json > ticket.json`.
3. Stop in either case:
   - The issue type is Bug, and the user did not say `not a feature`. Say that this skill
     writes feature test plans, and a bug needs reproduction steps and the fix instead.
   - A comment by the user's email starts with "Changes are available on dev". Say that a
     handoff exists, give its date, and ask what to do. Never edit or replace it.

## 2. Find the pull requests

1. Search the current repository, or the one the user names with `--repo`:
   `gh pr list --search "<KEY>" --state all --limit 50 --json number,title,body,state,isDraft,mergedAt,mergeCommit,url`.
2. Keep a PR only if its title or body contains the key as a whole token. `SHOP-7` must
   not match `SHOP-71`.
3. Show the list in four groups. The first two hold PRs whose title contains the key.
   - **Merged:** number, title, merge date.
   - **Open or draft.**
   - **Mentions only:** the key is in the body but not the title. Later tickets often
     cite earlier ones ("based on SHOP-7"). These are left out unless the user adds them.
   - **Closed without merge:** these are left out.
4. Ask the user to confirm the list.
5. If any PR is open or draft and the user did not say `include open PRs`, stop. List them
   and ask: wait, or draft from the merged PRs only? If the user chooses merged only, list
   the open PRs' work in `Known limitations`. With the override, mark each open PR as
   unmerged in the confirmed list. The line "Changes are available on dev" is then the
   user's claim.

## 3. Check the size

Sum additions and deletions from `gh pr view <n> --json files` for each confirmed PR.
Exclude lockfiles, generated code, snapshots, and pure renames, as `pr-create` step 2
defines them. Below 200 lines, warn that the skill is built for large feature tickets and
ask whether to continue. This is a warning, not a stop.

## 4. Pass 1: requirements from the ticket

1. `python3 scripts/packet.py ticket.json --exclude-email <user email> > packet.md`.
2. Read `packet.md`. If the description has no acceptance criteria, rules, or behavior,
   tell the user that pass 1 will be thin and why. Continue only if the user agrees.
3. Delegate pass 1 exactly as `references/pass1-contract.md` says. If the host cannot
   start a fresh context, stop as that file says.

## 5. Pass 2: compare with the code

Read the PR bodies and `gh pr diff <n>` for each confirmed PR. Read the diff only for what
QA can observe: pages, routes, UI strings, roles and permission checks, validation rules,
displayed states, limits, timing, and exports.

1. **Map each pass-1 requirement** to the change that implements it. Note the exact UI
   strings the code shows.
2. **Collect the delivered features:** where each one is, what it shows, what it does,
   and how it differs per role.
3. **Collect what is easy to miss:** behavior a reader of the ticket would not guess.
   Look for asynchronous work and its timing, maximums and other limits, state that
   persists or resets, locks such as one action at a time, error placement, exact export
   values, and differences from the design.
4. **Mark built-but-not-required behavior:** each observable behavior with no pass-1
   requirement. It is written as "(not in the ticket)" in the comment.
5. **Find shared code effects.** List the changed files outside the feature's own
   directory, such as shared components, hooks, utilities, and styles. For each one, find
   its other users with `rg -l` on its import name. Write down each visible change on
   another page as a fact, such as "All tables now have a border." Write nothing for a
   shared change with no visible effect.
6. **Find backend dependencies** in the packet's linked backend tickets and in the PR
   bodies. Note each feature that needs one as `(needs <KEY> on dev)`.
7. **Collect limitations** from the PR bodies: deferred work, placeholders, disabled
   controls, all-or-nothing rules, and API gaps. Each one names its owning ticket when the
   PR body or packet gives one.
8. **Find test data facts:** which data gives which outcome, which systems the team does
   not control, and anything that uses up test data.

## 6. Gap report

Show the user this report before drafting. QA never sees it.

- **Required, not found in the code:** each pass-1 requirement with no matching change.
  The user chooses for each one: fix it first, move it to `Known limitations` with a
  reason, or point to the code that implements it. Never drop one silently.
- **Built, not required:** each behavior from step 5.4. Confirm that each is intended.
- **Unclear:** from pass 1. Each becomes a question for the product owner, never a line
  in the comment.
- **Missing setup:** accounts, roles, or data states that QA needs and that no source
  explains. Ask the user. Never invent account names or data.
- **Design links not read:** from pass 1. Ask whether the user wants to paste notes from
  any of them.

Wait for the user's answers, then apply them.

## 7. Draft

1. Write `draft.md` following `references/qa-comment.md`. The version line uses the newest
   merged PR's `mergeCommit.oid`, shortened to 7 characters, and its merge date.
2. Check the draft against the standard:
   - It contains no test instructions ("verify", "check that", "make sure", "try") and no
     test structure (case IDs, checkboxes, ✅ or ❌, `→` pairs, source tags, "Focus first").
   - Every role difference, data-isolation rule, and limit from step 5 is stated.
   - Every shared code effect from step 5.5 is stated as a fact.
   - No limitation sits under the delivered features.
   - No line uses code words or "works", "correctly", or "as expected".
3. Run `python3 scripts/md2adf.py convert draft.md > draft.adf.json`. Fix the draft if it
   reports unsupported Markdown.

## 8. Confirm, then post

1. Show the draft and the ticket key.
2. Ask one question: "Post this comment to `<KEY>`?" Each edit round shows the draft again.
3. On a yes: `acli jira workitem comment create --key <KEY> --body-file draft.adf.json`.
4. Verify the post:
   1. Fetch the comments again with step 1's `view` command.
   2. Take the user's newest comment and save it to `posted.json`.
   3. Compare `python3 scripts/md2adf.py outline posted.json` with the outline of
      `draft.md`. On any difference, show both outlines. Do not post again.
5. Report `https://<site>/browse/<KEY>?focusedCommentId=<comment id>`.

## Never

- Post, edit, or delete a comment without the confirmation in step 8.
- Change the ticket status, assignee, or any other field.
- @mention anyone.
- Run pass 1 in this context, or give pass 1 anything beyond the packet and the brief.
- Tell QA how to test: no test steps, test cases, checkboxes, or testing priority.
- Put file paths, code identifiers, or reviewer notes into the comment.
- Post with `--body` instead of `--body-file`. Shell quoting breaks a multi-line body.
- Add AI attribution, "Generated with" footers, or emoji.
