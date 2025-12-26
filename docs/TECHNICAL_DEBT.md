# Technical Debt Analysis

This document tracks technical debt items in the WOD Wiki codebase and their remediation status.

## Status Summary

| Category | Original Count | Current Count | Status |
|----------|---------------|---------------|--------|
| `any` Type Usage | 373 occurrences | 290 occurrences | 🟡 In Progress (22% reduced) |

---

## 5. `any` Type Usage

**Overview**: Source files contain explicit `any` type annotations that bypass TypeScript's type safety.

**Original Count**: 373 occurrences across 113 files

**Current Count**: 290 occurrences across ~85 files (22% reduction)

**Explanation**: `any` bypasses TypeScript's type safety, allowing runtime errors that could be caught at compile time. Common in:
- Event handlers
- Third-party library integrations (Chevrotain parser, Monaco editor)
- Complex generic patterns
- Test mocks and fixtures

### Remediation Completed

The following categories have been addressed:

#### Runtime Core Files (`src/runtime/`)
- `IEvent.ts` - Changed `data?: any` to `data?: unknown`
- `NextEvent.ts` - Changed data properties to `unknown`
- `IRuntimeBehavior.ts` - Changed event parameter to proper `IEvent` type
- `NextEventHandler.ts` - Changed event parameter to `IEvent` type
- `IMemoryReference.ts` - Changed `value()` return to `unknown`, subscriptions to `ReadonlyArray<IMemorySubscription<unknown>>`
- `IRuntimeMemory.ts` - Changed subscribe callback parameters to `unknown`
- `RuntimeMemory.ts` - Changed data storage and callbacks to `unknown`
- `FragmentCompilationManager.ts` - Added type guards for effort/text fragments
- `NextAction.ts` - Used `'state' in` check for memory state
- `PopBlockAction.ts` - Used type intersection for optional setError
- `PushBlockAction.ts` - Used type intersection for optional setError
- `IRuntimeBlock.ts` - Changed `getBehavior` to use `unknown[]` args
- `RuntimeBlock.ts` - Fixed `getBehavior` and dispose method

#### Runtime Behaviors and Strategies
- `ActionLayerBehavior.ts` - Changed event parameter to `IEvent`
- `HistoryBehavior.ts` - Added `CurrentMetrics` interface, used `TypedMemoryReference` casts
- `LoopCoordinatorBehavior.ts` - Used `TypedMemoryReference` casts, fixed SpanType ('round' → 'rounds')
- `EffortStrategy.ts` - Added `getExerciseId`/`getExerciseName` helpers, `TypedMemoryReference`
- `GroupStrategy.ts`, `IntervalStrategy.ts`, `RoundsStrategy.ts`, `TimeBoundRoundsStrategy.ts`, `TimerStrategy.ts` - Added `getExerciseId` helper

#### Actions
- `EmitEventAction.ts` - Changed data to `unknown`
- `ErrorAction.ts` - Changed context to `unknown`, used type intersection for errors

#### Core Types
- `CodeFragment.ts` - Changed `value` to `unknown`
- `WodScript.ts` - Added `ParseError` interface
- `core/types/core.ts` - Added `ParseError` interface
- `core/types/editor.ts` - Changed `onMount` to use Monaco editor type

#### Services
- `AnalyticsTransformer.ts` - Added `AnalyticsDataPoint` interface
- `WorkoutEventBus.ts` - Used Window type extension for debug flag
- `AudioService.ts` - Used Window type extension for webkitAudioContext
- `CastManager.ts` - Changed event args to `unknown[]`

#### Parser Files
- `md-timer.ts` - Added `ExtendedParser` interface for Chevrotain
- `timer.visitor.ts` - Added `SemanticError`, `TokenMeta`, improved type safety

#### Components
- `ParsedView.tsx` - Added `ExtendedParser` interface
- `UnifiedWorkbench.tsx` - Used `AnalyticsDataPoint` type
- `AnalyzePanel.tsx` - Used `AnalyticsDataPoint` type
- `TimerFragment.ts` - Typed map callback parameter

### Remaining `any` Usage

The remaining ~290 occurrences fall into these categories:

1. **Test Files (~25 files)**: Test mocks and fixtures commonly use `any` for flexibility
2. **Chevrotain CST Visitor Methods**: CST context types are dynamically generated
3. **Monaco Editor Integration**: Complex editor API types
4. **React Component Props**: Some callback prop types need improvement
5. **Runtime Testing Infrastructure**: Testing harness uses `any` for flexibility

### Recommendations

1. **Immediate Actions**:
   - Continue replacing `any` with `unknown` where value is truly unknown
   - Add type guards for narrowing `unknown` to specific types
   - Use generics where types can be parameterized

2. **Future Actions**:
   - Add `no-explicit-any` ESLint rule when count reaches <50 in source files
   - Create type definitions for Chevrotain CST contexts
   - Improve Monaco editor integration types

### Testing

All changes were validated with:
- `bun run test` - 406 tests passing
- Runtime type checking through actual usage
- No new TypeScript errors introduced

---

*Last updated: 2024-12-26*
