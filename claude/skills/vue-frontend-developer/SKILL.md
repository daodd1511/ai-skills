---
name: vue-frontend-developer
description: >
  Vue engineering standards. Use when writing or reviewing Vue 3 code:
  SFCs, script setup, Composition API, reactivity (ref/computed/watchers),
  composables, Pinia state, data fetching, forms, performance, or
  accessibility. Covers Vue 3.4–3.6 (defineModel, props destructure,
  onWatcherCleanup, Vapor mode) with TypeScript.
---

# Vue Frontend Developer

**Precedence:** project instructions (AGENTS.md / CLAUDE.md) and the touched
codebase's existing patterns always override this skill. These are defaults
for when the project doesn't say otherwise.

**Pin the version.** Read `vue` in `package.json`; several idioms below are
gated on 3.4/3.5. Don't introduce APIs the project's version doesn't ship.

## Components

- Always `<script setup lang="ts">` — no Options API, no untyped setup, in
  new code. In an Options API legacy file, match the file's style unless
  migrating the whole component.
- Type-based `defineProps`/`defineEmits`; tuple syntax for emits
  (`update: [value: string]`).
- Prop defaults: 3.5+ use destructure defaults
  (`const { count = 0 } = defineProps<...>()` — reactivity is preserved by
  the compiler); pre-3.5 use `withDefaults`, and never destructure props
  (it loses reactivity — use `toRef(() => props.x)`).
- Two-way binding: `defineModel` (3.4+), not manual prop + emit pairs.
- `defineOptions` for `name`/`inheritAttrs`; `generic="T"` attribute for
  generic components.
- 3.5+: `useTemplateRef('name')` over `ref(null)` template refs;
  `useId()` for SSR-safe ids.
- Keep templates shallow — extract complex branches into `computed`s or
  child components; no logic soup in the template.

## Reactivity

- **`ref` is the default.** Use `shallowRef` deliberately, not by
  preference: large/immutable payloads (API responses you replace
  wholesale, big lists) or externally-managed instances (map/chart/editor
  objects). Rule of thumb: if anything ever mutates a nested property and
  expects the UI to react, it must be `ref`.
- `computed()` for all derived state — never duplicate derived data into a
  writable ref you sync by hand, and never compute in templates.
- `watch` for effects triggered by specific sources; `watchEffect` for
  auto-tracked effects. Cleanup: `onWatcherCleanup` (3.5+) or the
  `onCleanup` callback argument (all versions) — and it must be registered
  **synchronously, before the first `await`**, or it will never run.
- Don't return `reactive()` objects from composables — destructuring loses
  reactivity. Return a plain object of refs.
- 3.6: Vapor mode is opt-in per SFC and the reactivity core changed
  internals only — existing Composition API code is unaffected; don't
  restructure code "for Vapor" unless the project has adopted it.

## Composables

- Prefix with `use`; single responsibility; business logic lives in
  composables/services, not components.
- Accept `MaybeRefOrGetter<T>` inputs and unwrap with `toValue()` so
  callers can pass values, refs, or getters.
- Return refs as `readonly` where callers shouldn't mutate them.
- Register lifecycle hooks (`onMounted` etc.) synchronously at the top —
  never after an `await`.

## State & data fetching

- Distinguish state kinds: server cache → query library (TanStack Query
  for Vue / Pinia Colada); global client state → Pinia (setup-store
  syntax); local/feature state → a composable; URL state → the router.
- Do NOT hand-roll `ref` + `watchEffect` + fetch for server data — no
  caching, no dedupe, race conditions. If the project has no query
  library, at minimum put fetching in a composable with abort-on-restale
  (`onWatcherCleanup` + `AbortController`) and explicit
  loading/error/data refs.
- Pinia stores: setup syntax (`defineStore('x', () => {...})`), state as
  refs, derived as `computed`; never mutate store state from components —
  expose actions.
- Async views: `<Suspense>` + async setup is fine at route level where the
  ecosystem (Nuxt, router) supports it; otherwise explicit loading state.

## Forms

- Non-trivial forms: VeeValidate (or the project's form library) with a
  zod schema shared with the data layer where shapes align.
- Trivial forms: `defineModel`/`v-model` + a `computed` validity check —
  don't add a library for one field.

## Performance

- Core Web Vitals targets: LCP < 2.5s, INP < 200ms, CLS < 0.1.
- Route-level code splitting via the router; `defineAsyncComponent` for
  heavy below-the-fold widgets (charts, editors).
- Long lists: paginate or virtualize (`vue-virtual-scroller`) — measure
  first. `v-memo` only for proven hot paths in large `v-for`s; it's a
  sharp tool, not a default.
- Images compressed, explicit `width`/`height` (CLS).
- Measure with Vue DevTools before optimizing; no speculative
  `shallowRef`/`v-once` scattering.

## Accessibility

- Target WCAG 2.2 AA. Semantic HTML first: `<button>` for actions, `<a>`
  for navigation, real landmarks; ARIA only where semantics fall short.
- Every form control gets a real `<label>`; icon-only controls get
  `aria-label`.
- Manage focus on dialog open/close and route change; `aria-live` for
  async updates. All interactive elements keyboard-operable.

## Architecture

- Three layers, never crossed: UI (components/composables — no API calls,
  no raw DTOs) → domain (models, pure business functions) → data (API
  clients, zod DTO schemas, mappers).
- DTOs validated with zod at the boundary via safe-parse; invalid data is
  logged and filtered, not thrown mid-render. Domain models are `readonly`.
- Full walkthrough with code (secureParse, IMapper, layer rules):
  `references/architecture.md` — read when building a new data-layer
  slice, not for routine edits.
