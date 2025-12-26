# Runtime deprecation impact analysis

## Summary
- Recent changes marked many `RuntimeStack` and `ScriptRuntime` helpers as `@deprecated`. Several UI surfaces, analytics utilities, docs, stories, and tests still rely on them, so removal would cause immediate breakage.
- Highest-risk dependencies are the telemetry getters (`executionLog`, `activeSpans`) and stack shape helpers (`blocksBottomFirst`, `graph`, `getParentBlocks`); debug helpers are used primarily in tests.

## Deprecated APIs and current consumers

### ScriptRuntime
| API | Notes | Observed usage |
| --- | --- | --- |
| `activeSpans` | Previously exposed RuntimeReporter state | UI: `RuntimeHistoryLog` (spansToDisplayItems), `TimerDisplay` (stackItems), docs `docs/tv/*` | 
| `executionLog` | Completed spans list | UI: `RuntimeHistoryLog`, `ExecutionLogPanel`, Analytics: `AnalyticsTransformer` (`transformRuntimeToAnalytics`), docs `docs/tv/*` |
| `getLastUpdatedBlocks` | UI delta helper | No runtime references found (safe to remove after test updates) |
| Debug helpers: `isDebugMode`, `debugStack`, `getWrappedBlocks`, `getWrappedBlock`, `getAllBlockCalls`, `clearAllBlockCalls` | Legacy debug stack access | Only runtime debug tests (`src/runtime/__tests__/RuntimeDebugMode.test.ts`) and testing docs (`src/runtime/testing/index.ts`) |

### RuntimeStack
| API | Notes | Observed usage |
| --- | --- | --- |
| `blocksTopFirst` / `blocksBottomFirst` | Stack order helpers | Story: `stories/compiler/JitCompilerDemo.tsx`; Tests: stack API/disposal/edge-case/performance suites |
| `graph()` | Snapshot of stack | Tests: `tests/runtime-execution/stack/*.test.ts`, `tests/performance/stack-performance.test.ts` |
| `getParentBlocks()` | Parent traversal helper | Tests in `tests/runtime-execution/stack` |
| Debug helpers: `wrappedBlocks`, `getWrappedBlock`, `getAllCalls`, `clearAllCalls`, `cleanupWrappedBlock` | Legacy TestableBlock inspection | Runtime debug tests |
| Internal lifecycle utilities (`validateBlock`, `wrapBlock`, `setStartTime`, `setCompletedTime`, `getTimestamp`, `resolveOwnerKey`, `createDefaultWrapper`, `popRaw`, `runActions`, `safeCall`, `_logDebugEvent`, `setBlocks`) | Marked deprecated but used internally; removal requires refactor of stack internals and dependent tests |

## Impact assessment
- **UI/UX:** `RuntimeHistoryLog`, `ExecutionLogPanel`, and `TimerDisplay` depend on `executionLog`/`activeSpans`. Removing these without a replacement telemetry surface will break history views, timer stack display, and analytics ingestion.
- **Analytics:** `transformRuntimeToAnalytics` assumes `executionLog` plus live stack entries; a new data source or adapter will be needed before removal.
- **Stories:** `stories/compiler/JitCompilerDemo.tsx` relies on `blocksBottomFirst`; story will fail to render if removed without migration to `stack.blocks`.
- **Docs:** `docs/tv/02-web-application-updates.md` and `docs/tv/03-communication-contract.md` describe `executionLog` in payload contracts; documentation must be updated in lockstep with API changes.
- **Tests:** Multiple suites (stack API/edge-cases/disposal/performance) and runtime debug tests exercise the deprecated APIs; these will all fail once APIs are removed or signatures change.

## Migration considerations
- Provide a replacement telemetry surface (e.g., via `runtime.tracker` + `runtime.memory` subscriptions) before removing `executionLog`/`activeSpans`, and add adapters for UI components and analytics.
> 
  
- Replace `blocksTopFirst`/`blocksBottomFirst`/`graph` usage with `stack.blocks` plus explicit reversing or mapping in callers; update stories and tests accordingly.
> Note: `stack.blocks` should be all we need, the UI components that is displaying the stack is going to care about the order.


- For debug helpers, define a supported inspection API (or remove tests) and adjust `runtime/testing` utilities to use the new path.
- Plan a staged removal: deprecate in callers first (UI/tests/docs), add feature flags or shims if needed, then delete deprecated methods.
