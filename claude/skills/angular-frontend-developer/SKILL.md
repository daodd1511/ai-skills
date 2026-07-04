---
name: angular-frontend-developer
description: >
  Angular engineering standards. Use when writing or reviewing Angular code:
  components, templates, signals, RxJS, services, DI, forms, performance, or
  accessibility. Version-aware: covers legacy v17–v20 codebases through v21+
  (signals, zoneless, native control flow), with per-version guidance on
  which idiom applies.
---

# Angular Frontend Developer

**Precedence:** project instructions (AGENTS.md / CLAUDE.md) and the touched
codebase's existing patterns always override this skill. These are defaults
for when the project doesn't say otherwise.

**First step: pin the version.** Read `@angular/core` in `package.json`
before writing code. Use the newest idiom *available on that version* —
never introduce APIs the version doesn't ship, and never half-migrate
(one file mixing `*ngIf` and `@if` styles is worse than either).

## Version gates

| Feature | Available | Before that, use |
|---|---|---|
| `inject()` | v14+ | constructor injection |
| standalone components | v15+; default (omit flag) v19+ | NgModules |
| `takeUntilDestroyed`, `toSignal`/`toObservable` | v16+ | `Subject` + `takeUntil` |
| `signal`/`computed`/`effect` | v16, stable v17 | fields + OnPush + async pipe |
| `@if`/`@for`/`@switch` | v17, stable v18 | `*ngIf`/`*ngFor`/`*ngSwitch` |
| `@defer` | v17, stable v18 | route-level lazy loading only |
| `input()`/`output()`/`model()` | v17.1–17.3, stable v19 | `@Input()`/`@Output()` |
| signal queries (`viewChild()` …) | v17.2, stable v19 | decorator queries |
| `linkedSignal` | v19, stable v20 | `computed` + manual reset signal |
| `resource()`/`httpResource()` | v19/v19.2, experimental | service + `toSignal` |
| zoneless CD | preview v18–20, stable v21 | zone.js + OnPush everywhere |
| Signal Forms | v21 experimental | typed reactive forms |

When migrating a legacy area wholesale, use the official schematics rather
than hand-editing: `ng generate @angular/core:control-flow`, `:inject`,
`:signal-inputs`, `:standalone`.

## Components

- Standalone always (v15+). On v19+ omit `standalone: true` — it's the
  default. Import only what the template uses.
- `changeDetection: ChangeDetectionStrategy.OnPush` on every component,
  every version. On v21+ new apps, prefer zoneless
  (`provideZonelessChangeDetection()`) — OnPush + signals code is already
  zoneless-compatible.
- `inject()` over constructor injection (any supported version).
- v17.1+/v19: `input()`, `output()`, `model()` functions. On older code with
  decorators, match the file's existing style unless migrating the whole
  component.
- `host: { ... }` in the decorator instead of `@HostBinding`/`@HostListener`.
- Never touch the DOM directly — use `Renderer2`, signal queries, or
  bindings.

## Templates

- v17+: native control flow `@if`/`@for`/`@switch`; `@for` always with
  `track`. Pre-v17 (or unmigrated files): `*ngFor` always with `trackBy`.
- `[class.x]`/`[style.x]` bindings over `ngClass`/`ngStyle`.
- No logic in templates — derive with `computed()` (or a pure pipe on
  legacy code).
- `NgOptimizedImage` for static images (v15+).

## State & reactivity (signals)

- v17+: `signal()` for local component state, `computed()` for derived
  state, `effect()` only for side effects that leave Angular (logging,
  storage, imperative DOM) — never to sync one signal from another; that's
  `computed` or `linkedSignal` (v19+).
- Convert service observables at the component boundary with `toSignal()`
  (v16+); it unsubscribes automatically.
- Pre-signals code (or v16 without them): keep observables + `async` pipe;
  do not hand-subscribe in components.

## Data fetching & services

- Services own data access via `HttpClient`; components never call HTTP.
- Single source of truth per service: expose a `signal`/`computed` (v17+) or
  a `BehaviorSubject`-backed observable (legacy) — not both, and not a
  method that both returns data and writes shared state.
- v19+ (experimental, confirm project buy-in): `resource()`/`httpResource()`
  for fetch-into-signal with built-in loading/error state.
- Errors: `catchError` mapped into explicit error state the UI renders.
  Never `catchError(() => EMPTY)` with only a `console.error` — the UI
  hangs with no feedback.

## RxJS

- Never nest subscribes — compose with the right flattening operator:
  cancel-previous `switchMap`; concurrent `mergeMap`; queued `concatMap`;
  ignore-while-active `exhaustMap` (submits/saves).
- Subscription lifetime: `toSignal()` or `async` pipe first;
  `takeUntilDestroyed()` (v16+) when a component must subscribe;
  `Subject` + `takeUntil` on older code. Never a bare `.subscribe()` on an
  infinite stream.
- `finalize()` to reset loading state on success and error paths alike.

## Forms

- Typed reactive forms (`FormControl<T>` with `nonNullable`, `FormGroup`)
  for all non-trivial forms — every version in scope has them (v14+).
- Form structure in the class, validation via validators, not template
  logic. Template-driven forms only for trivial single-field cases.
- v21+: Signal Forms exist but are experimental — don't adopt in legacy
  codebases without explicit buy-in.

## Performance

- Core Web Vitals targets: LCP < 2.5s, INP < 200ms, CLS < 0.1.
- Route-level: `loadComponent`/`loadChildren` for every heavy route.
- v17+: `@defer` for heavy below-the-fold or interaction-gated template
  blocks (charts, editors) — cheaper than a new route split.
- Images compressed, explicit `width`/`height` (CLS), `NgOptimizedImage`.
- Measure first (Angular DevTools profiler); no speculative memoization or
  micro-tuning.

## Accessibility

- Target WCAG 2.2 AA. Semantic HTML first: `<button>` for actions, `<a>`
  for navigation, real landmarks; ARIA only where semantics fall short.
- Every form control gets a real `<label>`; icon-only controls get
  `aria-label`.
- Manage focus on dialog open/close and route change; `aria-live` for async
  status updates. Use Angular CDK a11y (`FocusTrap`, `LiveAnnouncer`)
  rather than hand-rolling.

## Architecture

- Three layers, never crossed: UI (components/templates — no HTTP, no raw
  DTOs) → domain (models, pure business functions, services) → repository
  (API clients, zod DTO schemas, mappers).
- DTOs validated with zod at the boundary via safe-parse; invalid data is
  logged and filtered, not thrown mid-render. Domain models are `readonly`.
- Full walkthrough with code (secureParse, IMapper, layer rules):
  `references/architecture.md` — read when building a new data-layer slice,
  not for routine edits.
