# Vue Reactivity Rules

## ref vs shallowRef

- **Prefer `shallowRef`** over `ref` when deep reactivity is not needed — better performance.
- Use `ref` only when nested object mutations must trigger reactivity.

## computed

- Use `computed()` for all derived state — never compute in templates.
- Use writable computed (`{ get, set }`) for two-way derived bindings.

## Watchers

- Use `watch` for explicit side effects triggered by specific sources.
- Use `watchEffect` for effects that auto-track all accessed reactive deps.
- Always clean up async effects with `onWatcherCleanup` (Vue 3.5+).

## Avoid reactive() for Return Values

- Do not return `reactive()` objects from composables — destructuring loses reactivity.
- Return individual `ref`s or a plain object of refs.

## References

- `shallowRef` vs `ref` and watcher cleanup examples: `references/reactivity.md`

---

# Vue Reactivity Examples

## shallowRef vs ref

```ts
// ✅ shallowRef — only .value reassignment triggers reactivity
const data = shallowRef({ items: [] as string[] })
data.value = { items: ['new'] }   // ✅ triggers
data.value.items.push('new')      // ❌ does NOT trigger

// Use ref only when nested mutation must trigger reactivity
const user = ref({ name: 'John', profile: { age: 30 } })
user.value.profile.age = 31       // ✅ triggers (deep)
```

## Async Watcher Cleanup

```ts
watchEffect(async () => {
  const controller = new AbortController()
  // ✅ onWatcherCleanup runs before next effect or on unmount (Vue 3.5+)
  onWatcherCleanup(() => controller.abort())
  const res = await fetch(`/api/${id.value}`, { signal: controller.signal })
  data.value = await res.json()
})
```