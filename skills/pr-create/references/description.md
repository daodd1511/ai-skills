# PR description standard

The reader is a reviewer who knows the project. On opening the PR, that reader needs to
decide two things fast: should this change exist, and where should the review look
hardest?

**The rule:** every sentence tells the reviewer something that the diff, title, commits,
and CI do not. Each section, exclusion, and limit below follows from it.

## Sections

Use these sections in this order. Include a section only when it carries information.

1. **Why** — one to three sentences: the problem or need, plus the issue or ticket link.
   Do not restate the title.
2. **Approach** — the chosen design and the alternatives you rejected, each with its
   reason. Constraints that shaped the design belong here too, such as "the backend does
   not support ordering by `service_started`." Omit this section when the change made no
   real decision.
3. **Where to look** — the risky or non-obvious lines as `path:line`, most important
   first. End with a "Skim:" item for mechanical changes: renames, moves, formatting,
   memo wrappers, regenerated fixtures.
4. **Impact** — breaking changes, behavior changes for other callers, migrations,
   configuration or environment variables, dependency bumps, and deploy order.

Add these only in the conditions shown:

- **Stack line** (stacked PRs): the first line of the body, before **Why**. Give the
  position, the base, and what the reviewer should not expect yet. Example: "Stack 1 of 6,
  based on `develop`. No page renders this table until #57."
- **Screenshots** (the diff changes UI): a before/after table with one HTML-comment
  placeholder per cell. Each placeholder names the view to capture.
- **Verification** (only when the user asks for it): what was run or checked by hand that
  CI does not show. Real evidence only, such as "Ran the migration against a production
  snapshot; 3 rows needed a backfill."

## Length

- A trivial PR, such as a dependency bump or a typo fix: one or two sentences, no headings.
- A typical PR: 150 to 250 words of your own content. Text that a template requires does
  not count.
- Five bullets or fewer per section.

A description that needs more means the PR is too big. Do not lengthen the prose to cover
it; the size warning in `SKILL.md` step 2 applies instead.

## Project templates

When the repo has a PR template, it wins:

- Fill every section the template has. Never delete or rename its sections.
- Put Why and Approach under the template's matching heading, such as "Description" or
  "Summary". Do not add a second heading for the same content.
- Append any of the four sections that the template lacks, after the template.
- Tick only the checkboxes that are true. Leave the others unchecked.
- The cut list below applies to your content, not to items that the template requires.

## Bundled concerns

When the user declined a split, open with one line: "This PR bundles N concerns; split was
declined." Then give one `###` subsection per concern, in review order. Each subsection
has a one-line why and one place to look.

## Cut

Never write any of these:

- A file-by-file changelog, such as "Updated `session.ts` to add a refresh check." The diff
  shows it.
- The title or the commit list, restated.
- Empty, "N/A", or placeholder sections.
- Generic claims with no number or specific cause: "improves reliability," "cleans up
  code," "follows best practices."
- Explanations of project basics or common patterns.
- Process narration, such as "First I tried X, then discovered Y." Keep only the rejected
  alternative and its reason, under Approach.
- Claims that CI already shows, such as "[x] All tests pass."
- AI attribution, "Generated with" footers, and emoji.

## Examples

These examples are illustrative.

### Typical PR

```markdown
fix(auth): refresh token before expiry on reconnect

## Why
After a socket reconnect, the client reuses a token that can expire within seconds, so
~4% of reconnects get 401 and force a logout. Closes #212.

## Approach
- Refresh at reconnect when the token has less than 60 s left.
- Rejected: retry on 401. It doubles round trips and hides the expiry bug from logs.

## Where to look
- `session.ts:88`: the expiry check uses server time from the handshake, not the client
  clock.
- Skim: `tok` → `token` rename in 9 files.

## Impact
New env var `AUTH_REFRESH_SKEW_S`, default 60.
```

The same change written badly: a "Summary" that says the PR "improves the reliability of
the auth flow," a "Changes" list of modified files, a "Notes" paragraph about what the
author tried first, and a "Generated with" footer. It reaches the same length and tells
the reviewer nothing they can check.

### Breaking migration

```markdown
feat(billing)!: store invoice amounts as integer cents

## Why
`amount` is a float column, so totals drift by a cent on ~0.3% of multi-line invoices and
fail reconciliation against Stripe. Closes #431.

## Approach
- New `amount_cents BIGINT`, backfilled with `ROUND(amount * 100)`.
- Rejected: `NUMERIC(12,2)`. It fixes storage, but the JS client still parses floats.
- Rejected: dual-write both columns. It adds a sync path to remove later; the backfill is
  idempotent instead.

## Where to look
- `migrations/0042_amount_cents.sql`: batched backfill and its rounding.
- `money.ts`: `fromCents` and `toCents`; every caller goes through these two functions.
- Skim: 31 regenerated test fixtures.

## Impact
- BREAKING: API field `amount` (float) is replaced by `amount_cents` (int).
- Deploy order: migration → API → web.
- A follow-up PR drops the old column.
```

### Project template

The template has Description, Type of change, and Checklist sections.

```markdown
Add View in Payroll button to shift discrepancy dialog CG-2267

## Description
Managers resolve a discrepancy, then search for the same shift in Payroll by hand. The
button opens that shift directly, filtered by employee and pay period. Rejected: a link in
the toast, which disappears before managers act on it.

## Type of change
- [ ] Bug fix
- [x] New feature
- [ ] Breaking change

## Checklist
- [x] I added tests
- [ ] I updated the docs
- [ ] I tested on mobile

## Where to look
- `DiscrepancyDialog.tsx:140`: the button is hidden when the pay period is locked.
```

### Bundled concerns

```markdown
feat(reports): add CSV export

This PR bundles 3 concerns; split was declined. Review them in this order:

### 1. Extract ReportQuery builder (refactor)
No behavior change. `ReportQuery.ts` replaces the inline SQL in 4 controllers.

### 2. Fix timezone offset in report dates (fix)
Dates rendered in UTC, not the organization's timezone. Closes #502. Look at `dates.ts:31`.

### 3. CSV export (feat)
Finance exports reports by hand. Closes #488. Look at `csv.ts`: it streams rows, so memory
stays flat for 100k-row exports.
```
