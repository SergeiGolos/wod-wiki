# Specification: Workspace Consolidation (Layout, Manifests, Scripts & Configs)

**Ticket:** [#985](https://github.com/SergeiGolos/wod-wiki/issues/985)  
**Date:** 2026-08-26  
**Status:** Decided  

---

## 1. Target Directory Topology

```
wod-wiki/
├── package.json                  # Root workspace manifest (workspaces: ["packages/*", "apps/*"])
├── bun.lock                      # Unified workspace lockfile
├── bunfig.toml                   # Shared bun runtime config
├── tsconfig.base.json            # Base strict compiler configuration (ES2022)
├── tsconfig.json                 # Composite root project referencing all packages & apps
├── vitest.workspace.ts           # Vitest workspace configuration (packages/*)
├── playwright.journal.config.ts  # Playwright E2E configuration (apps/playground)
├── playwright.storybook.config.ts# Playwright E2E configuration (apps/storybook)
├── .eslintrc.json                # Unified workspace ESLint rules
├── .github/                      # Unified CI/CD workflows and actions
├── apps/
│   ├── playground/               # The wod.wiki web application (Private)
│   │   ├── package.json          # @bitcobblers/wod-wiki-playground
│   │   ├── tsconfig.json
│   │   ├── vite.config.ts        # @/ alias points to ./src, imports CODEMIRROR_SINGLETON_DEPS
│   │   ├── vite.receiver.config.ts
│   │   ├── index.html
│   │   ├── receiver-rpc.html
│   │   ├── src/                  # Application source (components, views, stores, panels, services)
│   │   ├── tests/                # Unit test runner (run-isolated.ts, unit-setup.ts)
│   │   └── dist/                 # Production build artifact
│   └── storybook/                # Canonical Component Workbench (Private)
│       ├── package.json          # @bitcobblers/wod-wiki-storybook
│       ├── tsconfig.json
│       ├── vite.config.ts
│       ├── vitest.config.ts
│       ├── aliases.ts            # Source aliases for direct package imports in dev
│       ├── .storybook/           # main.ts, preview.tsx
│       ├── src/                  # Stories & fixtures
│       └── storybook-static/     # Storybook build artifact
├── packages/
│   ├── core/                     # @bitcobblers/wod-wiki-core (Public npm)
│   ├── lang/                     # @bitcobblers/wod-wiki-lang (Public npm)
│   ├── wql/                      # @bitcobblers/wod-wiki-wql (Public npm)
│   ├── engine/                   # @bitcobblers/wod-wiki-engine (Public npm facade + CLI)
│   └── ui/                       # @bitcobblers/wod-wiki-ui (Public npm components & CSS)
├── bench/                        # Performance benchmarks
├── docs/                         # Architecture, ADRs, Research, Specs
├── markdown/                     # Static workout notes & collections
└── scripts/                      # Unified workspace scripts
    ├── stamp-version.ts          # Version stamping across packages/* and apps/*
    ├── generate-static-block-index.ts
    ├── generate-static-shells.ts
    ├── check-architecture-regressions.cjs
    └── check-unused-exports-regressions.cjs
```

---

## 2. Root `package.json` Manifest

```json
{
  "name": "wod-wiki",
  "version": "0.11.0",
  "private": true,
  "type": "module",
  "packageManager": "bun@1.3.14",
  "workspaces": [
    "packages/*",
    "apps/*"
  ],
  "scripts": {
    "version:stamp": "bun scripts/stamp-version.ts",
    "version:bump": "bun scripts/stamp-version.ts --bump",
    "version:prerelease": "bun scripts/stamp-version.ts --prerelease",

    "dev": "bun run --filter '@bitcobblers/wod-wiki-playground' dev",
    "dev:storybook": "bun run --filter '@bitcobblers/wod-wiki-storybook' storybook",
    "dev:all": "bun run --filter '*' dev",

    "build": "bun run build:packages && bun run build:apps",
    "build:packages": "bun run --filter '@bitcobblers/wod-wiki-*' build",
    "build:apps": "bun run --filter '@bitcobblers/wod-wiki-playground' build && bun run --filter '@bitcobblers/wod-wiki-storybook' build",
    "build:app": "bun run --filter '@bitcobblers/wod-wiki-playground' build",
    "build:storybook": "bun run --filter '@bitcobblers/wod-wiki-storybook' build",

    "clean": "bun run --filter '*' clean",
    "typecheck": "bun run --filter '*' typecheck",
    "lint": "eslint packages/*/src apps/*/src --ext .ts,.tsx",

    "test": "bun run test:packages && bun run test:apps",
    "test:packages": "vitest run",
    "test:apps": "bun run test:playground && bun run test:storybook",
    "test:playground": "bun run --filter '@bitcobblers/wod-wiki-playground' test",
    "test:storybook": "bun run --filter '@bitcobblers/wod-wiki-storybook' test",
    "test:e2e": "bun x playwright test --config playwright.journal.config.ts",
    "test:e2e:storybook": "bun x playwright test --config playwright.storybook.config.ts",

    "generate:static-index": "bun run scripts/generate-static-block-index.ts",
    "check:architecture": "node scripts/check-architecture-regressions.cjs && node scripts/check-unused-exports-regressions.cjs",
    "analyze:deps": "bun x madge --extensions ts,tsx --ts-config tsconfig.json --exclude __tests__ --circular apps/playground/src"
  }
}
```

---

## 3. Playground App Package Manifest (`apps/playground/package.json`)

```json
{
  "name": "@bitcobblers/wod-wiki-playground",
  "version": "0.11.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "node ../../node_modules/vite/bin/vite.js --config vite.config.ts",
    "build": "bun x vite build --config vite.config.ts && bun run ../../scripts/generate-static-shells.ts",
    "preview": "node ../../node_modules/vite/bin/vite.js preview --config vite.config.ts",
    "test": "bun tests/run-isolated.ts ./src --preload ./tests/unit-setup.ts",
    "test:components": "bun test tests --preload ./tests/setup.ts",
    "test:coverage": "bun tests/run-isolated.ts ./src --preload ./tests/unit-setup.ts",
    "clean": "rm -rf dist",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@bitcobblers/wod-wiki-core": "^0.11.0",
    "@bitcobblers/wod-wiki-lang": "^0.11.0",
    "@bitcobblers/wod-wiki-wql": "^0.11.0",
    "@bitcobblers/wod-wiki-engine": "^0.11.0",
    "@bitcobblers/wod-wiki-ui": "^0.11.0"
  }
}
```

---

## 4. Cutover Move / Delete / Retain Action Matrix

| Path / Item | Action | Reason |
| --- | --- | --- |
| `playground/*` | `git mv playground/* apps/playground/` | Relocate playground application into `apps/playground/` |
| `src/` | `git mv src apps/playground/src` | Fold root application source into playground package |
| `tests/` | `git mv tests apps/playground/tests` | Move isolated runner and unit test suites into playground package |
| `scripts/use-engine.ts` | **Delete** | Replaced by native Bun workspace protocol (`workspace:*` / `^0.11.0`) |
| `scripts/fix-codemirror-deps.cjs` | **Delete** | CodeMirror singletons enforced cleanly via Vite resolve aliases |
| Root Storybook devDeps | **Delete from root** | Already cleanly isolated inside `apps/storybook/package.json` |
| `packages/*` | **Merged from engine** | Direct merge into `packages/{core,lang,wql,engine,ui}` |
| `apps/storybook` | **Merged from engine** | Direct merge into `apps/storybook` |
| `tsconfig.base.json` | **Adopt from engine** | Provides shared strict TypeScript compiler options for workspace |
| `vitest.workspace.ts` | **Adopt from engine** | Configures multi-package Vitest execution |
| `playwright.storybook.config.ts` | **Adopt from engine** | Canonical Storybook deployed-artifact smoke test configuration |
