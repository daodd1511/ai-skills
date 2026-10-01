# Dates — Luxon

**Applies to:** Luxon v3. No version-gated rules.

## One date type per layer

- DTOs carry ISO 8601 strings, exactly as the API sends them.
- Domain models carry `DateTime`. The mapper converts in both directions;
  components never parse or serialize dates.
- Don't mix `Date` and `DateTime` in domain code. Convert a `Date` from a
  third-party API at the boundary with `DateTime.fromJSDate`.

## Parsing at the boundary

Luxon never throws on bad input: it returns an invalid `DateTime` that
formats as `"Invalid DateTime"`. Check validity where the string enters, in
the DTO schema:

```ts
import { DateTime } from 'luxon';
import { z } from 'zod';

export const isoDateTime = z
  .string()
  .transform(value => DateTime.fromISO(value, { setZone: true }))
  .refine(dateTime => dateTime.isValid, { message: 'Invalid ISO date' });
```

- `setZone: true` keeps the offset the string carries. Without it, Luxon
  converts to the default zone, which is right for display but loses what
  the API said.
- Date-only values (`2026-09-25`, a birthday or a due date) have no time
  zone. Parse them with `DateTime.fromISO(value)` and serialize with
  `toISODate()`, never `toISO()` — a zone shift can move the day.
- Serialize timestamps with `toISO()`, or `toUTC().toISO()` if the API
  expects UTC.

## Zone and locale

- Set `Settings.defaultZone` and `Settings.defaultLocale` once at startup,
  from user settings or the browser. Don't pass a zone at every call site.
- Set `Settings.throwOnInvalid = true` in tests, so an invalid `DateTime`
  fails loudly instead of rendering `"Invalid DateTime"`.
- In tests, pin `Settings.defaultZone` and `Settings.now` so results don't
  depend on the machine's zone or the clock.

## Formatting and arithmetic

- Format with presets for the user's locale
  (`toLocaleString(DateTime.DATE_MED)`); use `toFormat('…')` only for
  fixed formats that must not vary by locale.
- `DateTime` is immutable: `plus`, `set`, and `startOf` return new values.
  That fits `readonly` domain models.
- Compare with `<`/`>` or `hasSame(other, 'day')`, not `===`: two instances
  of the same moment are different objects.

## Forms

- Hold `DateTime | null` in form state and validate with
  `z.custom<DateTime>(v => DateTime.isDateTime(v) && v.isValid)`.
- A native `<input type="date">` produces a string. Keep the form field a
  string and convert in the form mapper, or convert in a `Controller`.

## Query cache tradeoff

TanStack Query's structural sharing reuses references only for plain objects
and arrays. `DateTime` instances make every refetch return new references,
which re-renders every consumer even when nothing changed. Choose one:

- **Map in `queryFn`** (the default in `architecture.md`): simplest, one
  mapping point. Accept the extra re-renders; they rarely matter below a few
  hundred rows.
- **Keep ISO strings in the cache and map in `select`**: preserves
  structural sharing and cache persistence, but `select` runs on every
  render unless it is a stable function reference, and mapping moves out of
  the data layer.

Decide per project and state it in the project's `CLAUDE.md`.
