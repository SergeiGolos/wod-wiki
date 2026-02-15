import { IRuntimeBehavior } from '../contracts/IRuntimeBehavior';
import { IBehaviorContext } from '../contracts/IBehaviorContext';
import { IRuntimeAction } from '../contracts/IRuntimeAction';
import { ICodeFragment } from '../../core/models/CodeFragment';

/**
 * SegmentOutputBehavior emits a 'segment' output on mount to announce
 * that a block has started executing.
 * 
 * ## Aspect: Output
 * 
 * This behavior is the segment output emitter. It does NOT emit completion
 * outputs — block results are captured via `fragment:result` memory by
 * other behaviors (e.g., TimerOutputBehavior) and read by consumers
 * (e.g., HistoryRecordBehavior) directly from block memory.
 * 
 * On mount it merges:
 *   1. `fragment:display` — parser-prescribed fragments (the block's identity)
 *   2. Runtime state (round, timer) — container state identity
 * 
 * Blocks that only want milestones (no segment tracking) simply don't
 * include `SegmentOutputBehavior` — they use `RoundOutputBehavior` or
 * `HistoryRecordBehavior` alone.
 */
export class SegmentOutputBehavior implements IRuntimeBehavior {
    private readonly label?: string;

    constructor(options?: { label?: string }) {
        this.label = options?.label;
    }

    private getFragments(ctx: IBehaviorContext): ICodeFragment[] {
        const displayLocs = ctx.block.getMemoryByTag('fragment:display');
        if (displayLocs.length > 0) {
            return displayLocs.flatMap(loc => loc.fragments);
        }
        return [];
    }

    /**
     * Collects runtime state fragments (round, timer) from block memory.
     * These are written by RoundInitBehavior and TimerInitBehavior during
     * their onMount, which runs before SegmentOutputBehavior in the
     * behavior chain.
     *
     * Used to enrich the mount-time 'segment' output with container
     * state identity (e.g., "Round 1/3", "20:00 countdown").
     */
    private getRuntimeStateFragments(ctx: IBehaviorContext): ICodeFragment[] {
        const stateFragments: ICodeFragment[] = [];

        const roundLocs = ctx.block.getMemoryByTag('round');
        if (roundLocs.length > 0) {
            stateFragments.push(...roundLocs.flatMap(loc => loc.fragments));
        }

        const timerLocs = ctx.block.getMemoryByTag('timer');
        if (timerLocs.length > 0) {
            stateFragments.push(...timerLocs.flatMap(loc => loc.fragments));
        }

        return stateFragments;
    }

    onMount(ctx: IBehaviorContext): IRuntimeAction[] {
        const displayFragments = this.getFragments(ctx);
        const stateFragments = this.getRuntimeStateFragments(ctx);

        // Merge display fragments with runtime state fragments.
        // Deduplicate by fragmentType:type to avoid repeats.
        const displayTypes = new Set(displayFragments.map(f => `${f.fragmentType}:${f.type}`));
        const uniqueStateFragments = stateFragments.filter(
            f => !displayTypes.has(`${f.fragmentType}:${f.type}`)
        );
        const fragments = [...displayFragments, ...uniqueStateFragments];

        ctx.emitOutput('segment', fragments as ICodeFragment[], {
            label: this.label ?? ctx.block.label
        });

        return [];
    }

    onNext(_ctx: IBehaviorContext): IRuntimeAction[] {
        return [];
    }

    onUnmount(_ctx: IBehaviorContext): IRuntimeAction[] {
        // No completion output emitted.
        // Block results live in `fragment:result` memory and are
        // consumed directly by interested behaviors / consumers.
        return [];
    }

    onDispose(_ctx: IBehaviorContext): void {
        // No cleanup needed
    }
}
