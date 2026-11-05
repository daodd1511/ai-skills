# QA comment standard

The reader is a QA engineer who knows the product but not the code. QA decides what to
test and how. Our job is to give QA enough information to make those decisions: what
changed, what the ticket delivers, what is easy to miss, and what is not there yet.

**The rule:** describe what we built and what we provide. Never tell QA how to do their
job. The comment states facts about the product. It never gives test steps, test cases,
checkboxes, or a priority order for testing.

## Sections

The sections below are a reference, not a fixed template. Include a section only when it
has content. Rename, merge, or add a section when the ticket needs it, for example a
section per portal or a section about an export file. Keep the order: setup first,
then what the ticket delivers, then the details, then the limitations.

- **First line.** Always start with
  `Changes are available on dev as of <merge SHA> (merged <YYYY-MM-DD>)`. The skill uses
  this line to find an earlier handoff.
- **Before you start.** The environment, if it is not plain dev. The organization,
  accounts, and roles. The test data, and which data gives which outcome. Anything that
  the team does not control, such as a third-party test system, and what to report when
  it behaves differently. Facts that limit test data, such as "a submitted record leaves
  the list for good."
- **What this ticket delivers.** Each feature as a short factual description: where it
  is, what it shows, what it does, and who can use it. Group by page or area. Quote exact
  UI strings. Name role differences: "An Admin sees every patient. A Staff user sees only
  patients assigned to them."
- **Easy to miss.** Behavior that QA would not guess from the ticket or the design:
  - timing and asynchronous work, such as a dialog that opens when processing finishes;
  - limits and boundaries, such as a maximum of 100 items and what happens above it;
  - what stays and what resets, such as selections across pages or after a search;
  - locks and concurrency, such as one submission at a time;
  - error behavior and where errors appear;
  - exact values in exports or messages;
  - differences from the design, with the reason when one exists;
  - effects of shared code changes on other pages, stated as facts: "All tables in the
    app now have a border."
- **Known limitations.** Deferred work, placeholders, all-or-nothing rules, and other
  behavior that is intended for now but may look like a bug. Name the owning ticket when
  one exists.

## Writing rules

- Write each fact as one or more plain sentences. A bullet holds one feature or one fact.
- Quote exact UI strings: `"Submit Request"`, `"All patient records have been processed"`.
- Describe what QA sees, never how the code does it.
- State a role, a limit, or a condition explicitly. "A Staff user sees only their own
  patients" is complete. "Permissions apply" is not.
- When behavior was built without a source in the ticket or the design, say so in the
  sentence: "(not in the ticket)".
- When behavior depends on a backend ticket, name it: "(needs SHOP-31 on dev)".
- Put a design link next to the feature that it covers, never in a separate list.

**Forbidden:**

- Test instructions: "verify", "check that", "make sure", "try", "test", "confirm", and
  imperative steps written for QA to follow. "Before you start" may tell QA what to report
  when an uncontrolled system differs; it never tells QA what to test.
- Test structure: case IDs, checkboxes, ✅ or ❌, `action → result` pairs, source tags such
  as `[AC]`, "Focus first", "What to test", and regression cases.
- Code words: component, hook, prop, endpoint, query, mapper, file paths, function names.
- Vague results: "works", "correctly", "properly", "as expected".
- A claim that something is absent, unless the ticket or design leaves it out explicitly,
  or the absence is a known limitation.
- A limitation inside "What this ticket delivers". It goes in "Known limitations".

## Template

Write the draft in this Markdown subset only: `##` to `######` headings, paragraphs, `-`
and `1.` lists, `> [!NOTE]` panels, `**bold**`, `` `code` ``, and `[text](url)` links.
`scripts/md2adf.py` rejects anything else.

```markdown
Changes are available on dev as of `<merge SHA>` (merged <YYYY-MM-DD>)

## Before you start

<Organization, accounts, roles, test data and the outcome each data state gives.>

## What this ticket delivers

<One paragraph or bullet per feature, grouped by page or area.>

## Easy to miss

- <Behavior QA would not guess.>

## Known limitations

- <Limitation> (<owning ticket>)
```

## Good example

This example uses an invented store-scheduling app.

```markdown
Changes are available on dev as of `4f2c9e1` (merged 2026-03-12)

## Before you start

Stores: "North" and "South". Use the Store Manager and Clerk accounts of each store.

Test data: an invite creates a staff member with status Pending. The person becomes Active after accepting the email invite. The invite email comes from the mail sandbox, which we do not control. If an invite email does not arrive, report the email address and the time you sent it.

## What this ticket delivers

The Store Manager portal has a new page: **Staff**. [Design](https://example.com/design/staff-list)

Table: Name, Email, Status, and Shifts. A Store Manager sees only the staff of their own store. A Clerk cannot open the page; a direct link to `/staff` shows "You do not have access."

Search: by name or email.

Invite: "Invite" opens a dialog with First Name, Last Name, Email, and Store. "Send" adds the person to the table with status Pending (needs SHOP-31 on dev).

Empty state: "No staff yet." when the store has no staff.

## Easy to miss

- A Pending person shows "—" in the Shifts column.
- Search matches any part of a name or email. For example, "kim" also matches "Joakim".
- Changing the search returns the table to page 1 (not in the ticket).
- If "Send" fails, the dialog stays open and keeps the typed values (not in the ticket).
- The Store list in the dialog shows only active stores.
- The design shows one Name input. The dialog has First Name and Last Name, because the backend stores them separately.
- The search field on Shifts and Stores now clears with Escape, because those pages share the Staff search field.

## Known limitations

- Clicking a staff row opens a "Coming soon" page until the profile page ships (SHOP-40).
- An invite cannot be resent or cancelled yet.
```

## Bad example and its rewrite

```markdown
### A. Invite staff

- [ ] A1 Click "Invite" → the dialog opens [AC]
- [ ] A2 Leave Email empty and click "Send" → "Enter an email." appears [AC]
- [ ] A3 Verify that a manager cannot see another store's staff [AC]
- [ ] R1 Check that search on Shifts still works [regression]
```

What is wrong with it:

- It is a test plan. It decides what QA tests, in which order, and how.
- Checkboxes and case IDs turn the comment into a form for QA to fill in.
- "Verify that" and "check that" give QA instructions instead of facts.
- "Still works" says nothing about what changed on Shifts.

The rewrite:

```markdown
Invite: "Invite" opens a dialog with First Name, Last Name, Email, and Store. An empty Email shows "Enter an email." "Send" adds the person to the table with status Pending.

A Store Manager sees only the staff of their own store.

The search field on Shifts and Stores now clears with Escape, because those pages share the Staff search field.
```
