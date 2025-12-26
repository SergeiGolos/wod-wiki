# MetricsContext Usage Audit

**Date:** 2025-12-26  
**Status:** CONFIRMED DEAD CODE  
**Decision:** Safe to remove in Phase 3

## Findings

### Search Results

1. **useMetrics() Hook Usage**
   ```bash
   grep -r "useMetrics()" src/ --include="*.ts" --include="*.tsx" | grep -v "MetricsContext.tsx"
   ```
   **Result:** No matches found outside MetricsContext.tsx

2. **MetricsProvider Usage**
   ```bash
   grep -r "MetricsProvider" src/ --include="*.ts" --include="*.tsx"
   ```
   **Result:** Only wrapped in 2 files:
   - `src/components/layout/UnifiedWorkbench.tsx`
   - `src/components/layout/WodWorkbench.tsx`

3. **MetricPoint/SegmentLog Interface Usage**
   - No components consume these types
   - No calls to `startSegment()`, `endSegment()`, `logMetric()`
   - Provider exists but is never utilized

## Conclusion

**MetricsContext is DEAD CODE.** The provider wraps components but the `useMetrics()` hook is never called by any child components.

## Recommendation

- **Phase 3:** Remove the following files:
  - `src/services/MetricsContext.tsx`
  - Remove imports from UnifiedWorkbench.tsx
  - Remove imports from WodWorkbench.tsx

## Risk Assessment

**Risk Level:** LOW  
**Reason:** No active consumers found. Removal will not break any functionality.

## Next Steps

1. Continue Phase 1 with confidence that MetricsContext can be safely removed
2. In Phase 3, remove MetricsContext as part of cleanup
