# Angular Component Rules

## Standalone Components

- Always use standalone components (default in Angular v20+; do not set `standalone: true`).
- Import only what the component directly uses.

## Change Detection

- Always set `changeDetection: ChangeDetectionStrategy.OnPush`.

## State Management in Components

- Use `signal()` for component state.
- Use `computed()` for derived state — never compute values in the template.
- Use `toSignal()` to convert service observables to signals in components when needed.

## Dependency Injection

- Use `inject()` function, not constructor injection.

## Inputs & Outputs

- Use `input()` and `output()` functions instead of `@Input()`/`@Output()` decorators.

## Control Flow

- Use native control flow: `@if`, `@for`, `@switch`.
- Never use `*ngIf`, `*ngFor`, `*ngSwitch`.
- Always provide `track` expression in `@for`.

## Bindings

- Use `[class.active]` and `[style.color]` instead of `ngClass`/`ngStyle`.
- Use `host` object in the component decorator instead of `@HostBinding`/`@HostListener`.

## Images

- Use `NgOptimizedImage` for all static images.

## DOM

- Never access the DOM directly. Use Angular abstractions.

## Environment

- Never import environment files directly in components or services.
- Access environment values through an `AppConfig` service.

## References

- Full component example with signals and native control flow: `references/components.md`

---

# Angular Component Examples

## Modern Component with Signals & Native Control Flow

```typescript
import { Component, ChangeDetectionStrategy, signal, computed, inject } from '@angular/core'
import { finalize } from 'rxjs/operators'
import { UserService } from './user.service'
import { User } from './user.model'

@Component({
  selector: 'app-user-list',
  imports: [],
  template: `
    @if (loading()) { <div>Loading...</div> }
    @for (user of users(); track user.id) {
      <button type="button" (click)="handleSelect(user)" [class.active]="selectedId() === user.id">
        {{ user.name }}
      </button>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.has-users]': 'users().length > 0' },
})
export class UserListComponent {
  private readonly userService = inject(UserService)
  protected readonly users = signal<User[]>([])
  protected readonly loading = signal(false)
  protected readonly selectedId = signal<number | null>(null)

  constructor() {
    this.loading.set(true)
    this.userService.getUsers()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({ next: (u) => this.users.set(u) })
  }

  protected handleSelect(user: User): void {
    this.selectedId.set(user.id)
  }
}
```