# MUI (Material UI)

**Applies to:** `@mui/material` v5–v9 (there is no v8; v7 was followed by
v9). Rules tagged `(vN+)` apply only from that version. Most MUI examples
online are v5; check the installed version before copying one.

## Removed in v9 — never write on v9

On v6–v7 most of these still work but are deprecated; write the
replacement there too.

| Don't write | Write |
|---|---|
| `InputProps`, `inputProps` | `slotProps.input`, `slotProps.htmlInput` |
| `InputLabelProps`, `FormHelperTextProps`, `SelectProps` | `slotProps.inputLabel`, `slotProps.formHelperText`, `slotProps.select` |
| `components`, `componentsProps` | `slots`, `slotProps` |
| System props: `<Box mt={2} color="primary.main">` | `sx={{ mt: 2, color: 'primary.main' }}` |
| `GridLegacy`, `<Grid item xs={6}>` | `<Grid size={6}>` (see Layout) |
| `<Grid direction="column">` | `Stack` |
| Dialog/Modal `disableEscapeKeyDown` | ignore `reason === 'escapeKeyDown'` in `onClose` |
| `...Outline` icons (`DeleteOutline`) | `...Outlined` (`DeleteOutlined`) |
| Combined classes (`.MuiButton-textPrimary`) | `.MuiButton-text.MuiButton-colorPrimary`, or theme `variants` |

On v5, `slotProps` covers only some components; follow the installed
version's API page.

## Layout

- (v7+) `Grid` is the modern grid: `<Grid container spacing={2}>` with
  children `<Grid size={{ xs: 12, md: 6 }}>`; `size="grow"` fills the
  remaining space. No `item` prop.
- On v6, the same component is `Grid2`; on v5, `Unstable_Grid2` with
  `xs`/`md` props.
- Use `Stack` for one-dimensional layouts and `Grid` only for true grids.

## Styling

- Take colors, spacing, radius, and typography from the theme
  (`'primary.main'`, `theme.spacing(2)`), never hard-coded values. That keeps
  dark mode and rebranding a theme change.
- `sx` for one-off styles; `styled()` for a styled component reused in
  several places. `sx` is resolved on every render, so in long lists or
  hot rows, hoist the styles into `styled()`.
- Customize components globally in the theme (`components.MuiButton`,
  `styleOverrides`, `variants`), not with CSS targeting MUI class names.
- (v6+) Define light and dark palettes with `colorSchemes` in
  `createTheme`, and write scheme-specific styles with
  `theme.applyStyles('dark', { … })` rather than branching on
  `theme.palette.mode`.
- (v6+) With `cssVariables: true`, read tokens from `theme.vars` in
  `styled()` and `sx` callbacks so values stay CSS variables.

## Integration

- Router links: `component={RouterLink}` on `Button`, `Link`,
  `ListItemButton`, and so on, so navigation renders a real `<a>`. To make
  it the default, set a `LinkBehavior` in the theme's `MuiLink` and
  `MuiButtonBase` `defaultProps`.
- Forms: MUI inputs are controlled; wire them with `Controller`, not
  `register`. See `forms-rhf.md`.
- Import icons by path (`import DeleteIcon from
  '@mui/icons-material/Delete'`). The barrel re-exports thousands of
  modules and slows dev startup and test runs.

## Accessibility

- `TextField`'s `label` renders a real `<label>`; don't replace it with
  `placeholder`.
- Every `IconButton` gets an `aria-label`.
- `Dialog`, `Drawer`, `Menu`, and `Popover` already trap focus and restore
  it on close. Don't re-implement it; set `aria-labelledby` on `Dialog` to
  the title's `id`.
- Don't remove the focus-visible outline without a replacement.
