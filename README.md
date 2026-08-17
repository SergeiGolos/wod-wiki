# wod-wiki-engine

Standalone Whiteboard Language & WQL engine multi-package Bun workspace.

## Packages

- [`@wod-wiki/core`](./packages/core)
- [`@wod-wiki/lang`](./packages/lang)
- [`@wod-wiki/wql`](./packages/wql)
- [`@wod-wiki/engine`](./packages/engine)
- [`@wod-wiki/ui`](./packages/ui)

## Applications

- [`@wod-wiki/storybook`](./apps/storybook)

## Commands

```bash
bun install            # Install workspace dependencies
bun run build          # Build all packages with tsup (dual ESM/CJS + d.ts)
bun run typecheck      # Check TypeScript types across workspace
bun run lint           # Run ESLint
bun run test           # Run Vitest suite across all packages
bun run pack:all       # Pack all packages into tarballs for interim local consumption
```
