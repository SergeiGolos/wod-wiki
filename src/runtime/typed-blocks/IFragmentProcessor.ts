import { ICodeFragment, FragmentType } from '../../core/models/CodeFragment';
import { IRuntimeBlock } from '../contracts/IRuntimeBlock';
import { IScriptRuntime } from '../contracts/IScriptRuntime';

/**
 * A FragmentProcessor is a stateless, cross-cutting unit of logic
 * that operates on any block's fragment bucket.
 *
 * Processors handle concerns that span all block types: analytics,
 * sound cues, history recording, display, and controls.
 *
 * Core execution logic (completion, child dispatch, timer) lives in
 * the typed block subclasses, NOT in processors.
 *
 * ## Lifecycle
 *
 * Processors are invoked by the runtime at key moments:
 * - `onBlockPush` — when a block is pushed onto the stack
 * - `onBlockPop` — when a block is popped from the stack
 * - `onBlockChange` — when a block's fragment state changes (round advance, etc.)
 * - `onTick` — on each clock tick (for time-derived updates)
 */
export interface IFragmentProcessor {
    /** Processor identifier */
    readonly name: string;

    /**
     * Fragment types this processor is interested in.
     * If empty, runs for all blocks.
     * If non-empty, only runs when the block has at least one of these types.
     */
    readonly requiredFragments: FragmentType[];

    /** Called when a block is pushed onto the stack */
    onBlockPush?(
        block: IRuntimeBlock,
        fragments: readonly ICodeFragment[],
        runtime: IScriptRuntime
    ): void;

    /** Called when a block is popped from the stack */
    onBlockPop?(
        block: IRuntimeBlock,
        fragments: readonly ICodeFragment[],
        runtime: IScriptRuntime
    ): void;

    /** Called when a block's fragment state changes */
    onBlockChange?(
        block: IRuntimeBlock,
        fragments: readonly ICodeFragment[],
        runtime: IScriptRuntime
    ): void;

    /** Called on each clock tick */
    onTick?(
        block: IRuntimeBlock,
        fragments: readonly ICodeFragment[],
        runtime: IScriptRuntime
    ): void;
}

/**
 * Registry of active processors for a dialect.
 *
 * The ProcessorRegistry holds the list of processors configured for
 * the current workout dialect and dispatches fragment bucket events
 * to matching processors.
 */
export class ProcessorRegistry {
    private _processors: IFragmentProcessor[] = [];

    constructor(processors: IFragmentProcessor[] = []) {
        this._processors = [...processors];
    }

    add(processor: IFragmentProcessor): void {
        this._processors.push(processor);
    }

    get processors(): readonly IFragmentProcessor[] {
        return this._processors;
    }

    /**
     * Get processors relevant to a block (based on its fragments).
     */
    getMatchingProcessors(fragments: readonly ICodeFragment[]): IFragmentProcessor[] {
        return this._processors.filter(p => {
            if (p.requiredFragments.length === 0) return true;
            return p.requiredFragments.some(req =>
                fragments.some(f => f.fragmentType === req)
            );
        });
    }

    /**
     * Dispatch a lifecycle event to all matching processors.
     */
    dispatchPush(block: IRuntimeBlock, fragments: readonly ICodeFragment[], runtime: IScriptRuntime): void {
        for (const processor of this.getMatchingProcessors(fragments)) {
            processor.onBlockPush?.(block, fragments, runtime);
        }
    }

    dispatchPop(block: IRuntimeBlock, fragments: readonly ICodeFragment[], runtime: IScriptRuntime): void {
        for (const processor of this.getMatchingProcessors(fragments)) {
            processor.onBlockPop?.(block, fragments, runtime);
        }
    }

    dispatchChange(block: IRuntimeBlock, fragments: readonly ICodeFragment[], runtime: IScriptRuntime): void {
        for (const processor of this.getMatchingProcessors(fragments)) {
            processor.onBlockChange?.(block, fragments, runtime);
        }
    }

    dispatchTick(block: IRuntimeBlock, fragments: readonly ICodeFragment[], runtime: IScriptRuntime): void {
        for (const processor of this.getMatchingProcessors(fragments)) {
            processor.onTick?.(block, fragments, runtime);
        }
    }
}
