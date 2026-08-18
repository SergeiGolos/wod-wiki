# wod-wiki-engine

Standalone Whiteboard Language & WQL engine multi-package Bun workspace.

## Packages

- [`@bitcobblers/wod-wiki-core`](./packages/core)
- [`@bitcobblers/wod-wiki-lang`](./packages/lang)
- [`@bitcobblers/wod-wiki-wql`](./packages/wql)
- [`@bitcobblers/wod-wiki-engine`](./packages/engine)
- [`@bitcobblers/wod-wiki-ui`](./packages/ui)

## Applications

- [`@bitcobblers/wod-wiki-storybook`](./apps/storybook)

## Commands

```bash
bun install            # Install workspace dependencies
bun run build          # Build all packages with tsup (dual ESM/CJS + d.ts)
bun run typecheck      # Check TypeScript types across workspace
bun run lint           # Run ESLint
bun run test           # Run Vitest suite across all packages
bun run pack:all       # Pack all packages into tarballs for interim local consumption
```
