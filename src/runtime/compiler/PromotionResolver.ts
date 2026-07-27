/**
 * PromotionResolver — concrete implementation of {@link IPromotionResolver}.
 *
 * Lifts the parent-block promotion logic that previously lived inline
 * in `JitCompiler.compile()` (lines 84-123 of the pre-Phase-D code).
 * The compiler becomes a pure `Statement[] → Block` transform; this
 * resolver owns the runtime-side projection.
 */
import type { IRuntimeBlock } from '@/runtime/contracts/IRuntimeBlock';
import type { IRuntimeContext } from '@/runtime/contracts/IRuntimeContext';
import type { IMetric } from '@/core/models/Metric';
import { isFragmentPromoter } from '@/runtime/contracts/behaviors/IMetricPromoter';
import type { IPromotionResolver, PromotionResolution } from './contracts/IPromotionResolver';

export class PromotionResolver implements IPromotionResolver {
    resolvePromotions(
        parentBlock: IRuntimeBlock | undefined,
        runtime: IRuntimeContext
    ): PromotionResolution {
        if (!parentBlock) {
            return { promotedFragments: [], hasPromotions: false };
        }

        // 1. Static promotions from memory (`metrics:promote`, `metrics:rep-target`).
        const promotedLocations = parentBlock.getMetricMemoryByVisibility('promote');
        // Defensive copy — the resolver may append dynamic promotions and
        // we must not mutate the caller's container.
        const promotedFragments: IMetric[] = promotedLocations.flatMap(
            loc => loc.metrics.toArray()
        );

        // 2. Dynamic promotions from behaviors (compiler-time concern).
        // This lets behaviors compute promotions based on current parent
        // state (e.g. current round) regardless of memory update ordering.
        for (const behavior of parentBlock.behaviors) {
            if (!isFragmentPromoter(behavior)) continue;
            const dynamicFragments = behavior.getPromotedFragments(runtime, parentBlock);
            for (const df of dynamicFragments) {
                // Deduplicate: dynamic promotions take precedence over
                // memory-based ones for the same metric type.
                const existingIndex = promotedFragments.findIndex(f => f.type === df.type);
                if (existingIndex !== -1) {
                    promotedFragments[existingIndex] = df;
                } else {
                    promotedFragments.push(df);
                }
            }
        }
        return {
            promotedFragments,
            hasPromotions: promotedFragments.length > 0,
        };
    }
}
