# 957 — Extraction Plan: @bitcobblers/wod-wiki-lang + @bitcobblers/wod-wiki-wql + `wod` CLI

Wayfinder ticket [#957](https://github.com/SergeiGolos/wod-wiki/issues/957) · map
[#953](https://github.com/SergeiGolos/wod-wiki/issues/953). Inputs already locked:
scaffold topology (#954), core inventory (#961), JSON IR (#955 →
`docs/research/json-ir-schemas-2026-08-17.md`), Language Pack API (#956 →
`docs/adr/language-pack-api.md`), `wod` CLI spec (#962).

## 1. Module inventory (grounded)

### Moves to `packages/lang` — as-is (pure TS)
| Source | Notes |
|---|---|
| `src/grammar/whiteboardscript.grammar` + `parser.ts` + `parser.terms.ts` | generated parser; add `generate:whiteboard` (lezer-generator) — source grammar already exists |
| `src/parser/`: `WhiteboardScript.ts`, `parserInstance.ts`, `semantic-classifier.ts`, `syntax-facts.ts`, `wql-vocabulary` **excluded** | parser pipeline minus the CM/seam files below |
| `src/dialects/**` (7 dialects + `units/` + `DialectStack.ts`) | grep-clean: no React, no services |
| `src/runtime/**` except `hooks/`, `context/`, `components/` | ScriptRuntime, RuntimeBlock/Stack/Memory/Clock, compiler/ (incl. `compiler/metrics/`), behaviors/, events/, contracts/, models/, memory/, actions/ |
| `src/core/analytics/**` (engine, profiles, processors, `calc/**`) | pure; `IAnalyticsEngine` contract moves here too (lang-internal per CONTEXT.md) |
| `toStoredOutputStatement` (from `src/components/Editor/types`) | hint logic ⇒ lang; the *shape* already went to core (#961) |
| Rollup **math**: `computeWorkloadRollups`, `dailySessionLoads`, `dayBucket`, wellness computation (split out of `src/services/analytics/rollup/storeRollup.ts`) | uses calc `evaluate`/`LookupRegistry` ⇒ lang. **Resolves map fog.** |

### Moves to `packages/wql` — as-is (pure TS)
| Source | Notes |
|---|---|
| `src/grammar/wql.grammar` + `wql.parser.ts` + terms (+ existing `generate:wql`) | |
| `src/parser/wql-vocabulary.ts` | out of `src/parser/` ⇒ `packages/wql/src/vocabulary.ts` |
| `src/parser/wql-language.ts` | CM `LRLanguage` + completion — headless CM (`state`/`language`/`autocomplete`), no `view`; peer-deps per #954 |
| `src/services/analytics/query/wql.ts`, `wqlSuffix.ts` | parse + AST, pure |
| `src/services/analytics/query/QueryService.ts` **minus defaults** | see seam S3 |
| `src/services/analytics/units.ts` (`convert`, `resolveDisplayUnit`), `workoutDerivation.ts` (`normalizeSummaryFacts`) | grep-clean of React/services; verify at move |
| `src/lib/dashboard/model.ts` | pure, only dep is `wql-vocabulary` ⇒ rides with wql. **Resolves map fog.** |
| effort-registry **pure half**: `types.ts`, `EffortResolver.ts`, `disciplines.ts`, `fuzzyMatch.ts`, `InMemoryEffortRegistry.ts`, `fixtures.ts`, `data/` | `wql` takes `IEffortRegistry` injection |

### Moves behind `@bitcobblers/wod-wiki-lang/react` sub-export
`src/runtime/hooks/**` (8 hooks), `src/runtime/context/RuntimeContext.tsx`, `src/runtime/components/BlockTimerDisplay.tsx` — every React import found in lang-candidate code lives in these three pockets.

### Stays in wod-wiki (app glue)
`IndexedDBEffortRegistry` + Composite's lazy `indexedDBService` arm (app injects the registry); `query/`'s four `indexedDb*Store` defaults + `loadStaticBlockIndex` wiring; `captureSessionRpe`, `sample.ts`, `pr/prDetection`, `services/content/staticBlockIndex`; rollup **driver** (`runStoreRollup`, `ensureStoreRollupFacts`); all persistence; editor CM extensions (#958's ui).

## 2. Seams to cut (the actual work)

- **S1 Headless parse seam** (ticket requirement): new `parseScript(text, opts?)` in lang over raw Lezer `parser.parse(text)`. `lezer-mapper.ts` refactors to take `(tree, source)` instead of `EditorState` (`syntaxTree(state)` callers: `syntax-parser.ts`). `md-timer.ts` (`MdTimerRuntime`) dissolves into the new seam — it exists only to smuggle text through `EditorState` (`md-timer.ts:31-34`). The EditorState path survives **only** for position-aware consumers (linter/autocomplete) and lands in ui (#958).
- **S2 React sub-export**: package `exports` map — `.` (pure) and `./react` (hooks/context/component). Pure consumers (CLI, lint, parse stories) never touch it. Supersedes today's `src/index.ts` core/editor/clock barrel.
- **S3 Store-default inversion**: `QueryService` constructor keeps injected stores; the four module-level `indexedDb*Store` defaults and the `staticBlockIndex` import move to an app-side factory (`createPlaygroundQueryService()` in wod-wiki). wql's module graph gets **zero** IndexedDB imports — the #958/Storybook requirement, proven here.
- **S4 Effort-registry split**: `CompositeEffortRegistry` loses the lazy `import('@/services/db/...')` arm (`CompositeEffortRegistry.ts:37`); the composite takes injected registries; the app composes IndexedDB + InMemory.
- **S5 Rollup split**: math → lang (`analytics/rollup-math`), driver (`StoreRollupStore` IndexedDB default + `ensureStoreRollupFacts` trigger) stays app. Both already injectable — mechanical split.
- **S6 Clock for Node**: `wod run` injects a Node `INowProvider` (the `time-seam.md` ADR's seam); `browserRuntimeNow.ts` stays browser-gated.
- **S7 Test-harness port**: wod-wiki tests run under `bun:test` (`mock.module`, `?real` specifiers); engine repo is Vitest (#954). Moving test files = mechanical `bun:test`→`vitest` translation (`vi.mock`, drop `?real` indirections). Budgeted as its own workstream, not an afterthought.
- **S8 Contract tests**: home = **engine repo workspace root** `tests/contract/` — `WQL_CALC_TARGETS` ↔ lang calc-seeds alignment imports both packages from one `node_modules`. The map fog's "separate-repo world" premise died with the harmonized topology. **Resolves map fog.**

## 3. CLI (`packages/engine`)

`bin/wod.ts` implements #962 verbatim: `parse`/`run`/`query` subcommands; `--corpus|-c`, `--stdin-log`, `--stdin-facts`; `--format json|table|csv`; `-o`; repeatable `--pack <module-spec>` (default export ⇒ `registerLanguagePack`); exit codes 0/1/2/3. Emits via shared `writeIR(kind, data)` helpers (#955 envelope). Table/CSV renderers live in engine (presentation-free string rendering, no React).

## 4. Pack API surface (from #956/ADR)

lang + wql expose their slice registries; `packages/engine` exports `defineLanguagePack` + `registerLanguagePack` (fan-out). Built-in dialects seed the lang registry; CLI `--pack` and Storybook controls register at runtime (live re-read already guaranteed by registry-backed `DialectStack`).

## 5. Mechanics & sequence

1. `git filter-repo` the inventory paths into `wod-wiki-engine` (per #954) — history preserved.
2. Land packages in DAG order: **core** (#961 inventory) → **lang** (S1, S2, S6 + inventory) → **wql** (S3, S4) → **engine** (CLI + pack fan-out + IR writers) → **contract tests** (S8).
3. Port + translate tests per package (S7); each package green in the workspace before the next starts.
4. **Parity gate** (the ticket's verification): golden corpora (Fran, Murph, multi-week journal — #955's catalog) run through (a) current wod-wiki in-repo code and (b) the extracted packages via `wod run`/`wod query`; `data` payloads must match byte-for-byte. Plus: `tools/lint-wods.ts` (repointed at `markdown/`) runs against the packages.

## 6. Stays explicitly out of this ticket

ui extraction + Storybook (#958/#959); wod-wiki cutover wiring (#960 — app-side factories S3/S4/S5 land there); `src/runtime/{adapters,blocks,services,subscriptions}` subdirs move with runtime under the same purity greps as gates, verified at move time.
