# 960 — Cutover Plan: Migrating wod-wiki to @wod-wiki/* Packages

Wayfinder ticket [#960](https://github.com/SergeiGolos/wod-wiki/issues/960) · map [#953](https://github.com/SergeiGolos/wod-wiki/issues/953).
Completes the Wayfinder journey: pins how `wod-wiki` strips duplicate local modules and consumes `@bitcobblers/wod-wiki-core`, `@bitcobblers/wod-wiki-lang`, `@bitcobblers/wod-wiki-wql`, and `@bitcobblers/wod-wiki-ui` as external npm dependencies.

---

## 1. Package Dependency Cutover

### `package.json` Updates
Replace `@bitcobblers/whiteboard-lang` with the scoped packages:
```json
{
  "dependencies": {
    "@bitcobblers/wod-wiki-core": "^0.1.0",
    "@bitcobblers/wod-wiki-lang": "^0.1.0",
    "@bitcobblers/wod-wiki-wql": "^0.1.0",
    "@bitcobblers/wod-wiki-ui": "^0.1.0"
  }
}
```
*(Or `@bitcobblers/wod-wiki-engine` + `@bitcobblers/wod-wiki-ui`)*

### Vite Configuration (`playground/vite.config.ts`)
- **Kill the source alias:** Remove `alias: { '@': resolve(__dirname, '../src') }`.
- **Dedupe helper:** Replace the 12 hand-coded CM/Lezer strings with `CODEMIRROR_SINGLETON_DEPS` imported from `@bitcobblers/wod-wiki-ui`:
  ```ts
  import { CODEMIRROR_SINGLETON_DEPS } from '@bitcobblers/wod-wiki-ui';

  export default defineConfig({
    resolve: {
      dedupe: ['react', 'react-dom', ...CODEMIRROR_SINGLETON_DEPS],
    }
  });
  ```
- **Tailwind v4 Token Scanning:** In `playground/src/index.css`, add:
  ```css
  @source "../node_modules/@bitcobblers/wod-wiki-ui";
  ```

---

## 2. Dead-Code Removal (Clean Cutover)

The following in-repo directories under `src/` are deleted cleanly (no shims, aliases, or duplicate implementations left behind):

| Deleted Local Directory | Replaced By Package |
|---|---|
| `src/core/` (models, contracts, ownership) | `@bitcobblers/wod-wiki-core` |
| `src/grammar/` (Lezer grammars & parsers) | `@bitcobblers/wod-wiki-lang` & `@bitcobblers/wod-wiki-wql` |
| `src/parser/` (parsers, WhiteboardScript, syntax facts) | `@bitcobblers/wod-wiki-lang` & `@bitcobblers/wod-wiki-wql` |
| `src/dialects/` (DialectStack, built-in dialects) | `@bitcobblers/wod-wiki-lang` |
| `src/runtime/` (ScriptRuntime, compiler, behaviors) | `@bitcobblers/wod-wiki-lang` (`@bitcobblers/wod-wiki-lang/react` for hooks) |
| `src/services/analytics/query/` (QueryService, wql AST) | `@bitcobblers/wod-wiki-wql` |
| `src/components/Editor/extensions/` | `@bitcobblers/wod-wiki-ui` |
| `src/components/molecules/analytics/` (charts, tables) | `@bitcobblers/wod-wiki-ui` |
| `src/components/organisms/wql-composer/` | `@bitcobblers/wod-wiki-ui` |

---

## 3. App-Side Seams & Adapters (`playground/src/services/`)

The app wires the pure library interfaces to its persistence storage:

1. **`createPlaygroundQueryService()`**: Factory in `playground/src/services/queryService.ts` providing the `QueryService` instance with concrete IndexedDB adapters (`indexedDbFactStore`, `indexedDbNoteStore`, `indexedDbBlockStore`, `indexedDbResultStore`, `IndexedDBEffortRegistry`).
2. **Rollup Driver (`ensureStoreRollupFacts`)**: Lives in `playground/src/services/analytics/rollupDriver.ts`. Evaluates pure `computeWorkloadRollups` math from `@bitcobblers/wod-wiki-lang` and persists results to the `analytics` IndexedDB store on surface open.
3. **`onResultSaved`**: Wired in playground note/runner routes to call `resultRecorder.saveResult()`.
4. **App Dialect Extensions**: Any custom app-specific sports or editor extensions register via `registerLanguagePack(appPack)` at bootstrap.

---

## 4. Second Consumers in `wod-wiki`

### 1. Markdown Lint CLI (`tools/lint-wods.ts`)
- Updated to import `parseScript` from `@bitcobblers/wod-wiki-lang`.
- Scans `markdown/` (fixes stale `./wod` path).
- Checks all registered dialect fences (`time`, `wod`, `climb`, `log`) headlessly with zero DOM/EditorState overhead.

### 2. Full Markdown Test Suite (`test:markdown`)
- `bun test tests/wods/all-wods.test.ts` runs full parse-compile-run execution across all catalog markdown files using `@bitcobblers/wod-wiki-lang` runtime.

---

## 5. Maintenance & Upstream Contribution Contract

- **Single Source of Truth:** `wod-wiki-engine` is the sole upstream repository for parser, runtime, compiler, WQL, and UI widgets.
- **Bug Fix Workflow:**
  1. Parser/compiler/WQL bug discovered in `wod-wiki` $\rightarrow$ reproduced with a test case in `wod-wiki-engine`.
  2. Fixed in `wod-wiki-engine` $\rightarrow$ release new patch version (or canary tarball).
  3. Version bumped in `wod-wiki/package.json`.
  4. **Strictly prohibited:** Local monkey-patching or duplicate parser logic in `wod-wiki`.

---

## 6. Verification & Parity Gate

Cutover is complete and validated when all four gates pass in `wod-wiki`:
1. `bun run build:app` succeeds with zero unresolved imports.
2. `bun run test` + `bun run test:playground` pass (all unit tests green against npm packages).
3. `bun run test:markdown` passes across all catalog workouts.
4. `bun run test:e2e` and `bun run test:e2e:journal` pass with Playwright.
