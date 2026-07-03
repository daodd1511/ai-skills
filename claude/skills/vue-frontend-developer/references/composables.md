# Vue Composables Rules

## Naming

- Always prefix composable names with `use`: `useFetch`, `useMouse`, `useCounter`.

## Accept Reactive Input

- Accept `MaybeRefOrGetter<T>` for inputs that may be static or reactive.
- Unwrap with `toValue()` inside the composable.

## Return Shape

- Return plain objects of `ref`s (not `reactive()`).
- Expose state as `readonly` refs to prevent external mutation.

## Responsibility

- Each composable has a single responsibility.
- Keep business logic out of components — delegate to composables and services.
- Mock data in the composable/service layer, never in the component template.

## References

- `toValue()` usage and return shape examples: `references/composables.md`

---

# Vue Composables Examples

## Accept Reactive Input with toValue()

```ts
import { toValue, type MaybeRefOrGetter } from 'vue'

export function useFetch(url: MaybeRefOrGetter<string>) {
  // toValue() handles ref, getter, or plain value
  const resolved = toValue(url)
}

// All three call styles work:
useFetch('/api/users')
useFetch(urlRef)
useFetch(() => `/api/users/${props.id}`)
```

## Return Shape

```ts
export function useUserService() {
  const users = ref<User[]>([])
  const loading = ref(false)

  async function loadUsers() { /* ... */ }

  // ✅ Plain object of refs — destructuring preserves reactivity
  // ✅ readonly — prevents external mutation
  return {
    users: readonly(users),
    loading: readonly(loading),
    loadUsers,
  }
}

// ❌ reactive() — destructuring loses reactivity
export function useBad() {
  return reactive({ users: [], loading: false })
}
```