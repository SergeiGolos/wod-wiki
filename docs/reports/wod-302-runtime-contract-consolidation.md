# WOD-302 Runtime Contract Consolidation (WOD-226 slice)

Date: 2026-05-13

## Summary

This slice removes the remaining in-repo dependency on the legacy compatibility shim at `src/core/types/runtime.ts` and consolidates contract ownership under `src/runtime/contracts/*`.

## Changes made

1. **Migrated remaining shim consumer**
   - `src/core/types/clock.ts`
   - `import type { TypedMemoryReference } from './runtime';`
   - → `import type { TypedMemoryReference } from '@/runtime/contracts';`

2. **Removed obsolete compatibility file**
   - Deleted: `src/core/types/runtime.ts`

## Canonical owner after this slice

- Runtime contract surface: `src/runtime/contracts/*`
- Barrel entry point for shared imports: `@/runtime/contracts`

## Compatibility shims intentionally retained

- None in `src/core/types` for runtime contracts after this change.

## Verification

- Repository grep confirms no remaining imports of `core/types/runtime`.
- Repository grep confirms no `@/core/types/runtime` deep imports.
- Type-only dependency in `core/types/clock.ts` now points at canonical runtime contracts barrel.

## Parent issue update (WOD-226)

Recommended parent-thread note:

- Completed in WOD-302: migrated the last runtime shim consumer in `src/core/types/clock.ts` to `@/runtime/contracts` and deleted `src/core/types/runtime.ts`.
- Canonical owner for touched runtime shared contracts is now `src/runtime/contracts/*`.
- No compatibility shims retained in `src/core/types` for runtime contracts in this slice.
- Parent can close unless additional external-package/deep-import compatibility guarantees are still required outside this repository.
