---
name: qa-handoff
description: >
  Write the "ready for QA" Jira comment for a feature ticket whose pull requests have
  merged, then post it with acli after one confirmation. Cases come from the ticket first,
  through an independent pass that never sees the code, so the comment also shows QA what
  the developer missed. Use when the user says "ready for QA", "write the QA comment",
  "hand off <KEY> to QA", or invokes /qa-handoff <KEY>. Not for bug tickets, retest
  comments, or other Jira comments.
---

A QA handoff comment exists for one reader: a QA engineer who knows the product but not
the code. That reader copies the test sections, marks each case ✅ or ❌, and files bugs
against case IDs. `references/qa-comment.md` is the standard for every line you write.

The developer's view is the risk. Cases written from the diff only confirm what was built.
So pass 1 writes cases from the ticket alone, in a fresh context, and pass 2 compares them
with the code. The gaps go to the user before anything goes to QA.

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
   the open PRs' work in `Not in this ticket`. With the override, mark each open PR as
   unmerged in the confirmed list. The line "Changes are available on dev" is then the
   user's claim.

## 3. Check the size

Sum additions and deletions from `gh pr view <n> --json files` for each confirmed PR.
Exclude lockfiles, generated code, snapshots, and pure renames, as `pr-create` step 2
defines them. Below 200 lines, warn that the skill is built for large feature tickets and
ask whether to continue. This is a warning, not a stop.

## 4. Pass 1: cases from the requirements

1. `python3 scripts/packet.py ticket.json --exclude-email <user email> > packet.md`.
2. Read `packet.md`. If the description has no acceptance criteria, rules, or behavior,
   tell the user that pass 1 will be thin and why. Continue only if the user agrees.
3. Delegate pass 1 exactly as `references/pass1-contract.md` says. If the host cannot
   start a fresh context, stop as that file says.

## 5. Pass 2: compare with the code

Read the PR bodies and `gh pr diff <n>` for each confirmed PR. Read the diff only for what
QA can observe: UI strings, routes, validation rules, roles and permission checks, and
displayed states.

1. **Map each pass-1 case** to the change that implements it. Correct the expected result
   to the exact UI string the code shows. Keep the case's `[AC]` or `[design]` tag.
2. **Add `[impl]` cases** for observable behavior with no pass-1 case. Mark each one
   `(not in ticket)`.
3. **Find regression scope.** List the changed files outside the feature's own directory,
   such as shared components, hooks, utilities, and styles. For each one, find its other
   users with `rg -l` on its import name. Write one `[regression]` case per affected page.
   Group pages that share one changed file only when the action and result are the same.
4. **Find backend dependencies** in the packet's linked backend tickets and in the PR
   bodies. Tag the dependent cases `(needs <KEY> on dev)`.
5. **Collect limitations** from the PR bodies: deferred work, disabled controls, and API
   gaps. Each one names its owning ticket when the PR body or packet gives one.

## 6. Gap report

Show the user this report before drafting. QA never sees it.

- **Required, not found in the code:** each pass-1 case with no matching change. The user
  chooses for each one: fix it first, move it to `Not in this ticket` with a reason, or
  point to the code that implements it. Never drop one silently.
- **Built, not required:** each `[impl]` case. Confirm that each is intended.
- **Untestable or unclear:** from pass 1. Each becomes a question for the product owner,
  never a case.
- **Missing setup:** accounts, roles, or data states that a case needs and that no source
  explains. Ask the user. Never invent account names or data.
- **Design links not read:** from pass 1. Ask whether the user wants to paste notes from
  any of them.

Wait for the user's answers, then apply them.

## 7. Draft

1. Write `draft.md` following `references/qa-comment.md`. The version line uses the newest
   merged PR's `mergeCommit.oid`, shortened to 7 characters, and its merge date.
2. Check the draft against the standard:
   - Every test-section line has an ID, `→`, and one source tag.
   - No limitation sits in a test section.
   - No case uses code words or "works", "correctly", or "as expected".
   - Every permission, data-isolation, and data-loss case appears in `Focus first`.
   - `R. Regression` is present.
3. Above about 30 cases, warn and suggest one comment per feature area.
4. Run `python3 scripts/md2adf.py convert draft.md > draft.adf.json`. Fix the draft if it
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
- Put file paths, code identifiers, or reviewer notes into the comment.
- Post with `--body` instead of `--body-file`. Shell quoting breaks a multi-line body.
- Add AI attribution, "Generated with" footers, or emoji.
