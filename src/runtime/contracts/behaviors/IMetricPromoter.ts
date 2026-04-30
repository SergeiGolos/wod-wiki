import { MetricContainer } from "../../../core/models/MetricContainer";
import type { IScriptRuntime } from "../IScriptRuntime";
import type { IRuntimeBlock } from "../IRuntimeBlock";

/**
 * Interface for behaviors that provide dynamic metrics promotions to child blocks.
 *
 * During compilation of a child block, the JitCompiler queries the parent block's
 * behaviors for any IMetricPromoter. These promoters return metrics that
 * should be injected into the child block's statements.
 *
 * This enables "compiler-time" inheritance where the parent's state (e.g. current round,
 * rep scheme index) is used to decorate child blocks during their creation.
 */
export interface IMetricPromoter {
    /**
     * Returns metrics to be promoted to child blocks.
     * @param runtime The current script runtime
     * @param parentBlock The parent block that is promoting metrics
     * @returns MetricContainer of metrics to inject into children
     */
    getPromotedFragments(runtime: IScriptRuntime, parentBlock: IRuntimeBlock): MetricContainer;
}

/**
 * Type guard for IMetricPromoter
 */
export function isFragmentPromoter(behavior: unknown): behavior is IMetricPromoter {
    return (
        typeof behavior === 'object' &&
        behavior !== null &&
        'getPromotedFragments' in behavior &&
        typeof (behavior as IMetricPromoter).getPromotedFragments === 'function'
    );
}
