# React Router

**Applies to:** React Router v6.4–v8. Rules tagged with a version apply only
from that version.

## Package and mode

- (v7+) Import from `react-router`; DOM-only APIs such as `RouterProvider`
  with `flushSync` support come from `react-router/dom`. On v6, import from
  `react-router-dom`.
- (v8+) `react-router-dom` no longer exists. Rewrite any import of it.
- Identify the mode before writing routing code:
  - **Declarative:** `<BrowserRouter>` + `<Routes>`. No loaders, actions,
    `lazy`, or middleware.
  - **Data:** `createBrowserRouter` + `<RouterProvider>`. Loaders, actions,
    route `lazy`, middleware.
  - **Framework:** `@react-router/dev` Vite plugin, route modules. Its own
    conventions apply; follow the project's.

## Code splitting

- In data mode, split routes with the route's `lazy` property, not
  `React.lazy`: the router then loads route code in parallel with the
  loader instead of after it.
- (v7.5+) Use the object form so each part loads on its own:

  ```ts
  {
    path: 'users/:id',
    lazy: {
      loader: async () => (await import('./user.loader')).loader,
      Component: async () => (await import('./UserPage')).UserPage,
    },
  }
  ```
  Before 7.5, `lazy` is one function returning `{ loader, Component }`.

## Data loading with TanStack Query

When the project uses a query library, the query cache owns server data and
the loader only starts the fetch early.

```ts
export const userLoader =
  (queryClient: QueryClient) =>
  async ({ params }: LoaderFunctionArgs) => {
    const id = Number(params.id);
    await queryClient.ensureQueryData(userQueries.detail(id));
    return null;
  };
```

- Read the data in the component with the same options
  (`useSuspenseQuery(userQueries.detail(id))`), not `useLoaderData`, so
  mutation invalidation updates the page.
- Validate `params` like any external input; a malformed id should send the
  user to the route's error UI, not reach the API.
- (v7+) Return plain values from loaders and actions; `json()` and `defer()`
  are deprecated. Use `data(value, { status })` when you need a status.

## Middleware

- (v8+) Middleware is on by default. On v7.9+, enable it with
  `future: { v8_middleware: true }`; earlier v7 releases only have the
  unstable API, so don't use it there.
- Put cross-route checks (authentication, feature flags) in parent route
  middleware instead of repeating a redirect in every loader.

## URL state

- Keep filters, sorting, pagination, and selected tabs in the URL with
  `useSearchParams`, so reload, back, and shared links all work.
- Parse search params with a zod schema and defaults; users can edit the URL.
- Update with the functional form, `setSearchParams(prev => …)`, so
  concurrent updates don't drop each other's params.

## Navigation and errors

- Navigate with `<Link>` / `<NavLink>`. Use `useNavigate` only after a side
  effect, such as a successful save.
- In data mode, give each top-level route an `ErrorBoundary` (or
  `errorElement`) and show pending navigation with `useNavigation().state`.
- After navigation, move focus to the new page's `<h1>` and let
  `<ScrollRestoration />` (data mode) handle scroll position.
