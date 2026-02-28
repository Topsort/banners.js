# AGENTS.md

## Project Overview

`@topsort/banners` is a Web Component library for rendering banner ads via the Topsort retail media platform. It handles auctions, rendering, and telemetry automatically. Built with [Lit](https://lit.dev/) and shipped as both ES module and IIFE bundles.

## Philosophy

**Lightweight first. Ease of use second.**

Lightweight means: zero unnecessary dependencies, no extra abstractions, minimal bundle size, and active resistance to feature creep. Every new file, abstraction, or dependency must justify its existence against bundle weight and maintenance cost. Prefer editing existing files over creating new ones. Keep the component surface area small.

Ease of use means the library must be a `<script>` tag and two HTML attributes away from working. Do not make users think.

## Architecture

### Web Components (Lit)

Three custom elements are defined in `src/index.ts`:

- **`<topsort-banner>`** — Main component. Runs an auction via `@lit/task`, renders the winning banner. Can act as a context provider (`context="true"`) to share auction results with child slots.
- **`<topsort-banner-slot>`** — Consumes banner context from a parent `<topsort-banner>`. Renders a specific winner by `rank` (1-indexed).
- **`<hls-video>`** — Plays HLS video assets. Loads `hls.js` dynamically from CDN via a module-level `loadHls()` function with promise caching.

### Shadow DOM is intentionally disabled

`TopsortBanner` and `TopsortBannerSlot` override `createRenderRoot()` to return `this` instead of a shadow root. This is required so that `@topsort/analytics.js` (loaded externally) can attach event listeners for impression and click tracking. Do not re-enable shadow DOM on these components.

### Mixin Pattern

`src/mixin.ts` exports `BannerComponent`, a Lit mixin that provides shared reactive properties (`width`, `height`, `slotId`, category filters, `newTab`, etc.) and the `buildAuction()` / `emitEvent()` methods. `TopsortBanner` applies this mixin.

### Context Provider Pattern

When `context="true"` is set on `<topsort-banner>`, it uses `@lit/context` to provide a `BannerContext` (banners, dimensions, errors) to descendant `<topsort-banner-slot>` elements. The context has a custom change comparator (`bannerContextHasChanged`) that checks width, height, newTab, error presence, and banners array length.

### Auction Flow

1. `TopsortBanner.task` calls `buildAuction()` from the mixin to construct the request payload.
2. `runAuction()` in `src/auction.ts` POSTs to `{window.TS.url}/v2/auctions` (defaults to `https://api.topsort.com`).
3. Auth is via `Bearer` token from `window.TS.token`.
4. The `X-UA` header includes the package version (injected at build time via `PACKAGE_VERSION`).
5. `getOpaqueUserId()` from `src/user-id.ts` integrates with `analytics.js` for user identification.

### Telemetry

Telemetry is handled externally by `@topsort/analytics.js`, not by this library. This library cooperates by:

- Disabling shadow DOM so analytics.js can observe DOM events.
- Adding `data-ts-clickable` and `data-ts-resolved-bid` attributes to rendered banners.
- Omitting `data-ts-resolved-bid` on fallback banners (`isFallback`) to prevent false attribution.

### Customization Hooks

`window.TS_BANNERS` allows consumers to override rendering functions: `getLink`, `getLoadingElement`, `getErrorElement`, `getNoWinnersElement`, `getBannerElement`. Each function in `src/index.ts` checks the global hook first and falls back to defaults.

### Error Handling

`src/errors.ts` defines two custom error classes with static type-guard methods:

- `TopsortRequestError` — API errors (includes HTTP `status`).
- `TopsortConfigurationError` — Missing token or slot ID.

Errors are only logged to console in dev mode (`import.meta.env.DEV`).

## Source File Map

| File | Purpose |
|---|---|
| `src/index.ts` | Component definitions, rendering logic, global hooks |
| `src/auction.ts` | Auction API call, device detection |
| `src/mixin.ts` | `BannerComponent` mixin with shared properties |
| `src/types.ts` | `Auction`, `Banner`, `BannerContext`, `HlsConstructor` interfaces |
| `src/errors.ts` | Custom error classes with type guards |
| `src/user-id.ts` | Opaque user ID integration with analytics.js |
| `src/template.ts` | `applyTemplate()` — predefined content mode, mutates customer markup in place |
| `utils/transform-video-urls.ts` | Manifest-to-iframe URL transformer |

## Tech Stack & Tooling

| Tool | Purpose |
|---|---|
| **Lit 3** | Web Components framework |
| **TypeScript** (strict mode, ES2020 target) | Language |
| **Vite** | Bundler — outputs ES module (`.mjs`) and IIFE (`.iife.js`) |
| **Biome** | Linting and formatting |
| **pnpm** | Package manager (enforced via `preinstall` script) |
| **vite-plugin-dts** | TypeScript declaration generation |

## Code Conventions

- **Formatting**: 2-space indentation, 100-char line width (Biome).
- **Naming**: PascalCase for classes/interfaces, camelCase for functions/variables, kebab-case for custom element names and HTML attributes.
- **Properties**: Use Lit `@property` decorators with explicit `attribute` mappings for kebab-case HTML attributes (e.g., `category-id` maps to `categoryId`).
- **Readonly**: Component properties exposed via attributes are marked `readonly`.
- **TypeScript**: Strict mode enabled. `experimentalDecorators` is required for Lit decorators. `useDefineForClassFields: false` is set for Lit compatibility.
- **Imports**: Organized automatically by Biome.

## Build & Development

```bash
pnpm install        # Install dependencies
pnpm run dev        # Start Vite dev server (uses index.html)
pnpm run build      # Build ES module + IIFE bundles to dist/
pnpm run lint       # Run Biome linting
pnpm run lint:fix   # Auto-fix lint issues
pnpm run typecheck  # Run tsc --noEmit
```

The `PACKAGE_VERSION` define in `vite.config.ts` injects the npm package version at build time.

## Testing

- **Runner**: Vitest 4.x + jsdom 28.x
- **Config**: `vitest.config.ts` (separate from `vite.config.ts`)
- **Test files**: `src/__tests__/` — 7 files covering all source modules
- **Commands**: `pnpm test` (watch) / `pnpm test:run` (CI)
- **CI**: `.github/workflows/test.yml` runs `pnpm test:run` on every PR

## CI/CD

- **Pull requests** trigger `.github/workflows/lint.yml`: actionlint, typos, tsc, and Biome checks.
- **Pull requests** trigger `.github/workflows/test.yml`: Vitest unit tests.
- **Releases** trigger `.github/workflows/release.yml`: builds and publishes to npm.

## Git Workflow

- Never commit directly to `main`. All changes must be made on a feature branch and submitted as a pull request.
- After moving a package between `dependencies` and `devDependencies` in `package.json`, always run `pnpm install` and commit the updated `pnpm-lock.yaml` in the same PR. CI runs `pnpm install --frozen-lockfile` and will fail if the lockfile is out of sync with `package.json`.
- Admin override (`gh pr merge --admin`) is only appropriate to bypass the **review requirement** when all CI checks pass. Never use it to force-merge a PR with failing CI checks — fix the failures first.

## Key Patterns

- **`updated()` for side effects**: Template mutation (`applyTemplate`) and event emission (`emitEvent`) must happen in `updated()`, not `render()`. `render()` must remain pure. Use a guard flag or `changedProperties` transition check to prevent repeated execution.
- **Optional chaining on banner assets**: Always use `banner.asset?.[0]?.content` — direct property access on potentially-undefined nested objects has caused Sentry errors.
- **Predefined content mode**: When `predefined` is set on `<topsort-banner>`, `render()` returns `nothing` (skips Lit-managed DOM). `updated()` calls `applyTemplate()` to mutate the customer's existing markup in place, then emits the event. Fallback: winners with no `content` map fall through to `getBannerElement`.
- **Context mode comparator**: `bannerContextHasChanged` checks width, height, newTab, error presence, and banners array length — not deep equality. Changes to these fields trigger re-renders in slots.

## Key Constraints

1. **No shadow DOM** on `topsort-banner` and `topsort-banner-slot` — required for analytics.js compatibility.
2. **`data-ts-clickable` and `data-ts-resolved-bid`** attributes are critical for telemetry — do not remove or rename them.
3. **Fallback banners** (`isFallback: true`) must not have `data-ts-resolved-bid` to avoid false attribution.
4. **`window.TS.token`** must be set before the component renders — it is checked synchronously in `render()`.
5. **External CDN dependencies**: `analytics.js` and `hls.js` are loaded at runtime from CDNs, not bundled.

## Dependency Policy

New runtime dependencies require strong justification — every byte matters in a library loaded on e-commerce pages. Prefer native browser APIs and existing Lit utilities. Nothing goes into `dependencies` without discussion.
