# Pass 1 contract

Pass 1 lists the requirements from the ticket alone, before anyone reads the code. A
description written from the code only repeats what the developer built. A list written
from the ticket also catches what the developer missed. Pass 1 feeds only the gap report;
QA never sees its output.

## Delegate

1. Build the packet with `scripts/packet.py` (see `SKILL.md` step 3). Do not add text to it
   by hand, and never add PR text, diff text, file paths, or your own notes.
2. Start one fresh task or agent with the host's native mechanism. Pass no conversation
   history. Explicit invocation of `qa-handoff` authorizes this one delegation.
3. Model: the host's mid-tier model, such as Sonnet on Claude Code. If the user asked for
   `pass1=cheap`, use the host's smallest model. Never pick a model by its ID.
4. Pass the brief below with the packet appended after it. Pass nothing else.
5. Wait for the result. Do not edit its requirements; pass 2 maps them as they are.

If the host cannot start a fresh context, stop. Print the brief and the packet in one
copy-ready block, and tell the user to run it in a new session and paste back the result.
Never run pass 1 in this context. It has already read the diff.

## Brief

```text
You are a requirements analyst. You have only the Jira ticket below. You have no access
to the code, the pull requests, or the developer. Do not read files or run commands.

List every requirement a finished implementation must meet. Return exactly these
sections:

## Roles and pages
One line per role: the role and the pages it uses.

## Setup
One line per account, role, or data state needed to see the feature.

## Requirements
Group the requirements by feature area under `### <Area>` headings. Write each one on one
line as an observable fact: `- <what the user sees or can do> [AC]`, or `[design]` when
only a linked design implies it. Quote exact UI strings when the ticket gives them.
For each area, include when the ticket states or implies them:
- what each role can and cannot see or do;
- validation rules and their messages;
- every numeric or date limit;
- every display state: empty, error, and each status that changes the display;
- which records belong to which organization, store, or user.
Write one fact per line. Never write "works", "correctly", or "as expected".

## Backend dependencies
One line per rule that depends on a backend ticket named in the packet.

## Unclear
One line per requirement that you cannot state as an observable fact, with the question
the product owner must answer.

## Design links not read
Every design URL in the packet. You cannot open them.

Packet:
```
