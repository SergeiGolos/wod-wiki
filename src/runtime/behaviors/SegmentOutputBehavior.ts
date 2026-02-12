import { IRuntimeBehavior } from '../contracts/IRuntimeBehavior';
import { IBehaviorContext } from '../contracts/IBehaviorContext';
import { IRuntimeAction } from '../contracts/IRuntimeAction';
import { ICodeFragment, FragmentType } from '../../core/models/CodeFragment';
import { TimerState } from '../memory/MemoryTypes';
import { calculateElapsed, formatDuration } from '../time/calculateElapsed';

/**
 * SegmentOutputBehavior emits output statements for block execution tracking.
 * 
 * - Emits 'segment' output on mount (block started)
 * - Emits 'completion' output on unmount (block finished)
 * 
 * ## Aspect: Output
 * 
 * This behavior is the single output emitter for segment/completion reporting.
 * On unmount it merges:
 *   1. `fragment:display` — parser-prescribed fragments
 *   2. `fragment:tracked` — runtime-tracked fragments written by other behaviors
 *   3. Elapsed duration — computed from timer spans (pause-aware) or
 *      from executionTiming (wall-clock fallback for non-timer blocks)
 * 
 * This consolidation ensures every block gets a single, rich completion
 * output regardless of whether it has a timer (S5/S6).
 */
export class SegmentOutputBehavior implements IRuntimeBehavior {
    private readonly label?: string;

    constructor(options?: { label?: string }) {
        this.label = options?.label;
    }

    private getFragments(ctx: IBehaviorContext): ICodeFragment[] {
        // Use list-based memory API to get display fragments directly
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

        // Collect round state (e.g., Round 1/3)
        const roundLocs = ctx.block.getMemoryByTag('round');
        if (roundLocs.length > 0) {
            stateFragments.push(...roundLocs.flatMap(loc => loc.fragments));
        }

        // Collect timer state (e.g., 20:00 countdown)
        const timerLocs = ctx.block.getMemoryByTag('timer');
        if (timerLocs.length > 0) {
            stateFragments.push(...timerLocs.flatMap(loc => loc.fragments));
        }

        return stateFragments;
    }

    /**
     * Collects runtime-tracked fragments from block memory.
     * These are written by other behaviors during their onUnmount
     * (which runs before SegmentOutputBehavior in the behavior chain).
     *
     * Used to enrich the unmount-time 'completion' output with runtime data
     * alongside the parser's display fragments.
     */
    private getTrackedFragments(ctx: IBehaviorContext): ICodeFragment[] {
        const trackedLocs = ctx.block.getMemoryByTag('fragment:tracked');
        if (trackedLocs.length > 0) {
            return trackedLocs.flatMap(loc => loc.fragments);
        }
        return [];
    }

    /**
     * Computes an elapsed duration fragment for the completion output.
     * 
     * Strategy:
     * 1. If timer state exists → compute pause-aware elapsed from spans
     * 2. Else if executionTiming exists → compute wall-clock elapsed
     * 3. Else → return null (no timing data available)
     * 
     * This ensures every block (timer or not) gets elapsed time in
     * its completion output (S5/S9).
     */
    private getElapsedFragment(ctx: IBehaviorContext): ICodeFragment | null {
        const now = ctx.clock.now.getTime();
        const timer = ctx.getMemory('timer') as TimerState | undefined;

        if (timer) {
            // Pause-aware elapsed from timer spans
            const elapsed = calculateElapsed(timer, now);
            return {
                type: 'duration',
                fragmentType: FragmentType.Timer,
                value: elapsed,
                image: formatDuration(elapsed),
                origin: 'runtime'
            } as ICodeFragment;
        }

        // Wall-clock fallback for non-timer blocks
        const timing = ctx.block.executionTiming;
        if (timing?.startTime) {
            const endTime = timing.completedAt ?? ctx.clock.now;
            const elapsed = endTime.getTime() - timing.startTime.getTime();
            if (elapsed >= 0) {
                return {
                    type: 'duration',
                    fragmentType: FragmentType.Timer,
                    value: elapsed,
                    image: formatDuration(elapsed),
                    origin: 'runtime'
                } as ICodeFragment;
            }
        }

        return null;
    }

    onMount(ctx: IBehaviorContext): IRuntimeAction[] {
        const displayFragments = this.getFragments(ctx);
        const stateFragments = this.getRuntimeStateFragments(ctx);

        // Merge display fragments with runtime state fragments.
        // Deduplicate by fragmentType to avoid repeats when the same
        // fragment already appears in fragment:display.
        const displayTypes = new Set(displayFragments.map(f => `${f.fragmentType}:${f.type}`));
        const uniqueStateFragments = stateFragments.filter(
            f => !displayTypes.has(`${f.fragmentType}:${f.type}`)
        );
        const fragments = [...displayFragments, ...uniqueStateFragments];

        // Emit segment started output with full state identity
        ctx.emitOutput('segment', fragments as ICodeFragment[], {
            label: this.label ?? ctx.block.label
        });

        return [];
    }

    onNext(_ctx: IBehaviorContext): IRuntimeAction[] {
        return [];
    }

    onUnmount(ctx: IBehaviorContext): IRuntimeAction[] {
        const displayFragments = this.getFragments(ctx);
        const trackedFragments = this.getTrackedFragments(ctx);

        // Merge display fragments with runtime-tracked fragments (S5).
        // Deduplicate by fragmentType:type to avoid repeats when the same
        // fragment already appears in fragment:display.
        const displayTypes = new Set(displayFragments.map(f => `${f.fragmentType}:${f.type}`));
        const uniqueTrackedFragments = trackedFragments.filter(
            f => !displayTypes.has(`${f.fragmentType}:${f.type}`)
        );
        const fragments = [...displayFragments, ...uniqueTrackedFragments];

        // Compute elapsed duration fragment (S5/S9).
        // Only add if not already present from display or tracked fragments.
        const elapsedFragment = this.getElapsedFragment(ctx);
        if (elapsedFragment) {
            const elapsedKey = `${elapsedFragment.fragmentType}:${elapsedFragment.type}`;
            const alreadyPresent = new Set(fragments.map(f => `${f.fragmentType}:${f.type}`));
            if (!alreadyPresent.has(elapsedKey)) {
                fragments.push(elapsedFragment);
            }
        }

        // Emit completion output with completion reason from block.
        // This enriches the unmount output with context about how the block
        // was completed (self-pop via 'user-advance' vs parent-pop via 'forced-pop').
        ctx.emitOutput('completion', fragments as ICodeFragment[], {
            label: this.label ?? ctx.block.label,
            completionReason: ctx.block.completionReason,
        });

        return [];
    }

    onDispose(_ctx: IBehaviorContext): void {
        // No cleanup needed
    }
}
