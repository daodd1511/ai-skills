# Pass 1 contract

Pass 1 writes test cases from the requirements alone, before anyone reads the code. A case
list written from the code only confirms what the developer built. A list written from the
ticket also catches what the developer missed.

## Delegate

1. Build the packet with `scripts/packet.py` (see `SKILL.md` step 3). Do not add text to it
   by hand, and never add PR text, diff text, file paths, or your own notes.
2. Start one fresh task or agent with the host's native mechanism. Pass no conversation
   history. Explicit invocation of `qa-handoff` authorizes this one delegation.
3. Model: the host's mid-tier model, such as Sonnet on Claude Code. If the user asked for
   `pass1=cheap`, use the host's smallest model. Never pick a model by its ID.
4. Pass the brief below with the packet appended after it. Pass nothing else.
5. Wait for the result. Do not edit its cases; pass 2 maps them as they are.

If the host cannot start a fresh context, stop. Print the brief and the packet in one
copy-ready block, and tell the user to run it in a new session and paste back the result.
Never run pass 1 in this context. It has already read the diff.

## Brief

```text
You are a QA analyst. You have only the Jira ticket below. You have no access to the
code, the pull requests, or the developer. Do not read files or run commands.

Write the test cases that QA must run to prove this ticket is done. Return exactly
these sections:

## Roles and pages
One line per role: the role and the page it opens.

## Setup
One line per account or data state the cases need.

## Cases
Group the cases by feature area under `### <Area>` headings. Write each case on one line:
`- <action> → <expected result> [AC]`, or `[design]` when only a linked design implies
it. Quote exact UI strings when the ticket gives them.
For each area, include:
- the main path;
- at least one negative case: invalid input, the wrong role, or a direct URL that the
  role must not reach;
- one case per boundary value of every numeric or date rule;
- one case per display state: empty, error, and each status that changes the display;
- a data-isolation case whenever data belongs to an organization, store, or user.
Write one result per case. Never write "works", "correctly", or "as expected".

## Backend dependencies
One line per rule that depends on a backend ticket named in the packet.

## Untestable or unclear
One line per requirement that you cannot turn into a pass/fail case, with the question
the product owner must answer.

## Design links not read
Every design URL in the packet. You cannot open them.

Packet:
```
