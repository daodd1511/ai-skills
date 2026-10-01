# Forms — React Hook Form + zod

**Applies to:** react-hook-form v7, @hookform/resolvers v3–v5, zod v3–v4.
Rules tagged with a version apply only from that version.

## Schema and types

- One schema per form, describing what the inputs produce — usually
  strings, booleans, and date objects — not the DTO. A mapper turns the
  submitted values into a domain model or request DTO.
- (resolvers v5.1+) Needed for zod 4 schemas; below 5.1, `zodResolver`
  accepts only zod 3. Upgrade resolvers rather than working around it.
- (resolvers v5+) When the schema transforms or coerces, its input and
  output types differ. Either let `useForm` infer both from `zodResolver`,
  or pass all three generics. A single generic pins input and output to one
  type and conflicts with the resolver.

  ```ts
  type Input = z.input<typeof schema>;
  type Output = z.output<typeof schema>;
  const form = useForm<Input, unknown, Output>({
    resolver: zodResolver(schema),
    defaultValues,
  });
  ```
- (zod v4+) `z.coerce.*` has input type `unknown`, which leaks into
  `z.input`. Prefer keeping the field a string and converting with
  `.transform()` or in the mapper.

## Values

- Give `defaultValues` for every field. A missing default starts the input
  uncontrolled, and `reset()` has nothing to return to.
- Load server data with the `values` prop, not an effect calling `setValue`
  per field. `values` re-syncs whenever the data changes, so a background
  refetch overwrites edits in progress — add
  `resetOptions: { keepDirtyValues: true }`, or call `reset(data)` once when
  the data first arrives.
- Read live values with `useWatch({ control, name })`, not `watch()`:
  `useWatch` re-renders only the subscribing component and works with the
  React Compiler.

## Inputs

- Native `<input>`: `register('name')`.
- Component-library inputs (MUI `TextField`, `Select`, `Autocomplete`,
  `Checkbox`, …): `Controller`. Pass `field.ref` to the element that receives
  focus, so focus-on-error works:

  ```tsx
  <Controller
    name="email"
    control={control}
    render={({ field: { ref, ...field }, fieldState }) => (
      <TextField
        {...field}
        inputRef={ref}
        label="Email"
        error={fieldState.invalid}
        helperText={fieldState.error?.message}
      />
    )}
  />
  ```
- Show errors next to their field. MUI links `helperText` to the input with
  `aria-describedby`; for native inputs, set `aria-invalid` and
  `aria-describedby` yourself.

## Submit

- Submit through `handleSubmit`, then the query library's mutation. Don't
  combine React Hook Form with `useActionState` or form `action` — they
  compete over submission state.

  ```ts
  const onSubmit = handleSubmit(async values => {
    try {
      await updateUser.mutateAsync(userFormMapper.toDomain(values));
    } catch {
      setError('root.server', { message: 'Could not save. Try again.' });
    }
  });
  ```
- Returning the promise keeps `formState.isSubmitting` true until the
  mutation settles; disable the submit button on it.
- Map field-level server errors (for example a 422 body) onto fields with
  `setError('email', …)`; put everything else on `root.server`.
