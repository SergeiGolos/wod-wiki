# Refactor: ParseError Deduplication & IRuntimeSubscription Interface Segregation

- **Issue:** https://github.com/SergeiGolos/wod-wiki/issues/526
- **Number:** #526
- **Created:** 2026-04-29
- **Status:** Ready for Implementation
- **Type:** Refactor
- **Area:** Core types, runtime contracts, Chromecast subscription

## Summary

Eliminates three duplicate `ParseError` definitions by converging all onto the canonical `src/core/types/core.ts`. Extracts `sendAnalyticsSummary` from `IRuntimeSubscription` into a new `ICastSubscription` interface, fixing an ISP violation where `LocalRuntimeSubscription` silently omits a Chromecast-only method.

## Scope

**Modify:**
- `src/core/types/metrics.ts`
- `src/views/runtime/types.ts`
- `src/components/Editor/types/index.ts`
- `src/runtime/contracts/IRuntimeSubscription.ts`
- `src/services/cast/rpc/ChromecastRuntimeSubscription.ts`
- `src/components/cast/ProjectionSyncContext.tsx`

**Create:**
- `src/runtime/contracts/ICastSubscription.ts`
