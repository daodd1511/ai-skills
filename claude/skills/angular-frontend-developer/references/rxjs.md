# Angular RxJS Rules

## Services Use Observables

- Services own async operations and streaming state via RxJS observables.
- Components consume observables via `toSignal()` or `async` pipe — they do not manage subscriptions directly.

## Subscription Management

- Never subscribe inside another subscribe — use higher-order operators: `switchMap`, `mergeMap`, `concatMap`, `exhaustMap`.
- Always unsubscribe to prevent memory leaks. Prefer `toSignal()` (automatic cleanup) or `takeUntilDestroyed()`.
- Use `finalize()` to reset loading state regardless of success or error.

## Operator Choice

| Use case | Operator |
|---|---|
| Cancel previous on new emission | `switchMap` |
| Allow concurrent | `mergeMap` |
| Queue sequentially | `concatMap` |
| Ignore new while active | `exhaustMap` |

## Error Handling

- Use `catchError` in the pipeline; do not let errors propagate unhandled.
- Expose errors as observable state (e.g., `BehaviorSubject<string | null>`), not thrown exceptions.

## Mock Data

- Mock with `of(data).pipe(delay(ms))` in services during development.
- Remove or gate mocks before production.

## References

- Service with observable state example: `references/rxjs.md`

---

# Angular RxJS Examples

## Service with Observable State

```typescript
import { Injectable, inject } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { BehaviorSubject, EMPTY, Observable } from 'rxjs'
import { map, tap, catchError } from 'rxjs/operators'

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly http = inject(HttpClient)
  private readonly mapper = inject(UserMapper)

  private readonly usersSubject = new BehaviorSubject<User[]>([])
  readonly users$ = this.usersSubject.asObservable()
  readonly activeUsers$ = this.users$.pipe(map(u => u.filter(x => x.isActive)))

  getUsers(): Observable<User[]> {
    return this.http.get<unknown[]>('/users').pipe(
      map(dtos => dtos.map(dto => this.mapper.fromDto(dto))),
      tap(users => this.usersSubject.next(users)),
      catchError(err => { console.error(err); return EMPTY }),
    )
  }
}
```