# Performance Budgets

To ensure that Equipose remains fast and accessible for all users, we enforce bundle size budgets in our CI pipeline.

## Bundle Size Budgets

These budgets are defined in `angular.json` and enforced during the production build (`ng build`).

| Bundle Type | Warning Threshold | Error Threshold | Description |
| ----------- | ----------------- | --------------- | ----------- |
| Initial | 2.0 MB | 2.2 MB | The initial payload required to load the application. |
| Component Styles | 4 kB | 8 kB | Maximum size for any single component's CSS. |

## Rationale

- **Accessibility:** Smaller bundle sizes ensure faster load times on slower networks and devices.
- **Regression Detection:** Explicit budgets help us catch accidental inclusion of large dependencies or inefficient code changes early in the development cycle.
- **Maintainability:** Keeping the application lean encourages modular design and efficient use of resources.

## Enforcement

The CI pipeline runs `pnpm run build` as part of the `setup` job. If the bundle size exceeds the `maximumError` threshold, the build will fail, preventing the changes from being merged.
