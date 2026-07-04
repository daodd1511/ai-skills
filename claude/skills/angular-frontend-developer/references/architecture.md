# Architecture Rules

## Layered Architecture

Maintain strict separation between three layers. Never skip or cross layers.

- **UI/View Layer**: Components, directives, pipes, forms — handles user interaction only. No business logic, no direct API calls.
- **Domain/Business Layer**: Services, domain models (TypeScript types), utility functions — no UI knowledge, no HTTP/API knowledge.
- **Repository/DTO Layer**: API clients, DTOs (zod schemas), mappers — encapsulates all data access.

## DTOs

- Define DTOs with zod schemas; infer types with `z.infer<typeof schema>`.
- Never use raw API response shapes in the UI layer.

## Domain Models

- TypeScript `type` with `readonly` properties.
- Business logic lives in pure functions or domain services, not components.

## Mappers

- Transform DTOs ↔ Domain Models using a mapper pattern (`IMapper`, below).
- Use `secureParse` (safe zod parse — logs on failure, returns `null`) to validate DTOs before mapping.
- Keep all mapping logic centralized in mapper files.

## Mocking

- Mock data in the repository layer only (`of(data).pipe(delay(ms))`); gate or remove before production.
- Never mock data inside UI components.

---

# Architecture — Examples & Full Implementations

Full end-to-end example of the three-layer architecture using `secureParse` and `IMapper`.

## Layer Overview

```
UI / View Layer          → components, templates, forms
Domain / Business Layer  → services, domain models, utilities
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
import type { User } from './user.model'

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

Uses `HttpClient`, validates and maps every payload, drops invalid entries.

```ts
import { Injectable, inject } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { map, type Observable } from 'rxjs'
import { UserMapper } from './user.mapper'
import type { User } from '../domain/user.model'

@Injectable({ providedIn: 'root' })
export class UserRepository {
  private readonly http = inject(HttpClient)
  private readonly mapper = new UserMapper()

  getUsers(): Observable<User[]> {
    return this.http.get<unknown[]>('/api/users').pipe(
      map(raw => raw
        .map(dto => this.mapper.fromDto(dto))
        .filter((u): u is User => u !== null)),  // drop invalid entries
    )
  }

  getUser(id: number): Observable<User | null> {
    return this.http.get<unknown>(`/api/users/${id}`).pipe(
      map(raw => this.mapper.fromDto(raw)),
    )
  }
}
```

### 5. Domain service (Domain layer)

Business rules only — no HTTP, no DTOs.

```ts
import { Injectable, inject } from '@angular/core'
import { map, type Observable } from 'rxjs'
import { UserRepository } from '../repository/user.repository'
import type { User } from './user.model'

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly repo = inject(UserRepository)

  getAdminUsers(): Observable<User[]> {
    return this.repo.getUsers().pipe(
      map(users => users.filter(u => u.role === 'admin')),
    )
  }
}
```

### 6. Component (UI/View layer)

Calls the domain service only; converts to a signal at the boundary
(`toSignal`, v16+). On pre-v16 code use the `async` pipe instead — never a
hand-managed `.subscribe()`.

```ts
import { Component, ChangeDetectionStrategy, inject } from '@angular/core'
import { toSignal } from '@angular/core/rxjs-interop'
import { UserService } from '../domain/user.service'

@Component({
  selector: 'app-admin-list',
  template: `
    @for (user of admins() ?? []; track user.id) {
      <span>{{ user.fullName }}</span>
    } @empty {
      <p>No admins.</p>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminListComponent {
  private readonly userService = inject(UserService)
  protected readonly admins = toSignal(this.userService.getAdminUsers())
}
```

## Rules Summary

| Layer | Allowed | Forbidden |
|-------|---------|-----------|
| UI / View | Call domain services, bind domain models | HTTP calls, mappers, raw DTOs |
| Domain / Business | Pure logic, call repository | UI knowledge, direct HTTP calls |
| Repository / DTO | `HttpClient`, `secureParse`, mappers | Business logic, UI knowledge |

## Key Constraints

- `secureParse` only inside `fromDto` — never `schema.parse()`.
- Mapper files own all DTO ↔ domain transformation; no mapping in services or components.
- Invalid DTOs return `null` from `fromDto`; callers filter nulls with a type guard.
- Domain models use `readonly` properties — treat as immutable.
