import { IRuntimeBehavior } from '../contracts/IRuntimeBehavior';
import { IBehaviorContext } from '../contracts/IBehaviorContext';
import { IRuntimeAction } from '../contracts/IRuntimeAction';
import { ICodeFragment } from '../../core/models/CodeFragment';

/**
 * SegmentOutputBehavior emits output statements for block execution tracking.
 * 
 * - Emits 'segment' output on mount (block started)
 * - Emits 'completion' output on unmount (block finished)
 * 
 * ## Aspect: Output
 * 
 * This behavior handles standard segment/completion reporting.
 */
export class SegmentOutputBehavior implements IRuntimeBehavior {
    private readonly label?: string;

    constructor(options?: { label?: string }) {
        this.label = options?.label;
    }

    private getFragments(ctx: IBehaviorContext): ICodeFragment[] {
        const displayState = ctx.getMemory('fragment:display');
        if (displayState?.resolved) {
            return [...displayState.resolved];
        }
        const fragmentState = ctx.getMemory('fragment');
        return fragmentState?.groups?.flat() ?? [];
    }

    onMount(ctx: IBehaviorContext): IRuntimeAction[] {
        const fragments = this.getFragments(ctx);

        // Emit segment started output
        ctx.emitOutput('segment', fragments as ICodeFragment[], {
            label: this.label ?? ctx.block.label
        });

        return [];
    }

    onNext(_ctx: IBehaviorContext): IRuntimeAction[] {
        return [];
    }

    onUnmount(ctx: IBehaviorContext): IRuntimeAction[] {
        const fragments = this.getFragments(ctx);

        // Emit completion output
        ctx.emitOutput('completion', fragments as ICodeFragment[], {
            label: this.label ?? ctx.block.label
        });

        return [];
    }

    onDispose(_ctx: IBehaviorContext): void {
        // No cleanup needed
    }
}
