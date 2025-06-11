# Dead Code Analysis Report

**Generated:** June 7, 2025  
**Project:** Wod.Wiki  
**Analysis Type:** Unused Class Detection

## Summary

This report identifies **10 dead classes and files** in the Wod.Wiki codebase that are defined but never imported, instantiated, or referenced elsewhere. These classes contribute no functionality and only add maintenance overhead.

## Dead Classes Overview

### Actions (3 classes)
- **IdleStatementAction** - Unused action implementation
- **CompleteTimerAction** - Broken action with invalid imports
- **PopulateMetricsAction** - Empty file

### Input Handlers (1 class)  
- **RestRemainderHandler** - Unused event handler

### Block Strategies (1 class)
- **BlockCompoundStrategy** - Unregistered strategy implementation

### Cast Events (1 class)
- **ReceiverEvent** - Unused Chromecast event class

### Metrics (4 classes + 1 empty file)
- **TotalRepetitionsAggregate** - Unused metrics aggregator
- **RepetitionsByExerciseAggregate** - Unused metrics aggregator  
- **TotalWeightAggregate** - Unused metrics aggregator
- **TotalDistanceAggregate** - Unused metrics aggregator
- **ResultSpanAggregator** - Unused aggregation coordinator
- **MetricCompositionStrategy** - Empty file

### UI Actions (1 class)
- **SetTimerStateAction** - Only used by dead code and tests

---

## Detailed Analysis

### 1. Actions Category

#### IdleStatementAction
- **File:** [`src/core/runtime/actions/IdleStatementAction.ts`](../src/core/runtime/actions/IdleStatementAction.ts)
- **Status:** 🔴 Dead - Never imported or used
- **Description:** Action class for handling idle statements in the runtime
- **Removal Impact:** None - safe to remove

#### CompleteTimerAction  
- **File:** [`src/core/runtime/actions/CompleteTimerAction.ts`](../src/core/runtime/actions/CompleteTimerAction.ts)
- **Status:** 🔴 Dead - Never imported or used + broken imports
- **Description:** Timer completion action with invalid import to non-existent `LeafNodeAction`
- **Removal Impact:** None - safe to remove (also fixes broken import)

#### PopulateMetricsAction
- **File:** [`src/core/runtime/actions/PopulateMetricsAction.ts`](../src/core/runtime/actions/PopulateMetricsAction.ts)
- **Status:** 🔴 Dead - Empty file
- **Description:** Completely empty TypeScript file
- **Removal Impact:** None - should be removed

### 2. Input Handlers Category

#### RestRemainderHandler
- **File:** [`src/core/runtime/inputs/RestRemainderHandler.ts`](../src/core/runtime/inputs/RestRemainderHandler.ts)
- **Status:** 🔴 Dead - Only referenced in comments
- **Description:** Event handler for managing rest periods and remainder time. Contains logic for transitioning from work to rest states.
- **Note:** Has a TODO comment in [`CompleteEvent.ts`](../src/core/runtime/inputs/CompleteEvent.ts) but is never actually used
- **Removal Impact:** None - the logic mentioned in CompleteEvent comments is not implemented

### 3. Block Strategies Category

#### BlockCompoundStrategy
- **File:** [`src/core/runtime/blocks/strategies/BlockCompoundStrategy.ts`](../src/core/runtime/blocks/strategies/BlockCompoundStrategy.ts)
- **Status:** 🔴 Dead - Never registered in RuntimeJitStrategies
- **Description:** Runtime block strategy for handling compound statements
- **Removal Impact:** None - not part of the active strategy registry

### 4. Cast Events Category

#### ReceiverEvent
- **File:** [`src/cast/types/chromecast-events.ts`](../src/cast/types/chromecast-events.ts)
- **Status:** 🔴 Dead - Never imported or instantiated
- **Description:** Chromecast receiver event class implementing `ChromecastReceiverEvent` interface
- **Removal Impact:** None - Chromecast functionality works without this class

### 5. Metrics Category

#### Aggregate Classes (4 classes)
- **Files:** 
  - [`src/core/metrics/ResultSpanAggregates.ts`](../src/core/metrics/ResultSpanAggregates.ts) (contains all 4 classes)
- **Status:** 🔴 Dead - All defined but never used
- **Classes:**
  - `TotalRepetitionsAggregate` - Aggregates total repetition counts
  - `RepetitionsByExerciseAggregate` - Groups repetitions by exercise type  
  - `TotalWeightAggregate` - Sums total weight metrics
  - `TotalDistanceAggregate` - Sums total distance metrics
- **Description:** Metric aggregation implementations extending `ResultSpanAggregateBase`
- **Removal Impact:** None - metrics system works without these aggregators

#### ResultSpanAggregator
- **File:** [`src/core/metrics/ResultSpanAggregator.ts`](../src/core/metrics/ResultSpanAggregator.ts)
- **Status:** 🔴 Dead - Exported but never used
- **Description:** Coordinator class for managing multiple `IResultSpanAggregate` instances
- **Removal Impact:** None - no active aggregation is performed

#### MetricCompositionStrategy
- **File:** [`src/core/metrics/strategies/MetricCompositionStrategy.ts`](../src/core/metrics/strategies/MetricCompositionStrategy.ts)
- **Status:** 🔴 Dead - Empty file
- **Description:** Completely empty TypeScript file
- **Removal Impact:** None - should be removed

### 6. UI Actions Category

#### SetTimerStateAction
- **File:** [`src/core/runtime/outputs/SetTimerStateAction.ts`](../src/core/runtime/outputs/SetTimerStateAction.ts)
- **Status:** 🔴 Dead - Only used by dead `RestRemainderHandler` and tests
- **Description:** Output action for updating timer state UI (countdown, countup, etc.)
- **Removal Impact:** None in production code - only test dependencies

---

## Recommendations

### Immediate Actions
1. **Remove empty files** - `PopulateMetricsAction.ts` and `MetricCompositionStrategy.ts`
2. **Fix broken imports** - Remove `CompleteTimerAction.ts` which imports non-existent code
3. **Clean up metrics** - Remove unused aggregate classes and aggregator

### Secondary Actions  
4. **Remove unused handlers** - `RestRemainderHandler` and `SetTimerStateAction`
5. **Remove unused strategies** - `BlockCompoundStrategy`
6. **Clean cast events** - Remove `ReceiverEvent` class
7. **Remove unused actions** - `IdleStatementAction`

### Testing Impact
- Update tests that reference `SetTimerStateAction` to use alternative implementations
- Remove test files for dead classes where applicable

## File Removal Checklist

- [ ] `src/core/runtime/actions/PopulateMetricsAction.ts` (empty)
- [ ] `src/core/metrics/strategies/MetricCompositionStrategy.ts` (empty)
- [ ] `src/core/runtime/actions/CompleteTimerAction.ts` (broken imports)
- [ ] `src/core/runtime/actions/IdleStatementAction.ts`
- [ ] `src/core/runtime/inputs/RestRemainderHandler.ts`
- [ ] `src/core/runtime/blocks/strategies/BlockCompoundStrategy.ts`
- [ ] Classes in `src/core/metrics/ResultSpanAggregates.ts` (individual removal)
- [ ] `src/core/metrics/ResultSpanAggregator.ts`
- [ ] `src/cast/types/chromecast-events.ts` (ReceiverEvent class)
- [ ] `src/core/runtime/outputs/SetTimerStateAction.ts`

---

*This analysis was performed using comprehensive codebase scanning to identify unused classes and dependencies. Each class was verified through import analysis, instantiation checking, and reference searching.*
