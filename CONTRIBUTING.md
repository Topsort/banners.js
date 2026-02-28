# Contributing to banners.js

Thanks for your interest. Before investing significant effort, open an issue first to discuss what you want to change — it avoids duplicated work and keeps PRs focused.

## Philosophy

**Lightweight first. Ease of use second.** Every new dependency, abstraction, or file must justify its cost against bundle weight and maintenance burden. See [CLAUDE.md](./CLAUDE.md) for the full set of conventions.

## Prerequisites

- Node 20+
- pnpm 9+ (`npm install -g pnpm`)

## Setup

```bash
git clone https://github.com/Topsort/banners.js.git
cd banners.js
pnpm install
```

## Useful scripts

| Script | What it does |
|---|---|
| `pnpm run dev` | Start dev server with the local `index.html` playground |
| `pnpm test` | Run unit tests in watch mode |
| `pnpm test:run` | Run unit tests once |
| `pnpm test:coverage` | Run tests with V8 coverage report |
| `pnpm lint` | Lint and format check (Biome) |
| `pnpm lint:fix` | Auto-fix lint/format issues |
| `pnpm typecheck` | TypeScript type check |
| `pnpm run build` | Build `dist/` |
| `pnpm size` | Check brotli-compressed bundle sizes against limits |

## Pull requests

- **Never commit directly to `main`** — all changes go through a feature branch and PR.
- Keep PRs focused on a single concern. Separate concerns deserve separate PRs.
- If you add or move a package between `dependencies` and `devDependencies`, run `pnpm install` and commit the updated `pnpm-lock.yaml` in the same PR.
- CI runs Biome, TypeScript, Vitest, and a bundle-size guard. All checks must pass before merge.

See [CLAUDE.md](./CLAUDE.md) for naming conventions, key patterns, and constraints.
