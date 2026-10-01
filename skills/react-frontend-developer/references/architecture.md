# Architecture — Full Walkthrough

End-to-end example of the three-layer architecture in React + TypeScript:
zod DTO validation at the boundary, plain-function mappers, server state via
TanStack Query.

**Applies to:** TanStack Query v4–v5 and zod v3–v4. Rules tagged `(v5+)`
need TanStack Query v5. The DTO example uses zod 4's `z.email()`; on zod 3,
write `z.string().email()`.

```
UI layer     → components, hooks (consume domain models only)
Domain layer → models, pure business functions
Data layer   → API client, zod DTO schemas, mappers
```

## secureParse

Safe zod parsing wrapper: returns `null` on failure instead of throwing;
errors are logged once at the boundary.

```ts
import type { ZodType } from 'zod';

export function secureParse<T>(schema: ZodType<T>, data: unknown): T | null {
  const result = schema.safeParse(data);
  if (!result.success) {
    console.error('[secureParse] Validation failed:', result.error.issues);
    return null;
  }
  return result.data;
}
```

## 1. DTO schema (data layer)

```ts
import { z } from 'zod';

export const userDtoSchema = z.object({
  id: z.number(),
  first_name: z.string(),
  last_name: z.string(),
  email: z.email(),
  role: z.enum(['admin', 'editor', 'viewer']),
});

export type UserDto = z.infer<typeof userDtoSchema>;
```

## 2. Domain model (domain layer)

```ts
export type User = {
  readonly id: number;
  readonly fullName: string;
  readonly email: string;
  readonly role: 'admin' | 'editor' | 'viewer';
};
```

## 3. Mapper (data layer)

Plain functions own all DTO ↔ domain transformation. Validate with
`secureParse` inside `fromDto`; never `schema.parse()` (throws mid-flight).

```ts
import { secureParse } from './secureParse';
import { userDtoSchema, type UserDto } from './user.dto';
import type { User } from './user.model';

export const userMapper = {
  fromDto(dto: unknown): User | null {
    const parsed = secureParse(userDtoSchema, dto);
    if (parsed === null) {
      return null;
    }
    return {
      id: parsed.id,
      fullName: `${parsed.first_name} ${parsed.last_name}`.trim(),
      email: parsed.email,
      role: parsed.role,
    };
  },

  toDto(user: User): UserDto {
    const [first_name, ...rest] = user.fullName.split(' ');
    return {
      id: user.id,
      first_name,
      last_name: rest.join(' '),
      email: user.email,
      role: user.role,
    };
  },
};
```

## 4. API client (data layer)

Transport failures throw, so the query library sees them as errors. Invalid
entries are dropped with a type guard, not thrown.

```ts
import { userMapper } from './user.mapper';
import type { User } from './user.model';

export async function fetchUsers(): Promise<User[]> {
  const response = await fetch('/api/users');
  // fetch resolves on 4xx/5xx; without this, an error body reaches the mapper.
  if (!response.ok) {
    throw new Error(`GET /api/users failed: ${response.status}`);
  }
  const raw: unknown = await response.json();
  if (!Array.isArray(raw)) {
    throw new Error('GET /api/users: expected an array');
  }
  return raw
    .map(dto => userMapper.fromDto(dto))
    .filter((user): user is User => user !== null);
}
```

With axios, drop the `ok` check: axios rejects on non-2xx by default. Keep
the array check — axios types `data` as whatever you claim, not what arrived.

## 5. Query options and hooks (server-state boundary)

Server state lives in the query library — components never fetch directly.
Define each query once with `queryOptions` (v5+), so hooks, loaders, and
`invalidateQueries` share one key and one `queryFn`.

```ts
import { queryOptions, useQuery } from '@tanstack/react-query';

import { fetchUser, fetchUsers } from '../api/user.api';

export const userQueryKeys = {
  all: ['users'] as const,
  list: () => [...userQueryKeys.all, 'list'] as const,
  detail: (id: number) => [...userQueryKeys.all, 'detail', id] as const,
};

export const userQueries = {
  list: () =>
    queryOptions({ queryKey: userQueryKeys.list(), queryFn: fetchUsers }),
  detail: (id: number) =>
    queryOptions({
      queryKey: userQueryKeys.detail(id),
      queryFn: () => fetchUser(id),
    }),
};

export function useUsers() {
  return useQuery(userQueries.list());
}
```

- Keys are hierarchical: invalidating `userQueryKeys.all` refreshes lists
  and details together. Every variable the `queryFn` reads goes in the key;
  `@tanstack/eslint-plugin-query` enforces this — install it.
- Set a default `staleTime` on the `QueryClient` (for example 30–60 s). The
  default of 0 refetches on every mount and window focus.
- With a data router, prime the cache in the loader with
  `queryClient.ensureQueryData(userQueries.detail(id))` and read it in the
  component with the same options. See `router.md`.
- For Suspense boundaries, use `useSuspenseQuery` (v5+); `data` is then
  never `undefined`.
- (v5+) `isPending` means "no data yet"; v4 called it `isLoading`, and in v5
  `isLoading` means `isPending && isFetching`.
- Keep query data plain JSON when possible: structural sharing only reuses
  references for plain objects and arrays. See `dates-luxon.md` for class
  instances such as `DateTime`.

## 5b. Mutations

```ts
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { updateUser } from '../api/user.api';
import { userQueryKeys } from './user.queries';

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateUser,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: userQueryKeys.all }),
  });
}
```

Return the `invalidateQueries` promise from `onSuccess` so the mutation stays
pending until the refetch finishes; the UI then never shows stale data after
a save.

## 6. Component (UI layer)

Consumes the hook and domain model only — no fetch, no mapper, no DTO.

```tsx
import { useUsers } from '../hooks/useUsers';

export const UserList = () => {
  const { data: users, isPending, isError } = useUsers();

  if (isPending) return <Spinner />;
  if (isError) return <ErrorMessage />;

  return (
    <ul>
      {users.map(user => (
        <li key={user.id}>{user.fullName}</li>
      ))}
    </ul>
  );
};
```

## Rules summary

| Layer | Allowed | Forbidden |
|-------|---------|-----------|
| UI | query hooks, domain models | fetch/axios, mappers, raw DTOs |
| Domain | pure logic | UI knowledge, API calls |
| Data | API clients, `secureParse`, mappers | business logic, UI knowledge |

- `secureParse` only inside `fromDto`; invalid DTOs → `null`, filtered by
  callers with a type guard.
- Mapper functions own all transformation; no mapping in hooks or components.
- Domain models are `readonly` — treat as immutable.
