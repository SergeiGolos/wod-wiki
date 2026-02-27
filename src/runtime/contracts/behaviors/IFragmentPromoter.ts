import { ICodeFragment } from "../../../core/models/CodeFragment";
import type { IScriptRuntime } from "../IScriptRuntime";
import type { IRuntimeBlock } from "../IRuntimeBlock";

/**
 * Interface for behaviors that provide dynamic fragment promotions to child blocks.
 *
 * During compilation of a child block, the JitCompiler queries the parent block's
 * behaviors for any IFragmentPromoter. These promoters return fragments that
 * should be injected into the child block's statements.
 *
 * This enables "compiler-time" inheritance where the parent's state (e.g. current round,
 * rep scheme index) is used to decorate child blocks during their creation.
 */
export interface IFragmentPromoter {
    /**
     * Returns fragments to be promoted to child blocks.
     * @param runtime The current script runtime
     * @param parentBlock The parent block that is promoting fragments
     * @returns Array of fragments to inject into children
     */
    getPromotedFragments(runtime: IScriptRuntime, parentBlock: IRuntimeBlock): ICodeFragment[];
}

/**
 * Type guard for IFragmentPromoter
 */
export function isFragmentPromoter(behavior: unknown): behavior is IFragmentPromoter {
    return (
        typeof behavior === 'object' &&
        behavior !== null &&
        'getPromotedFragments' in behavior &&
        typeof (behavior as IFragmentPromoter).getPromotedFragments === 'function'
    );
}

/**
 * Type guard for IFragmentPromoter
 */
export function isFragmentPromoter(behavior: unknown): behavior is IFragmentPromoter {
    return (
        typeof behavior === 'object' &&
        behavior !== null &&
        'getPromotedFragments' in behavior &&
        typeof (behavior as IFragmentPromoter).getPromotedFragments === 'function'
    );
}
