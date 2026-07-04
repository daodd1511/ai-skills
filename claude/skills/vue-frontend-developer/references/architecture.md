# Architecture Rules

## Layered Architecture

Maintain strict separation between three layers. Never skip or cross layers.

- **UI/View Layer**: Components and composables — handle user interaction only. No business logic, no direct API calls.
- **Domain/Business Layer**: Domain models (TypeScript types), pure business functions — no UI knowledge, no API knowledge.
- **Repository/DTO Layer**: API clients, DTOs (zod schemas), mappers — encapsulates all data access.

## DTOs

- Define DTOs with zod schemas; infer types with `z.infer<typeof schema>`.
- Never use raw API response shapes in the UI layer.

## Domain Models

- TypeScript `type` with `readonly` properties.
- Business logic lives in pure functions, not components.

## Mappers

- Transform DTOs ↔ Domain Models using a mapper pattern (`IMapper`, below).
- Use `secureParse` (safe zod parse — logs on failure, returns `null`) to validate DTOs before mapping.
- Keep all mapping logic centralized in mapper files.

## Mocking

- Mock data in the repository layer only; gate or remove before production.
- Never mock data inside UI components.

---

# Architecture — Examples & Full Implementations

Full end-to-end example of the three-layer architecture using `secureParse` and `IMapper`.

## Layer Overview

```
UI / View Layer          → components, composables
Domain / Business Layer  → domain models, pure business functions
Repository / DTO Layer   → API clients, zod DTOs, mappers
```

## secureParse

Safe zod parsing wrapper. Returns `null` on failure instead of throwing. Validation errors are logged; callers handle the null case.

```ts
import type { ZodSchema } from 'zod'

export function secureParse<T>(schema: ZodSchema<T>, data: unknown): T | null {
  const result = schema.safeParse(data)
  if (!result.success) {
    console.error('[secureParse] Validation failed:', result.error.issues)
    return null
  }
  return result.data
}
```

Why: prevents uncaught exceptions from invalid API shapes, keeps processing running despite partial data failures, centralizes validation error logging.

## IMapper

```ts
export interface IMapper<TDto, TDomain> {
  fromDto(dto: unknown): TDomain | null
  toDto(domain: TDomain): TDto
}
```

## Complete Example — User Feature

### 1. DTO schema (Repository layer)

```ts
import { z } from 'zod'

export const userDtoSchema = z.object({
  id: z.number(),
  first_name: z.string(),
  last_name: z.string(),
  email: z.string().email(),
  role: z.enum(['admin', 'editor', 'viewer']),
})

export type UserDto = z.infer<typeof userDtoSchema>
```

### 2. Domain model (Domain layer)

```ts
export type User = {
  readonly id: number
  readonly fullName: string
  readonly email: string
  readonly role: 'admin' | 'editor' | 'viewer'
}
```

### 3. Mapper (Repository layer)

```ts
import { secureParse } from './secure-parse'
import { userDtoSchema } from './user.dto'
import type { IMapper } from './mapper.interface'
import type { UserDto } from './user.dto'
import type { User } from '../domain/user.model'

export class UserMapper implements IMapper<UserDto, User> {
  fromDto(dto: unknown): User | null {
    const parsed = secureParse(userDtoSchema, dto)
    if (!parsed) return null
    return {
      id: parsed.id,
      fullName: `${parsed.first_name} ${parsed.last_name}`.trim(),
      email: parsed.email,
      role: parsed.role,
    }
  }

  toDto(domain: User): UserDto {
    const [first_name, ...rest] = domain.fullName.split(' ')
    return {
      id: domain.id,
      first_name,
      last_name: rest.join(' '),
      email: domain.email,
      role: domain.role,
    }
  }
}
```

### 4. Repository (Repository layer)

```ts
import { UserMapper } from './user.mapper'
import type { User } from '../domain/user.model'

const mapper = new UserMapper()

export async function fetchUsers(signal?: AbortSignal): Promise<User[]> {
  const response = await fetch('/api/users', { signal })
  const raw: unknown[] = await response.json()
  return raw
    .map(dto => mapper.fromDto(dto))
    .filter((u): u is User => u !== null)  // drop invalid entries
}
```

### 5. Domain logic (Domain layer)

Pure functions — no fetch, no refs, independently testable.

```ts
import type { User } from './user.model'

export function adminsOf(users: readonly User[]): User[] {
  return users.filter(u => u.role === 'admin')
}
```

### 6. Composable + component (UI/View layer)

The composable owns fetch orchestration (via the repository) and exposes
readonly refs; the component only renders. With a query library (TanStack
Query / Pinia Colada), the composable wraps `useQuery` instead — same
boundary.

```ts
import { ref, readonly, watchEffect, onWatcherCleanup } from 'vue'
import { fetchUsers } from '../repository/user.repository'
import type { User } from '../domain/user.model'

export function useUsers() {
  const users = ref<User[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  watchEffect(async () => {
    const controller = new AbortController()
    onWatcherCleanup(() => controller.abort())  // must be before first await
    loading.value = true
    error.value = null
    try {
      users.value = await fetchUsers(controller.signal)
    } catch (e) {
      if (!controller.signal.aborted) error.value = 'Failed to load users'
    } finally {
      loading.value = false
    }
  })

  return { users: readonly(users), loading: readonly(loading), error: readonly(error) }
}
```

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { useUsers } from '../composables/useUsers'
import { adminsOf } from '../domain/user.logic'

const { users, loading, error } = useUsers()
const admins = computed(() => adminsOf(users.value))
</script>

<template>
  <p v-if="loading">Loading…</p>
  <p v-else-if="error">{{ error }}</p>
  <ul v-else>
    <li v-for="user in admins" :key="user.id">{{ user.fullName }}</li>
  </ul>
</template>
```

## Rules Summary

| Layer | Allowed | Forbidden |
|-------|---------|-----------|
| UI / View | Call composables, bind domain models | API calls, mappers, raw DTOs |
| Domain / Business | Pure logic | UI knowledge, direct API calls |
| Repository / DTO | API clients, `secureParse`, mappers | Business logic, UI knowledge |

## Key Constraints

- `secureParse` only inside `fromDto` — never `schema.parse()`.
- Mapper files own all DTO ↔ domain transformation; no mapping in composables or components.
- Invalid DTOs return `null` from `fromDto`; callers filter nulls with a type guard.
- Domain models use `readonly` properties — treat as immutable.
