# AGENTS.md

Instructions and architecture reference for AI agents working on this repository.

## Project Overview

`@topsort/banners` is Topsort's official vendor SDK — a Web Component library for rendering banner ads on merchant storefronts via the Topsort retail media platform. It handles auctions, rendering, and telemetry automatically. Built with [Lit](https://lit.dev/) and shipped as both ES module and IIFE bundles.

## Philosophy

**Lightweight first. Ease of use second.**

Lightweight means: zero unnecessary dependencies, no extra abstractions, minimal bundle size, and active resistance to feature creep. Every new file, abstraction, or dependency must justify its existence against bundle weight and maintenance cost. Prefer editing existing files over creating new ones. Keep the component surface area small.

Ease of use means the library must be a `<script>` tag and two HTML attributes away from working. Do not make users think.

**Vendor SDK, not a general-purpose library**: banners.js is Topsort's official Web Component SDK. It requires a Topsort account and API token to function. Contributions should serve merchants integrating with Topsort's retail media platform — not generalize the library for other use cases.

## Git Workflow

- Never commit directly to `main`. All changes go through a feature branch and pull request.
- Keep PRs focused on a single concern — separate concerns deserve separate PRs.
- After moving a package between `dependencies` and `devDependencies` in `package.json`, always run `pnpm install` and commit the updated `pnpm-lock.yaml` in the same PR. CI runs `pnpm install --frozen-lockfile` and will fail if they are out of sync.
- Admin override (`gh pr merge --admin`) is only appropriate to bypass the **review requirement** when all CI checks pass. Never use it to force-merge a PR with failing CI — fix the failures first. Before using `--admin`, check whether the repo allows it (e.g. `gh api repos/{owner}/{repo}` or branch protection settings). If admin override is not permitted or you cannot verify it is, do not merge — ask the user instead.
- Keep branches up to date with `main` before merging — rebase or merge `main` into your branch to resolve conflicts locally, not in the merge commit.
- Use [Conventional Commits](https://www.conventionalcommits.org/) for all commit messages (e.g., `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`).
- Never approve or merge a PR that has unresolved review comments — address or explicitly dismiss each one first. Always check nested/threaded comments (e.g. replies under bot comments) as they may contain substantive issues not visible at the top level.
- Before merging with `--admin`, wait at least **5 minutes** after the PR is opened. This gives CI, Bugbot, and other async bots time to run and post their comments. After the wait, check all PR comments (including nested/threaded replies) for unresolved issues before merging.

## Pull Requests

Before creating or updating a PR, check whether the cumulative branch diff
(`git diff <base>...HEAD`) changes anything the README documents: installation and usage (ES module
and IIFE bundle), `<topsort-banner>` and `<topsort-banner-slot>` attributes, styling and CSS
variables, banner behaviors, predefined content mode and its binding convention, context mode, the
`Banner` and `LinkContext` interfaces, the `window.TS_BANNERS` hooks (`getLink`, `resolveLink` and
the rendering overrides), third-party impression tracking, custom user IDs, emitted events, or the
playground and local setup. If it does, update `README.md` in the same PR. If it does not, say so in
the PR body.

## Architecture

### Web Components (Lit)

Three custom elements are defined in `src/index.ts`:

- **`<topsort-banner>`** — Main component. Runs an auction via `@lit/task`, renders the winning banner. Can act as a context provider (`context="true"`) to share auction results with child slots.
- **`<topsort-banner-slot>`** — Consumes banner context from a parent `<topsort-banner>`. Renders a specific winner by `rank` (1-indexed).
- **`<hls-video>`** — Plays HLS video assets. Loads `hls.js` dynamically from CDN via a module-level `loadHls()` function with promise caching.

### Shadow DOM is intentionally disabled

`TopsortBanner` and `TopsortBannerSlot` override `createRenderRoot()` to return `this` instead of a shadow root. This is required so that `@topsort/analytics.js` (loaded externally) can attach event listeners for impression and click tracking.

### Mixin Pattern

`src/mixin.ts` exports `BannerComponent`, a Lit mixin that provides shared reactive properties (`width`, `height`, `slotId`, category filters, `newTab`, etc.) and the `buildAuction()` / `emitEvent()` methods. `TopsortBanner` applies this mixin.

`width` and `height` default to `0` when their attributes are omitted. The default renderer treats `0` as a "not set" sentinel and emits `width:100%` / `height:auto` on the `<img>` (and on the `--ts-banner-width` / `--ts-banner-height` host CSS variables), so a `<topsort-banner>` with no dimensions fills its container at the asset's native aspect ratio rather than rendering 0×0. Dimensions are not part of the `/v2/auctions` request payload — the slot is identified by `slotId` alone.

### Context Provider Pattern

When `context="true"` is set on `<topsort-banner>`, it uses `@lit/context` to provide a `BannerContext` (banners, dimensions, errors) to descendant `<topsort-banner-slot>` elements. The context has a custom change comparator (`bannerContextHasChanged`) that checks width, height, newTab, language, location, error presence, and banners array length, not deep equality. Changes to these fields trigger re-renders in slots. `slotId` rides along on the context for `getLink` but is not compared (it never changes after mount).

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
- Firing a winner's `impressionPixelUrl` (a third-party tracker in the template content) when analytics.js dispatches its `topsort` event with `type: "Impression"` for that bid. The field is excluded from the predefined-content checks via `hasTemplateContent()`.

### Customization Hooks

`window.TS_BANNERS` allows consumers to override rendering functions: `getLink`, `getLoadingElement`, `getErrorElement`, `getNoWinnersElement`, `getBannerElement`. Each function in `src/index.ts` checks the global hook first and falls back to defaults.

Links go through two separate hooks, both receiving a `LinkContext` (`location`, `slotId`, `language`) so they can depend on where the banner renders. `getLink(banner, context)` *generates* a URL and is called only from `getBannerElement` (standard mode). `resolveLink(href, banner, context)` *transforms* a URL the auction supplied and is called only from predefined mode, via the `resolveHref` callback passed into `applyTemplate`, for every binding that resolves to `href`. The callback is injected rather than imported to keep `template.ts` free of a circular dependency on `index.ts`.

Keeping them separate is a back-compat requirement, not a style choice: merchants already using `getLink` in standard mode must not have it silently applied to predefined-mode campaign URLs. `resolveLink` is undefined by default, so predefined mode behaves exactly as before unless a merchant opts in.

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

## Code Conventions

- **Formatting**: 2-space indentation, 100-char line width — enforced by Biome (`pnpm lint`).
- **Naming**: PascalCase for classes/interfaces, camelCase for functions/variables, kebab-case for custom element names and HTML attributes.
- **Properties**: Use Lit `@property` decorators with explicit `attribute` mappings for kebab-case HTML attributes (e.g., `category-id` → `categoryId`).
- **Readonly**: Component properties exposed via attributes are marked `readonly`.
- **Imports**: Organized automatically by Biome — do not manually sort.

## Key Patterns

- **`updated()` for side effects**: Template mutation (`applyTemplate`) and event emission (`emitEvent`) must happen in `updated()`, not `render()`. `render()` must remain pure. Use a guard flag or `changedProperties` transition check to prevent repeated execution.
- **Optional chaining on banner assets**: Always use `banner.asset?.[0]?.content` — direct property access on potentially-undefined nested objects has caused Sentry errors.
- **Predefined content mode**: When `predefined` is set on `<topsort-banner>`, `render()` returns `nothing`. `updated()` calls `applyTemplate()` to mutate the customer's existing markup in place, then emits the event. Fallback: winners with no `content` map fall through to `getBannerElement`.
- **Template bindings**: `data-ts-field` supports explicit `key:target` pairs (e.g. `data-ts-field="mainImage:src"`) and comma-separated multiple bindings (e.g. `data-ts-field="mainImage:src, altText:alt"`). Use `textContent` as the target to set text. A bare key (no colon) falls back to tag-based inference (deprecated) and respects `data-ts-attr`. Attribute targets must already exist on the element — bindings to missing attributes are skipped with a warning.
- **Context mode**: A single `<topsort-banner context>` runs **one** auction and distributes the resulting winners to child `<topsort-banner-slot>` elements via Lit context. Each slot picks its banner by `rank` (1-indexed, always ≥ 1). There is no "second auction" within a context — different placements (separate `<topsort-banner>` elements) each run their own auction independently.

## Key Constraints

1. **No shadow DOM** on `topsort-banner` and `topsort-banner-slot` — required for analytics.js compatibility. Do not re-enable it.
2. **`data-ts-clickable` and `data-ts-resolved-bid`** attributes are critical for telemetry — do not remove or rename them.
3. **Fallback banners** (`isFallback: true`) must not have `data-ts-resolved-bid` — omitting it prevents false attribution.
4. **`window.TS.token`** must be set before the component renders — it is checked synchronously in `render()`.
5. **External CDN dependencies**: `analytics.js` and `hls.js` are loaded at runtime from CDNs, not bundled.

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

Every bug fix must be accompanied by a regression test that would have caught the bug. Add it to the relevant file in `src/__tests__/`. The test must fail on the unfixed code and pass after the fix.

Always run `pnpm lint` before committing. Biome enforces both formatting and lint rules — CI will fail if either is violated.

- **Runner**: Vitest 4.x + jsdom 28.x
- **Config**: `vitest.config.ts` (separate from `vite.config.ts`)
- **Test files**: `src/__tests__/` — 7 files, 69 tests covering all source modules
- **Commands**: `pnpm test` (watch) / `pnpm test:run` (CI)
- **CI**: `.github/workflows/test.yml` runs `pnpm test:run` on every PR

## Dependency Policy

New runtime dependencies require strong justification — every byte matters in a library loaded on e-commerce pages. Prefer native browser APIs and existing Lit utilities. Nothing goes into `dependencies` without discussion.

## CI/CD

- **Pull requests** trigger `.github/workflows/lint.yml`: actionlint, typos, tsc, and Biome checks.
- **Pull requests** trigger `.github/workflows/test.yml`: Vitest unit tests.
- **Releases** trigger `.github/workflows/release.yml`: builds and publishes to npm.
