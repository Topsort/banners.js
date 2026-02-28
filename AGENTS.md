# AGENTS.md

Architecture reference for AI agents. For workflow rules, coding constraints, and patterns to follow, see `CLAUDE.md`.

## Project Overview

`@topsort/banners` is Topsort's official vendor SDK — a Web Component library for rendering banner ads on merchant storefronts via the Topsort retail media platform. It requires a Topsort account and API token; it is not a general-purpose ads library. It handles auctions, rendering, and telemetry automatically. Built with [Lit](https://lit.dev/) and shipped as both ES module and IIFE bundles.

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

## Build & Development

```bash
pnpm install        # Install dependencies
pnpm run dev        # Start Vite dev server (uses index.html)
pnpm run build      # Build ES module + IIFE bundles to dist/
pnpm run lint       # Run Biome linting
pnpm run lint:fix   # Auto-fix lint issues
pnpm run typecheck  # Run tsc --noEmit
pnpm test:run       # Run all tests (CI mode)
```

The `PACKAGE_VERSION` define in `vite.config.ts` injects the npm package version at build time.

## Testing

- **Runner**: Vitest 4.x + jsdom 28.x
- **Config**: `vitest.config.ts` (separate from `vite.config.ts`)
- **Test files**: `src/__tests__/` — 7 files, 69 tests covering all source modules
- **Commands**: `pnpm test` (watch) / `pnpm test:run` (CI)
- **CI**: `.github/workflows/test.yml` runs `pnpm test:run` on every PR

## CI/CD

- **Pull requests** trigger `.github/workflows/lint.yml`: actionlint, typos, tsc, and Biome checks.
- **Pull requests** trigger `.github/workflows/test.yml`: Vitest unit tests.
- **Releases** trigger `.github/workflows/release.yml`: builds and publishes to npm.
