# WOD Wiki Engine — Domain Context & Architecture

This repository (`wod-wiki-engine`) is a standalone Bun workspace hosting the Whiteboard Language & WQL engine packages, CLI tooling, and development workbench.

## Workspace Topology

```
wod-wiki-engine/
├── package.json              # root workspace config & scripts
├── tsconfig.base.json        # strict shared TypeScript base config (ES2022)
├── tsconfig.json             # workspace composite project references
├── vitest.workspace.ts       # workspace test runner configuration
├── packages/
│   ├── core/                 # @wod-wiki/core (shapes, MetricContainer, ownership)
│   ├── lang/                 # @wod-wiki/lang (parser, runtime, dialects, calc)
│   ├── wql/                  # @wod-wiki/wql (WQL grammar, QueryService)
│   ├── engine/               # @wod-wiki/engine (umbrella re-export + Node CLI runner)
│   └── ui/                   # @wod-wiki/ui (CodeMirror extensions, WQL charts/tables)
├── apps/
│   └── storybook/            # Storybook workbench (in-memory fixtures)
└── .github/
    └── workflows/
        └── ci.yml            # CI validation & GitHub Packages release
```

## Packages

- **`@wod-wiki/core`**: The foundational data vocabulary. Owns `Metric`, `MetricContainer`, statement models, `TimeSpan`, and persistence shape interfaces (`StoredOutputStatement`, `WorkoutResults`, `Note`, `WorkoutResult`, `BlockIndexRow`, `AnalyticsDataPoint`). Zero external runtime dependencies.
- **`@wod-wiki/lang`**: Parser, JIT compiler, runtime, dialect execution, and analytics generation. Exposes headless `parseScript` over raw Lezer, and a `./react` sub-export (`@wod-wiki/lang/react`) for React hooks and runtime contexts.
- **`@wod-wiki/wql`**: Pure query layer over stored analytics facts. Owns WQL grammar, AST parser, `QueryService` over injectable stores (`FactQueryStore`, `ResultLogStore`), and rollup math.
- **`@wod-wiki/engine`**: Umbrella re-export facade convenience package exporting core, lang, and wql, plus the `wod` Node CLI runner (`bin/wod.js`).
- **`@wod-wiki/ui`**: Interactive presentation, CodeMirror editor extensions (`editorPreset`), WQL diagram/table widgets, and `CODEMIRROR_SINGLETON_DEPS` dedupe helper.

## Build & Release Tooling

- **Build**: `tsup` configured for dual ESM (`.mjs`) + CJS (`.cjs`) + `.d.ts` declaration maps with source maps.
- **Testing**: `vitest.workspace.ts` running isolated unit suites per package.
- **Publication**: Published to `@wod-wiki/*` on GitHub Packages (`npm.pkg.github.com/@SergeiGolos`).
