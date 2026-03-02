# CLAUDE.md

Instructions for Claude Code working on this repository. See `AGENTS.md` for architecture reference.

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
- Before merging with `--admin`, wait at least **5 minutes** after the last CI check finishes. This gives Bugbot and other async bots time to post their comments. After the wait, check all PR comments (including nested/threaded replies) for unresolved issues before merging.

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
- **Context mode comparator**: `bannerContextHasChanged` checks width, height, newTab, error presence, and banners array length — not deep equality. Changes to these fields trigger re-renders in slots.

## Key Constraints

1. **No shadow DOM** on `topsort-banner` and `topsort-banner-slot` — required for analytics.js compatibility. Do not re-enable it.
2. **`data-ts-clickable` and `data-ts-resolved-bid`** attributes are critical for telemetry — do not remove or rename them.
3. **Fallback banners** (`isFallback: true`) must not have `data-ts-resolved-bid` — omitting it prevents false attribution.
4. **`window.TS.token`** must be set before the component renders — it is checked synchronously in `render()`.
5. **External CDN dependencies**: `analytics.js` and `hls.js` are loaded at runtime from CDNs, not bundled.

## Testing

Every bug fix must be accompanied by a regression test that would have caught the bug. Add it to the relevant file in `src/__tests__/`. The test must fail on the unfixed code and pass after the fix.

Always run `pnpm lint` before committing. Biome enforces both formatting and lint rules — CI will fail if either is violated.

## Dependency Policy

New runtime dependencies require strong justification — every byte matters in a library loaded on e-commerce pages. Prefer native browser APIs and existing Lit utilities. Nothing goes into `dependencies` without discussion.
