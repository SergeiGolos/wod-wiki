# Metrics Consolidation Migration Guide

**Last Updated:** 2025-12-27  
**Status:** Phase 3 - RuntimeMetric Deprecated

## Overview

The WOD Wiki codebase is consolidating from 6 overlapping metric type systems into a single canonical `ICodeFragment + MetricBehavior` architecture. This guide helps developers migrate from the legacy `RuntimeMetric` system to the new fragment-based system.

## Timeline

- **Phase 1-2 (Complete):** Foundation and dual-path analytics established
- **Phase 3 (Current):** RuntimeMetric marked `@deprecated`, both paths fully functional
- **Q1 2025:** RuntimeMetric still works with deprecation warnings
- **Q2 2025:** RuntimeMetric removed entirely

## Quick Migration Reference

### Metric Collection

**Before (RuntimeMetric):**
```typescript
import { MetricCollector, RuntimeMetric } from './runtime/MetricCollector';

const collector = new MetricCollector();

const metric: RuntimeMetric = {
  exerciseId: 'pushups',
  values: [
    { type: 'repetitions', value: 10, unit: 'reps' },
    { type: 'resistance', value: 100, unit: 'kg' }
  ],
  timeSpans: [{ start: new Date(), stop: new Date() }]
};

collector.collect(metric);
const allMetrics = collector.getMetrics();
```

**After (ICodeFragment):**
```typescript
import { FragmentMetricCollector } from './runtime/FragmentMetricCollector';
import { ICodeFragment, FragmentType } from './core/models/CodeFragment';
import { MetricBehavior } from './types/MetricBehavior';

const collector = new FragmentMetricCollector();

const repFragment: ICodeFragment = {
  type: 'rep',
  fragmentType: FragmentType.Rep,
  value: 10,
  behavior: MetricBehavior.Collected
};

const resistanceFragment: ICodeFragment = {
  type: 'resistance',
  fragmentType: FragmentType.Resistance,
  value: 100,
  behavior: MetricBehavior.Collected
};

collector.collectFragment('block-id', 1, repFragment);
collector.collectFragment('block-id', 1, resistanceFragment);

const allFragments = collector.getAllFragments();
const byBehavior = collector.getFragmentsByBehavior(MetricBehavior.Collected);
```

### Analytics

**Before (RuntimeMetric path):**
```typescript
import { AnalysisService } from './timeline/analytics/AnalysisService';
import { RuntimeMetric } from './runtime/RuntimeMetric';

const service = new AnalysisService();
service.registerEngine(new VolumeProjectionEngine());
service.setExerciseService(exerciseService);

const metrics: RuntimeMetric[] = [ /* ... */ ];
const results = service.runAllProjections(metrics); // ⚠️ Deprecated
```

**After (Fragment path):**
```typescript
import { AnalysisService } from './timeline/analytics/AnalysisService';
import { ICodeFragment } from './core/models/CodeFragment';

const service = new AnalysisService();
service.registerEngine(new VolumeProjectionEngine());
service.setExerciseService(exerciseService);

const fragments: ICodeFragment[] = [ /* ... */ ];
const results = service.runAllProjectionsFromFragments(fragments); // ✅ New method
```

### Display Layer

**Before (RuntimeMetric conversion):**
```typescript
import { metricsToFragments } from './runtime/utils/metricsToFragments';

const metrics: RuntimeMetric[] = [ /* ... */ ];
const fragments = metricsToFragments(metrics); // Bridge utility
// Then display fragments
```

**After (Direct fragment usage):**
```typescript
import { fragmentsToDisplayMetrics } from './clock/utils/fragmentsToDisplayMetrics';
import { MetricBehavior } from './types/MetricBehavior';

const fragments: ICodeFragment[] = block.fragments;

// Convert to display format
const displayMetrics = fragmentsToDisplayMetrics(fragments);

// Or filter by behavior
const collected = fragmentsToDisplayMetrics(
  fragments,
  [MetricBehavior.Collected, MetricBehavior.Recorded]
);
```

## Type Mappings

### MetricValue Type → FragmentType

| RuntimeMetric Value Type | ICodeFragment Type | FragmentType Enum |
|--------------------------|-------------------|-------------------|
| `"repetitions"` | `"rep"` | `FragmentType.Rep` |
| `"resistance"` | `"resistance"` | `FragmentType.Resistance` |
| `"distance"` | `"distance"` | `FragmentType.Distance` |
| `"rounds"` | `"rounds"` | `FragmentType.Rounds` |
| `"time"` | `"timer"` | `FragmentType.Timer` |
| `"effort"` | `"effort"` | `FragmentType.Effort` |
| `"action"` | `"action"` | `FragmentType.Action` |

### MetricBehavior (Consistent across both systems)

| Behavior | Usage |
|----------|-------|
| `MetricBehavior.Defined` | Script-defined values (e.g., "10 reps" in WOD script) |
| `MetricBehavior.Hint` | Suggested values (non-binding) |
| `MetricBehavior.Collected` | User-input values during workout |
| `MetricBehavior.Recorded` | System-recorded values (e.g., elapsed time) |
| `MetricBehavior.Calculated` | Derived/computed values (e.g., volume = reps × weight) |

## Custom Projection Engines

If you've created custom projection engines, update them to support fragments:

**Before:**
```typescript
export class CustomEngine implements IProjectionEngine {
  readonly name = "CustomEngine";
  
  calculate(metrics: RuntimeMetric[], definition: Exercise): ProjectionResult[] {
    // Legacy implementation
  }
}
```

**After (Dual-Path Support):**
```typescript
export class CustomEngine implements IProjectionEngine {
  readonly name = "CustomEngine";
  
  /** @deprecated Use calculateFromFragments() for new code */
  calculate(metrics: RuntimeMetric[], definition: Exercise): ProjectionResult[] {
    // Keep for backward compatibility
  }
  
  calculateFromFragments(
    fragments: ICodeFragment[], 
    exerciseId: string, 
    definition: Exercise
  ): ProjectionResult[] {
    // New implementation using fragments
  }
}
```

## Testing Migration

**Equivalence Tests:**
Our test suite includes equivalence tests (`DualPathEquivalence.test.ts`) that prove both paths produce identical results. Use these as reference when migrating:

```typescript
// Both paths should produce identical results
const metricsResults = service.runAllProjections(metrics);
const fragmentsResults = service.runAllProjectionsFromFragments(fragments);

expect(metricsResults[0].value).toBe(fragmentsResults[0].value);
```

## Common Migration Patterns

### Pattern 1: Converting Existing RuntimeMetric to Fragments

Use the bridge utility during migration:

```typescript
import { metricsToFragments } from './runtime/utils/metricsToFragments';

const legacyMetrics: RuntimeMetric[] = getExistingMetrics();
const fragments = metricsToFragments(legacyMetrics);

// Now use fragment-based APIs
const results = service.runAllProjectionsFromFragments(fragments);
```

### Pattern 2: Creating Fragments from Runtime Data

```typescript
import { ICodeFragment, FragmentType } from './core/models/CodeFragment';
import { MetricBehavior } from './types/MetricBehavior';

function createRepFragment(reps: number, behavior: MetricBehavior): ICodeFragment {
  return {
    type: 'rep',
    fragmentType: FragmentType.Rep,
    value: reps,
    behavior,
    image: `${reps} reps`
  };
}

const collectedReps = createRepFragment(12, MetricBehavior.Collected);
```

### Pattern 3: Filtering Fragments by Behavior

```typescript
const collector = new FragmentMetricCollector();

// Collect various fragments
collector.collectFragment(blockId, 1, definedFragment);    // Defined in script
collector.collectFragment(blockId, 2, collectedFragment);  // User input
collector.collectFragment(blockId, 3, recordedFragment);   // System recorded

// Get only user-collected data
const userMetrics = collector.getFragmentsByBehavior(MetricBehavior.Collected);

// Get multiple behaviors
const displayableMetrics = collector.getFragmentsByBehaviors([
  MetricBehavior.Collected,
  MetricBehavior.Recorded
]);
```

## Deprecated APIs

The following are marked `@deprecated` and will be removed in Q2 2025:

### Types & Interfaces
- `RuntimeMetric` → Use `ICodeFragment`
- `IMetricCollector` → Use `IFragmentMetricCollector`
- `MetricCollector` → Use `FragmentMetricCollector`

### Methods
- `AnalysisService.runAllProjections()` → Use `runAllProjectionsFromFragments()`
- `IProjectionEngine.calculate()` → Implement `calculateFromFragments()`

### Memory Types
- `CurrentMetrics` in `MemoryModels.ts` → Use `block.fragments` directly
- `MemoryTypeEnum.METRICS_CURRENT` → Access fragments from block state

## Breaking Changes (Q2 2025)

When RuntimeMetric is removed entirely, the following will break:

1. **Direct RuntimeMetric usage** - Update to ICodeFragment
2. **MetricCollector instantiation** - Update to FragmentMetricCollector
3. **Legacy analytics calls** - Update to fragment-based methods
4. **Bridge utilities** - `metricsToFragments()` will be removed

## Support & Resources

**Documentation:**
- `METRICS_QUICK_REFERENCE.md` - TL;DR and overview
- `METRICS_AUDIT_SUMMARY.md` - Problem statement
- `METRICS_CONSOLIDATION_PLAN.md` - Implementation details
- `METRICS_TYPE_MAP.md` - Visual dependency map
- `IMPLEMENTATION_ROADMAP.md` - Phase-by-phase plan

**Tests:**
- `FragmentMetricCollector.test.ts` - Fragment collection examples
- `DualPathEquivalence.test.ts` - Proof of equivalence
- `AnalysisService.test.ts` - Both path examples
- `VolumeProjectionEngine.test.ts` - Engine migration example

**Code Examples:**
- `src/clock/utils/fragmentsToDisplayMetrics.ts` - Display conversion
- `src/runtime/FragmentMetricCollector.ts` - Collection implementation
- `src/timeline/analytics/AnalysisService.ts` - Dual-path routing
- `src/timeline/analytics/engines/VolumeProjectionEngine.ts` - Migrated engine

## FAQ

**Q: Do I need to migrate immediately?**  
A: No. Both paths work identically through Q1 2025. You'll see deprecation warnings in your IDE.

**Q: Will my existing analytics break?**  
A: No. Equivalence tests prove both paths produce identical results. Legacy path continues to work.

**Q: Can I use both paths in the same codebase?**  
A: Yes. During Phase 3, both paths are fully supported and tested for equivalence.

**Q: How do I know if I'm using deprecated APIs?**  
A: Look for `@deprecated` JSDoc warnings in your IDE. TypeScript will show warnings for deprecated types.

**Q: What if I find a bug in the fragment path?**  
A: File an issue. The equivalence tests should catch analytical differences, but edge cases may exist.

**Q: How do I migrate custom projection engines?**  
A: Add `calculateFromFragments()` method alongside existing `calculate()`. See VolumeProjectionEngine for reference.

## Contact

For questions or issues during migration:
- File a GitHub issue with the `metrics-consolidation` label
- Reference this guide and the specific deprecated API
- Include code examples showing current vs. desired usage
