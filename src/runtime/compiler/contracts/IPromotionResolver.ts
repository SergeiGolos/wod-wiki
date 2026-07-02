/**
 * IPromotionResolver — the seam that extracts parent-block promotion
 * logic from `JitCompiler`.
 *
 * Phase D of plan-candidates-2-3-4-5 removes a layer violation in
 * `JitCompiler.compile()` where the compiler reaches into
 * `parentBlock.getMetricMemoryByVisibility('promote')` and
 * `behavior.getPromotedFragments(runtime, parentBlock)`.  That code is
 * a runtime concern (it inspects live block state); it does not belong
 * in a `Statement[] → Block` transform.
 *
 * The resolver owns the parent-side projection and returns the metrics
 * that should be injected into the child block's statements.  The
 * `JitCompiler` is left with a one-liner call to `resolvePromotions`.
 */
import type { IRuntimeBlock } from '@/runtime/contracts/IRuntimeBlock';
import type { IRuntimeContext } from '@/runtime/contracts/IRuntimeContext';
import type { IMetric } from '@/core/models/Metric';

export interface PromotionResolution {
    /**
     * Promoted metrics derived from the parent block's memory and any
     * `IMetricPromoter` behaviors attached to it.  Empty when the parent
     * has nothing to promote.
     */
    readonly promotedFragments: readonly IMetric[];
    /**
     * `true` when the resolver computed a non-empty promotion set; the
     * compiler uses this bit to invalidate its strategy-match cache.
     */
    readonly hasPromotions: boolean;
}

export interface IPromotionResolver {
    /**
     * Inspect the parent block (if any) on the runtime stack and return
     * the metrics it wants to inject into the child being compiled.
     */
    resolvePromotions(
        parentBlock: IRuntimeBlock | undefined,
        runtime: IRuntimeContext
    ): PromotionResolution;
}
