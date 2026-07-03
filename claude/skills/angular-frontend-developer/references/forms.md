# Angular Forms Rules

- Prefer **Reactive Forms** over Template-driven forms for all non-trivial forms.
- Define form structure in the component class, not the template.
- Use typed forms (`FormControl<T>`, `FormGroup`) for type safety.
- Validate at the form level; keep validation logic out of components.

## References

- Typed reactive form example: `references/forms.md`

---

# Angular Forms Examples

## Typed Reactive Form

```typescript
import { Component } from '@angular/core'
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms'

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule],
  template: `
    <form [formGroup]="form" (ngSubmit)="handleSubmit()">
      <label for="email">Email</label>
      <input id="email" type="email" formControlName="email" />

      <label for="password">Password</label>
      <input id="password" type="password" formControlName="password" />

      <button type="submit" [disabled]="form.invalid">Log in</button>
    </form>
  `,
})
export class LoginComponent {
  // ✅ Typed FormGroup — value and controls are fully typed
  protected readonly form = new FormGroup({
    email: new FormControl<string>('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    password: new FormControl<string>('', { nonNullable: true, validators: [Validators.required, Validators.minLength(8)] }),
  })

  protected handleSubmit(): void {
    if (this.form.invalid) return
    const { email, password } = this.form.getRawValue()
    // pass to service
  }
}
```