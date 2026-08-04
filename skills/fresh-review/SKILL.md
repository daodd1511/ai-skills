---
name: fresh-review
description: Perform a fresh-context, provider-neutral, read-only review of a completed code change after primary verification. Use only when the user or an active workflow explicitly requests an independent review before accepting a risky phase or change. Do not invoke automatically for implementation, ordinary code review, or routine low-risk work.
---

# Fresh Review

Inspect the actual change set independently from its implementation. Return concrete findings and uncovered risk; leave acceptance, corrections, and provider selection to the calling workflow.

## Establish independent context

If this context did not participate in implementation or inherit the implementer's reasoning history, perform the review directly. Do not create another reviewer.

If this context participated in implementation:

1. Treat explicit invocation of this skill as authorization for one read-only review delegation.
2. Build the compact review packet below.
3. Use the host's native mechanism to create one fresh task or agent without passing implementation conversation history.
4. Pass only the review packet and the self-contained reviewer contract below.
5. Wait for and return the findings. Do not perform a second review in this context.

If the host cannot create a fresh context, return `FRESH REVIEW REQUIRED` followed by the copy-ready packet and stop. Do not claim an independent review.

Do not require or select a provider, model, reasoning level, or host-specific tool. The caller may choose a different provider when correlated model blind spots materially affect risk.

## Build the review packet

Replace every placeholder:

```text
REVIEW PACKET

GOAL: <observable outcome and acceptance criteria>
REPOSITORY: <repository and working directory>
CHANGE SET: <base/head revisions or exact working-tree scope>
ALLOWED FILES: <owned paths and explicit exclusions>
INTERFACES AND CONSTRAINTS: <compatibility, safety, and settled decisions>
PRIMARY VERIFICATION: <exact commands and concrete results>
REVIEW ATTEMPT: initial | re-review
PRIOR FINDINGS: <required for re-review, otherwise none>

REVIEWER CONTRACT
Act as a fresh, read-only reviewer. Inspect the actual repository, complete
change set, affected tests, callers, and relevant surrounding code. Do not
edit, format, stage, commit, push, deploy, or implement fixes. Return only the
structured review required by the fresh-review skill.
```

Do not delegate a partial packet. If missing information prevents reliable attribution or evaluation, report the limitation instead of inventing it.

## Remain read-only

Do not create, edit, delete, format, stage, commit, push, deploy, or implement fixes. Avoid commands that mutate tracked files or generate repository artifacts.

Use primary verification evidence as input. Run additional commands only when they are known to be non-mutating; otherwise list the omitted verification under `NOT CHECKED`.

Inspect repository state before review. If unrelated changes prevent reliable attribution, report that limitation.

## Review the change

1. Confirm the goal, accepted scope, change set, constraints, interfaces, and verification evidence.
2. Inspect the complete actual diff and relevant surrounding implementation, not only a summary or handoff.
3. Inspect affected tests and callers where needed to evaluate behavior and compatibility.
4. Check correctness, regressions, edge cases, security, data integrity, public-interface compatibility, scope discipline, test adequacy, failure handling, rollback risk, and operational impact.
5. Report only evidence-backed, actionable findings. Ignore preferences, formatting, and speculative improvements unless they create material risk.

Use these priorities:

- `P0`: catastrophic or immediately exploitable; block acceptance.
- `P1`: definite correctness, security, privacy, or data-loss defect; must fix.
- `P2`: material regression risk, missing behavior, or consequential test gap; normally fix.

Put non-blocking uncertainty under `RESIDUAL RISK` rather than creating lower-signal findings.

## Return the review

Use this exact structure:

```text
FINDINGS
- [P0-P2] <short title> — <file:line>
  Evidence: <what the code or diff demonstrates>
  Impact: <why it matters>
  Required correction: <minimal outcome needed>

RESIDUAL RISK
- <important remaining uncertainty or none>

NOT CHECKED
- <tests, environments, paths, assumptions, or behavior not verified>

EVIDENCE REVIEWED
- <change-set scope, files inspected, and verification evidence considered>
```

If there are no actionable findings, write `FINDINGS\n- None.` Do not issue an acceptance verdict; the calling workflow owns acceptance.

## Handle re-review

When `REVIEW ATTEMPT` is `re-review`, inspect the full change set, verify prior findings were addressed, and check the fixes for regressions. Return any remaining findings without initiating corrections or another review. The calling workflow owns the one-re-review cap and escalation to the user.
