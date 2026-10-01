---
name: react-frontend-developer
description: >
  React engineering standards. Use when writing or reviewing React code:
  components, hooks, data fetching, forms, state management, component
  architecture (DTO/mapper layers), performance, or accessibility in React
  apps. Covers React 19 (Compiler, actions, Suspense) with TypeScript, plus
  React Hook Form, TanStack Query, MUI, React Router, and Luxon.
---

# React Frontend Developer

**Precedence:** project instructions (AGENTS.md / CLAUDE.md) and the touched
codebase's existing patterns always override this skill. These are defaults
for when the project doesn't say otherwise.

**Versions:** a rule tagged with a version — `(v7+)`, `(v7.5+)`,
`(resolvers v5.1+)` — applies only from that version of the named library,
or of the file's main library when none is named. Check `package.json`
before applying it. Untagged rules apply to every version the file covers.

## Library references

Read the matching reference when `package.json` lists the dependency and the
task touches that library:

| Dependency | Reference |
|---|---|
| `react-hook-form` | `references/forms-rhf.md` |
| `@mui/material` | `references/mui.md` |
| `react-router` / `react-router-dom` | `references/router.md` |
| `luxon` | `references/dates-luxon.md` |
| `@tanstack/react-query` (new data-layer slice) | `references/architecture.md` |

## Components

- Function components with typed props. Define helper functions that don't
  use hooks/state **outside** the component — independently testable, no
  memoization questions.
- Keep JSX shallow: extract complex rendering into named variables or small
  components; no nested ternary chains.
- Named event handlers (`handleSubmit`), not inline arrows in JSX, when the
  handler has a body worth naming.
- Object parameters for props/callbacks taking more than ~2 values — future
  additions stay non-breaking.
- React 19: `ref` is a normal prop — do not add `forwardRef` in new code.

## Memoization (React Compiler era)

- **Default: none.** If the project has React Compiler enabled (React 19),
  do not write `useMemo`, `useCallback`, or `React.memo` — the compiler does
  it, and manual wrappers add noise and can defeat it.
- Without the compiler: still don't memoize preemptively. Add it only when a
  profiler shows a real re-render cost, and say why in the change.
- Genuinely expensive pure computations (parsing, large sorts) may keep
  `useMemo` regardless — that's about the computation, not re-renders.

## Hooks & Effects

- Rules of hooks: top level only, never conditional.
- Extract reusable stateful logic into `use*` custom hooks.
- **You might not need an effect.** Deriving state, transforming data for
  render, and responding to events belong in render logic or handlers, not
  `useEffect`. Effects are for synchronizing with external systems
  (subscriptions, DOM APIs, non-React widgets) — and must return cleanup.
- Keep dependency arrays honest; never suppress `exhaustive-deps` without a
  written justification.

## Data Fetching & State

- **Server state belongs in a query library** (TanStack Query / SWR) or the
  framework's loader (React Router loaders, RSC). Do NOT hand-roll
  `useState` + `useEffect` + fetch: no caching, race conditions, double-fire
  under StrictMode.
- Distinguish state kinds and use the right tool:
  server cache → query library; global client state → the project's store
  (Zustand/Redux); local UI state → `useState`/`useReducer`;
  URL state → the router.
- Mutations: use the query library's mutation API with invalidation. Use
  React 19 actions (`useActionState`, `useOptimistic`) only for forms that
  don't use a form library; with React Hook Form, submit through
  `handleSubmit` → `mutateAsync`, never both.
- Loading/error UI: prefer Suspense boundaries + error boundaries at
  route/feature level over per-component spinner flags, where the data layer
  supports it.

## Architecture

- Three layers, never crossed: UI (components/hooks — no API calls, no raw
  DTOs) → domain (models, pure business functions) → data (API clients, zod
  DTO schemas, mappers).
- DTOs validated with zod (`z.infer` for types). (zod v4+) Use top-level
  format schemas — `z.email()`, not the deprecated `z.string().email()`;
  on zod 3 only the latter exists. Safe-parse at the boundary, log and return
  `null`/filter on failure rather than throwing mid-render.
- Mappers are plain functions/objects that own all DTO ↔ domain
  transformation; domain models are `readonly`.
- Full walkthrough with code: `references/architecture.md` (read when
  building a new data-layer slice, not for routine edits).

## Code Quality

- SOLID/KISS/DRY/YAGNI; explicit over clever; isolate side effects; prefer
  immutability (`readonly`, no shared-state mutation).
- Strict TypeScript; no `any` — `unknown` + narrowing for untyped data.
- Naming: Short, Intuitive, Descriptive. No context duplication
  (`MenuItem.handleClick`, not `MenuItem.handleMenuItemClick`).

## Performance

- Core Web Vitals targets: LCP < 2.5s, INP < 200ms, CLS < 0.1.
- Route-level code splitting: with a data router, use the route's `lazy`
  property (see `references/router.md`); otherwise `React.lazy` +
  `Suspense`. Never eagerly load what initial render doesn't need.
- Images: compressed, right format, explicit `width`/`height` (CLS).
- Long lists: paginate or virtualize — but measure first; virtualization of
  heavy rows can be worse than pagination.
- Measure before optimizing (React DevTools Profiler); don't ship
  speculative optimizations.

## Accessibility

- Target **WCAG 2.2 AA**. Lint with `eslint-plugin-jsx-a11y`.
- Semantic HTML first: `<button>` for actions, `<a>` for navigation, real
  landmarks (`<main>`, `<nav>`); never a clickable `<div>`/`<span>`. ARIA
  only where semantics fall short.
- Every form control gets a real `<label>` (placeholder is not a label);
  icon-only controls get `aria-label`.
- Manage focus in React flows: move focus into opened dialogs and back on
  close, to headings/status on route change; `aria-live` for async updates.
  A component library's modal (MUI `Dialog`) already traps and restores
  focus — don't re-implement it.
- All interactive elements keyboard-reachable and operable.

## Forms

- Use the project's form library (commonly React Hook Form + zod resolver).
  Details: `references/forms-rhf.md`.
- Give each form its own schema and a form → domain mapper. Form values
  (strings, empty fields, date objects) rarely match the wire shape, so
  don't reuse the DTO schema.
- Native inputs: uncontrolled (`register`). Component-library inputs (MUI
  and similar): `Controller`, because `register`'s ref doesn't reach the
  underlying `<input>`.

## Testing

- Test behavior through the DOM with Testing Library: query by role and
  label, drive interactions with `userEvent.setup()`, not `fireEvent`.
- Mock the network with MSW, not by mocking modules or the API client. Tests
  then exercise the real data layer, mappers included.
- Give each test a fresh `QueryClient` with `retry: false`; a shared client
  leaks cache between tests and retries turn failures into timeouts.
- Build fixtures with factories (faker, if installed) that return valid
  DTOs; override only the fields the test is about.
