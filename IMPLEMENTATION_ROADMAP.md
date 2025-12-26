# Metrics Consolidation: Implementation Roadmap

## Current Status: Phase 1 Complete ✅

This document provides guidance for completing the remaining phases of the metrics consolidation effort.

---

## Phase 1: Foundation ✅ COMPLETE

**Duration:** 1 day  
**Risk:** LOW  
**Status:** Ready for review

### Deliverables
- [x] MetricsContext audit (confirmed dead code)
- [x] Unified MetricValue definition with enum
- [x] Fragment-to-display converter with tests
- [x] Deprecation warnings added
- [x] Type-check validation passed

### Files Modified
See `PHASE_1_COMPLETION.md` for complete details.

---

## Phase 2: Analytics Migration (NOT STARTED)

**Estimated Duration:** 2-3 weeks  
**Risk:** MEDIUM  
**Complexity:** HIGH

### Prerequisites
- [x] Phase 1 complete and reviewed
- [ ] Stakeholder sign-off on approach
- [ ] Analytics owners consulted
- [ ] Performance benchmarks defined

### Tasks

#### 2.1 FragmentMetricCollector (5 days)
**Files to Create:**
- `src/runtime/FragmentMetricCollector.ts`
- `src/runtime/__tests__/FragmentMetricCollector.test.ts`

**Files to Update:**
- `src/runtime/IScriptRuntime.ts` (add interface)
- `src/runtime/ScriptRuntime.ts` (implement)
- `src/runtime/actions/EmitMetricAction.ts` (use new collector)

**Implementation:**
```typescript
export interface IFragmentMetricCollector {
  collectFragment(blockId: string, sourceId: number, fragment: ICodeFragment): void;
  getCollectedFragments(): ICodeFragment[][];
  getMetricsWithBehavior(behavior: MetricBehavior): ICodeFragment[];
  clear(): void;
}
```

**Testing:**
- Fragment collection from behaviors
- Query by behavior type
- Clear/reset operations
- Parity with RuntimeMetric collector

#### 2.2 Analytics Pipeline Migration (8 days)
**Files to Update:**
- `src/timeline/analytics/IProjectionEngine.ts` (add new method)
- `src/timeline/analytics/AnalysisService.ts` (implement routing)
- `src/timeline/analytics/engines/VolumeProjectionEngine.ts` (implement)
- All other engine files in `src/timeline/analytics/engines/`

**Strategy:**
1. Add `calculateFromFragments()` as new method alongside existing method
2. Keep old `calculate()` method for compatibility
3. Update AnalysisService to call new method when fragments available
4. Migrate engines one by one
5. Add integration tests

**Testing:**
- Equivalence tests (both paths produce same results)
- Performance benchmarks
- Golden-file tests for known workouts

#### 2.3 Cast Message Evolution (2 days)
**Files to Update:**
- `src/types/cast/messages.ts`

**Strategy:**
- Send both formats during transition
- Receivers parse fragments if available, fallback to metrics
- Monitor analytics to track client migration

---

## Phase 3: Cleanup & Deprecation (NOT STARTED)

**Estimated Duration:** 1 week  
**Risk:** LOW  
**Complexity:** MEDIUM

### Prerequisites
- [x] Phase 1 complete
- [ ] Phase 2 complete
- [ ] All clients migrated to fragment format
- [ ] Equivalence tests passing

### Tasks

#### 3.1 Remove MetricsContext (1 day)
**Evidence:** `METRICS_CONTEXT_AUDIT.md` confirms dead code

**Files to Remove:**
- `src/services/MetricsContext.tsx`

**Files to Update:**
- `src/components/layout/UnifiedWorkbench.tsx` (remove provider)
- `src/components/layout/WodWorkbench.tsx` (remove provider)

#### 3.2 Remove CurrentMetrics (2 days)
**Files to Update:**
- `src/runtime/models/MemoryModels.ts` (remove type)
- `src/runtime/MemoryTypeEnum.ts` (remove entry)
- `src/runtime/blocks/EffortBlock.ts` (remove memory updates)
- `src/runtime/blocks/RoundsBlock.ts` (remove memory updates)

**Testing:**
- Verify live UI updates still work
- Verify block events still emit
- Check memory pressure reduced

#### 3.3 Update CollectionSpan (2 days)
**Files to Update:**
- `src/core/models/CollectionSpan.ts` (remove Metric field)
- `src/clock/anchors/MetricAnchor.tsx` (use fragments)

#### 3.4 Update Markdown Editor (2 days)
**Files to Update:**
- `src/markdown-editor/types/index.ts`

**Strategy:**
Replace `WorkoutMetric[]` with `ICodeFragment[]` and summary aggregations.

#### 3.5 Deprecate RuntimeMetric (2 days)
**Files to Update:**
- `src/runtime/RuntimeMetric.ts` (add @deprecated JSDoc)
- `src/runtime/MetricCollector.ts` (deprecation notice)
- Create `MIGRATION_GUIDE.md`

**Deprecation Timeline:**
- Now: Mark deprecated with migration guide
- Q1 2025: RuntimeMetric still works with warnings
- Q2 2025: Remove entirely

#### 3.6 Rename PerformanceMetrics (1 day)
**Files to Update:**
- `src/runtime-test-bench/types/interfaces.ts`

Rename to `BenchmarkMetrics` to avoid confusion.

---

## Phase 4: Final Removal (Q2 2025)

**Prerequisites:**
- [ ] Phase 3 complete
- [ ] 6+ week buffer period passed
- [ ] All external clients migrated
- [ ] Deprecation warnings in production

### Tasks
1. Remove RuntimeMetric type entirely
2. Remove EmitMetricAction
3. Remove metricsToFragments() bridge
4. Simplify cast messages (fragment-only)
5. Update analytics to remove legacy path

---

## Risk Mitigation

### Dual-Path State Drift
**Risk:** Fragment and RuntimeMetric collection diverge  
**Mitigation:** Equivalence tests during Phase 2

### External API Breaking
**Risk:** Chromecast receivers expect RuntimeMetric  
**Mitigation:** Dual-format messages in Phase 2

### Performance Regression
**Risk:** Fragment collection slower than RuntimeMetric  
**Mitigation:** Benchmark both paths in Phase 2

---

## Testing Strategy

### Phase 2 Tests
```typescript
// Equivalence test
describe('Metrics ↔ Fragments Equivalence', () => {
  it('should convert RuntimeMetric to ICodeFragment and back', () => {
    const metric = createMockRuntimeMetric();
    const fragments = metricsToFragments([metric]);
    const reconstructed = fragmentsToMetric(fragments);
    expect(reconstructed).toDeepEqual(metric);
  });
});
```

### Phase 3 Tests
- No MetricsContext references remain
- CurrentMetrics removed from memory types
- CollectionSpan uses fragments only
- All projection tests pass

---

## Code Review Checklist

For PRs during migration:

- [ ] New metrics use fragments (not RuntimeMetric)
- [ ] MetricsContext not used
- [ ] Only canonical MetricValue imported
- [ ] Tests use fragments where appropriate
- [ ] Deprecation warnings acknowledged

---

## Communication Plan

### Phase 1
- ✅ Complete foundation work
- ✅ Document current state
- ✅ Add deprecation warnings
- 🔄 Get stakeholder review

### Phase 2
- 📧 Notify analytics team before migration
- 📧 Coordinate with Chromecast receiver owners
- 📊 Share performance benchmarks
- 📝 Weekly progress updates

### Phase 3
- 📧 Final warning to external clients
- 📝 Migration guide published
- 🚨 Deprecation warnings in logs

### Phase 4
- 📧 Breaking change announcement
- 📝 Release notes updated
- ✅ Remove deprecated code

---

## Success Metrics

### Phase 1 ✅
- [x] Zero breaking changes
- [x] All tests pass
- [x] Type-check clean for modified files
- [x] Documentation complete

### Phase 2
- [ ] Equivalence tests pass (both paths identical)
- [ ] Performance within 10% of current
- [ ] All projection engines support fragments
- [ ] Cast messages dual-format

### Phase 3
- [ ] All dead code removed
- [ ] Zero uses of deprecated APIs in codebase
- [ ] All tests pass
- [ ] Type-check clean

### Phase 4
- [ ] Single metric system remains (ICodeFragment)
- [ ] Zero references to RuntimeMetric
- [ ] Analytics simplified
- [ ] External clients migrated

---

## Questions & Decisions

### Open Questions
1. **Q:** Should Phase 2 proceed immediately?  
   **A:** Pending stakeholder review of Phase 1

2. **Q:** What performance targets for Phase 2?  
   **A:** Same or better within 10% (proposed)

3. **Q:** Incremental PRs or full consolidation?  
   **A:** Recommend incremental (Phase 1, then Phase 2, then Phase 3)

4. **Q:** Timeline for Phase 4 removal?  
   **A:** Q2 2025 (allows 6 week buffer after Phase 3)

### Decisions Made
- ✅ MetricValue enum added for type safety
- ✅ Legacy types marked deprecated (not removed yet)
- ✅ Fragment-to-display converter created
- ✅ MetricsContext confirmed as dead code

---

## Resources

### Documentation
- `METRICS_QUICK_REFERENCE.md` - Overview and TL;DR
- `METRICS_AUDIT_SUMMARY.md` - Problem statement
- `METRICS_CONSOLIDATION_PLAN.md` - Detailed plan
- `METRICS_TYPE_MAP.md` - Visual dependency map
- `METRICS_CONTEXT_AUDIT.md` - Audit findings
- `PHASE_1_COMPLETION.md` - Phase 1 summary

### Code References
- Target architecture: `src/core/models/CodeFragment.ts`
- MetricBehavior enum: `src/types/MetricBehavior.ts`
- Bridge code: `src/runtime/utils/metricsToFragments.ts`
- Analytics pipeline: `src/timeline/analytics/AnalysisService.ts`

---

**Next Action:** Await stakeholder review of Phase 1 before proceeding to Phase 2.
