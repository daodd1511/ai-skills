# QA comment standard

The reader is a QA engineer who knows the product but not the code. That reader copies the
test sections into a reply and marks each case ✅ or ❌. So the comment must answer three
questions, in this order: how do I set up, what do I check, and what is not here yet?

**The rule:** every case is one action and one observable result that QA can mark pass or
fail without asking the developer. Each rule below follows from it.

## Template

Write the draft in this Markdown subset only. `scripts/md2adf.py` rejects anything else.

```markdown
Changes are available on dev as of `<merge SHA>` (merged <YYYY-MM-DD>)

## Before you start

- <environment, if not plain dev>
- Accounts: <one account or role per line>
- Data: <how to create each data state that a case needs>

## What to test (log in as <role>[, then as <role>], open <page>)

### Focus first

- <case ID repeated from below> <why it is high risk, in a few words>

### A. <Feature area>

[Design](<design URL>)

- A1 <action> → <expected result> [AC]
- A2 <Role>: <action> → <expected result> [impl] (not in ticket)

> [!NOTE]
> Design difference: <what differs from the design and why>.

### R. Regression

- R1 <existing page that uses changed shared code>: <action> → <unchanged result> [regression]

## Not in this ticket

- <limitation or deferred item> (<owning ticket, if one exists>)
```

- Use one `What to test` H2 for every role. Write shared behavior once.
- Put the role first in a role-specific case: `A2 Clerk: …`.
- If more than about half the cases in an area are role-specific, split that area into
  one H3 per role: `### A. Shift list: Store Manager`.
- Put the design link under the area that it covers, never in a case.
- Put a design difference in a `> [!NOTE]` panel at the end of its area, never in a case.
- Leave out `Before you start` only when a case needs no account or data beyond a default
  login. Leave out `Focus first` only when no case is high risk.
- Always include `R. Regression` when the diff changes shared code. If it changes none,
  write one case that says so: `R1 No shared code changed.`

## Cases

**Shape.** `<ID> <action> → <expected result> [<source>]`.

- **ID:** the section letter and a number, `A1`, `A2`, `B1`. Never renumber a posted case.
  `Focus first` repeats IDs and has none of its own. `R` is always the regression section.
- **Action:** what QA does, starting from a state that `Before you start` explains.
- **Expected result:** what QA sees. Quote exact UI strings: `"No shifts yet."`.
- **Source tag:**
  - `[AC]`: an acceptance criterion or rule in the ticket.
  - `[design]`: the design, when the ticket does not state it.
  - `[impl]`: built without a source in the ticket or the design. Also add `(not in ticket)`.
  - `[regression]`: existing behavior that shared code changes can break.
- **Backend dependency:** when the result depends on a backend rule, name the ticket:
  `(needs SHOP-31 on dev)`.

**Coverage per area:**

- At least one negative case: invalid input, the wrong role, or a direct URL to a page or
  record that the role must not reach.
- One case per boundary value. A rule "within 30 days" gives three cases: 29, 30, and 31.
- One case per state the area shows: empty, error, loading only if QA can see it, and
  each status that changes the display.
- Permission and data-isolation cases always go into `Focus first`. So do cases where data
  can be lost, such as a draft discarded on close.

**Forbidden in a case:**

- Code words: component, hook, prop, endpoint, query, mapper, file paths. Describe what
  QA sees instead.
- Two results joined by "and". That is two cases.
- "Works", "correctly", "properly", or "as expected" as the result.
- A claim that something is absent, such as "no export button", unless the ticket or
  design explicitly leaves that feature out.
- A limitation. It goes in `Not in this ticket`, never in a test section, because QA marks
  every line in a test section.

**Size.** Above about 30 cases, warn the user and suggest one comment per feature area.

## Good example

This example uses an invented store-scheduling app.

```markdown
Changes are available on dev as of `4f2c9e1` (merged 2026-03-12)

## Before you start

- Accounts: a Store Manager and a Clerk in store "North", and a Store Manager in store "South".
- Data: in store North, create one clerk with status Pending and one with status Inactive.

## What to test (log in as a Store Manager, then as a Clerk, open Staff)

### Focus first

- A3 a manager must never see another store's staff.
- B5 a failed invite must keep the typed values.

### A. Staff list

[Design](https://example.com/design/staff-list)

- A1 Open Staff in a store with no staff → the page shows "No staff yet." [AC]
- A2 Type "kim" in search → only staff whose name or email contains "kim" remain [AC]
- A3 North Store Manager: open Staff → no staff from store South appear [AC]
- A4 Clerk: open `/staff` directly → the page shows "You do not have access." [AC]
- A5 Look at the Pending clerk's Shifts column → it shows "—" [design]
- A6 Change the search while on page 2 → the list returns to page 1 [impl] (not in ticket)

### B. Invite staff

- B1 Click "Invite" → the Invite dialog opens [AC]
- B2 Leave Email empty and click "Send" → Email shows "Enter an email." [AC]
- B3 Type "kim@" in Email and click "Send" → Email shows "Enter a valid email." [AC]
- B4 Fill every field and click "Send" → the dialog closes and the new person appears with status Pending [AC] (needs SHOP-31 on dev)
- B5 Turn the network off, fill every field, and click "Send" → the dialog stays open and keeps the typed values [impl] (not in ticket)

> [!NOTE]
> Design difference: the design shows one Name input. The dialog has First Name and Last Name, because the API stores them separately.

### R. Regression

- R1 Open Shifts and type in its search → results filter as before [regression]
- R2 Open Stores and change the page → pagination still sits below the table [regression]

## Not in this ticket

- Clicking a staff row opens a "Coming soon" page until the profile page ships (SHOP-40).
```

## Bad example and its rewrite

```markdown
- **Invite:** Required fields are validated, the invite creates a Pending user, the list
  refreshes keeping search and page, and errors keep the draft. Organization search uses
  the active filter. No bulk invite.
```

What is wrong with it:

- It holds six results. QA can mark only the whole line, so one failure hides five passes.
- "Required fields are validated" does not say which fields or which message.
- "Uses the active filter" is a code view. QA cannot see a filter, only which stores appear.
- "No bulk invite" is an absence claim with no source.
- It has no setup, no negative case for the wrong role, and no case ID.

The rewrite:

```markdown
- B2 Leave Email empty and click "Send" → Email shows "Enter an email." [AC]
- B4 Fill every field and click "Send" → the new person appears with status Pending [AC]
- B6 Search "kim", go to page 2, then invite someone → search "kim" and page 2 remain [impl] (not in ticket)
- B7 Open the Store list in the dialog → inactive stores do not appear [AC]
- B8 Clerk: look for the "Invite" button → it does not appear [AC]
```
