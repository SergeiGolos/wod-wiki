# Metrics Consolidation - Quick Reference Card

## TL;DR

**Problem:** 6 different metric types in parallel instead of 1  
**Solution:** Consolidate to `ICodeFragment` with `MetricBehavior` enum  
**Timeline:** 4 weeks (3-4 sprints)  
**Effort:** 1 engineer FTE or 2 engineers PT  
**Risk:** Medium (breaking changes, but coordinated)

---

## The 6 Metric Types (Quick Overview)

| # | Type | Where | What's Wrong | Action |
|---|------|-------|--------------|--------|
| 1 | **RuntimeMetric** | `src/runtime/` | 27 files depend; immediate conversion to fragments | **DEPRECATE** |
| 2 | **CurrentMetrics** | Memory model | Duplicates block fragments | **REMOVE** |
| 3 | **Metric** | CollectionSpan | Legacy format | **REPLACE** |
| 4 | **MetricPoint** | React Context | Possibly unused | **AUDIT→REMOVE** |
| 5 | **WorkoutMetric** | Markdown editor | Different format | **UNIFY** |
| 6 | **IDisplayMetric** | Display types | Actually OK | **KEEP** ✓ |

---

## Why This Happened

```
Developer wrote: "metricsToFragments() - Legacy bridge, prefer fragments"
                 (Converting RuntimeMetric → ICodeFragment)

Translation:     "We have duplicate systems; use fragments instead"

What happened:   Nobody finished the migration → Both systems alive
```

**Evidence:**
- Bridge conversion code exists (smoking gun)
- EmitMetricAction immediately converts metrics to fragments
- Multiple conflicting MetricValue definitions

---

## What's Already Correct

The codebase ALREADY has the right architecture defined:

```typescript
// src/types/MetricBehavior.ts ✓ CORRECT
enum MetricBehavior {
  Defined = 'defined',       // Script value
  Collected = 'collected',   // User input
  Recorded = 'recorded',     // Runtime-generated
  Calculated = 'calculated'  // Analytics
}

// src/core/models/CodeFragment.ts ✓ CORRECT
interface ICodeFragment {
  fragmentType: FragmentType;
  value?: unknown;
  behavior?: MetricBehavior;   // ← Already has behavior!
  collectionState?: FragmentCollectionState;
}
```

We just need to USE it consistently instead of RuntimeMetric.

---

## The Migration in 4 Phases

### Phase 1 (1 week) - Foundation
- ✓ Unify `MetricValue` type (single definition)
- ✓ Audit if `MetricsContext` is dead code
- ✓ Create fragment→display converter
- ✓ No breaking changes yet

### Phase 2 (2 weeks) - Consolidation
- ✓ Create `FragmentMetricCollector` (fragments-based)
- ✓ Migrate analytics engines (one at a time)
- ✓ Dual-path validation (ensure identical results)
- ✓ Both old & new paths work (parallel operation)

### Phase 3 (1 week) - Cleanup
- ✗ Delete `MetricsContext` (if dead)
- ✗ Remove `CurrentMetrics` memory type
- ✗ Replace `Metric` with fragments in CollectionSpan
- ✗ Update `WorkoutMetric` to use fragments
- ✗ Mark `RuntimeMetric` as deprecated
- ✓ All tests pass, backwards compatible (with warnings)

### Phase 4 (Q2 2025) - Removal
- ✗ Remove `RuntimeMetric` entirely
- ✗ Delete bridge code
- ✗ Simplify analytics pipeline
- ✗ Final cleanup

---

## Key Decisions (Need Your Input)

| Decision | Current | Proposed | Impact |
|----------|---------|----------|--------|
| Keep IDisplayMetric? | ? | YES (good abstraction) | Clarifies display contract |
| MetricsContext dead? | Unknown | Need to audit | Phase 1 blocker |
| How long keep RuntimeMetric? | ∞ | 6 weeks | Affects external clients |
| Need golden-file tests? | Unknown | YES | Validates analytics unchanged |

---

## Files Most Affected

### Critical (Core Logic Change)
```
src/timeline/analytics/AnalysisService.ts          (5-8 days)
src/runtime/blocks/EffortBlock.ts                  (2-3 days)
src/runtime/blocks/RoundsBlock.ts                  (2-3 days)
src/runtime/RuntimeMetric.ts + MetricCollector.ts  (3-4 days)
```

### High (Integration Work)
```
src/types/cast/messages.ts                         (2 days)
src/timeline/analytics/engines/*.ts                (5-6 days - all engines)
```

### Medium (Straightforward Refactor)
```
src/runtime/models/MemoryModels.ts                 (1 day)
src/core/models/CollectionSpan.ts                  (1 day)
src/markdown-editor/types/index.ts                 (1 day)
```

### Low (Cleanup Only)
```
src/services/MetricsContext.tsx                    (1 day - if dead)
src/clock/anchors/MetricAnchor.tsx                 (1 day)
```

---

## Testing Checklist

### Phase 1 Tests
- [ ] MetricValue unified (grep shows no conflicts)
- [ ] Type-check passes (tsc --noEmit)
- [ ] Fragment display converter creates correct IDisplayMetric
- [ ] MetricsContext audit complete (useMetrics usage found/not found)

### Phase 2 Tests
- [ ] FragmentMetricCollector collects/retrieves fragments
- [ ] Analytics engines produce identical results (both paths)
- [ ] Equivalence tests: metricsToMetrics ≈ fragmentsToFragments
- [ ] Performance benchmarks: within 10% (fragments vs RuntimeMetric)
- [ ] All projection tests pass (golden-file tests)

### Phase 3 Tests
- [ ] No MetricsContext references remain (if deleted)
- [ ] CurrentMetrics removed from memory types
- [ ] CollectionSpan uses fragments only
- [ ] WorkoutMetric tests pass with fragment data
- [ ] RuntimeMetric deprecation warning emits in tests

---

## CI/CD Changes Needed

### Add to test matrix
```bash
# During Phase 2: Run BOTH paths
bun run test:metrics-equivalence  # Ensure both generate same results

# During Phase 3: Deprecation warnings
bun run test --env NODE_DEPRECATION_WARNINGS=1

# Post-Phase-3: Lint rule
bun lint --rule "no-runtime-metric-collect"
```

---

## Risk Quick Reference

| Risk | Prob | Impact | Mitigation |
|------|------|--------|-----------|
| State drift (dual paths) | 🟡 MED | 🔴 HIGH | Equivalence tests |
| External API break | 🟡 MED | 🟡 HIGH | Dual-format messages |
| Analytics breaks | 🟢 LOW | 🔴 HIGH | Golden-file tests |
| Perf regression | 🟢 LOW | 🟡 MED | Benchmarking |
| Incomplete migration | 🟢 LOW | 🟡 MED | Lint rules + code review |

---

## Code Examples: Before & After

### Before (Status Quo)

```typescript
// Using RuntimeMetric
const metric: RuntimeMetric = {
  exerciseId: 'bench',
  values: [{ type: 'repetitions', value: 10, unit: 'reps' }],
  timeSpans: [{ start: new Date(), stop: new Date() }]
};

// Also using CurrentMetrics memory
this.metricsRef = this.context.allocate<CurrentMetrics>(
  MemoryTypeEnum.METRICS_CURRENT,
  { 'reps': { value: 10, unit: 'reps', sourceId: blockId } }
);

// Also using fragments
this.block.fragments.push({
  fragmentType: FragmentType.Rep,
  value: 10
});

// Same data in 3 places! 🤦
```

### After (Consolidated)

```typescript
// Single path: Use fragments
this.block.fragments.push({
  fragmentType: FragmentType.Rep,
  value: 10,
  behavior: MetricBehavior.Collected,
  image: '10 reps'
});

// Analytics automatically picks this up
// No separate collection step
// Display layer transforms if needed

// ✓ Single source of truth!
```

---

## Approval Checklist (For Leadership)

- [ ] Technical approach approved
- [ ] 4-week timeline acceptable
- [ ] 1-2 engineer allocation approved
- [ ] Breaking changes to external APIs OK (with coordination)
- [ ] Testing budget for Phase 2 benchmarking
- [ ] Client coordination for cast message changes

---

## Quick Links

**Detailed Documentation:**
- Full plan: `METRICS_CONSOLIDATION_PLAN.md` (1200+ lines)
- Executive summary: `METRICS_AUDIT_SUMMARY.md` (300+ lines)
- Visual reference: `METRICS_TYPE_MAP.md` (400+ lines)

**Code Locations:**
- Target architecture: `src/core/models/CodeFragment.ts`
- MetricBehavior enum: `src/types/MetricBehavior.ts`
- Bridge code: `src/runtime/utils/metricsToFragments.ts`
- Analytics pipeline: `src/timeline/analytics/AnalysisService.ts`

---

## Next Steps

1. **Review** this document + METRICS_AUDIT_SUMMARY.md
2. **Decide** on 5 key decisions above
3. **Approve** timeline and approach
4. **Create** GitHub Issues (Epic + tasks)
5. **Schedule** Phase 1 for next sprint
6. **Kick off** with audit of MetricsContext usage

---

## Questions?

Contact: Architecture Lead / Metrics System Owner

This consolidation is **high-value** (fewer bugs, clearer code, faster feature development), **medium-risk** (coordinated breaking changes), and **achievable in 4 weeks** with standard team resources.

