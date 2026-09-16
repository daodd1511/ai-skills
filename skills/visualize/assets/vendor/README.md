# Vendored

| File | Package | Version | License |
|---|---|---|---|
| `dagre.min.js` | [`@dagrejs/dagre`](https://github.com/dagrejs/dagre) (bundles `@dagrejs/graphlib` 4.0.5) | 3.1.1 | MIT, see `dagre.LICENSE` |

Unmodified copy of `dist/dagre.min.js` from the npm tarball. It defines the global
`dagre`. `scripts/build.mjs` strips the `sourceMappingURL` comment when inlining.

To upgrade: `npm pack @dagrejs/dagre@<version>`, copy `dist/dagre.min.js` and `LICENSE`
here, update this table, then rebuild and check the sample pages.
