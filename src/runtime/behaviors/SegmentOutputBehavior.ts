import { IRuntimeBehavior } from '../contracts/IRuntimeBehavior';
import { IBehaviorContext } from '../contracts/IBehaviorContext';
import { IRuntimeAction } from '../contracts/IRuntimeAction';
import { ICodeFragment } from '../../core/models/CodeFragment';
import { TimerState } from '../memory/MemoryTypes';
import { TimeSpan } from '../models/TimeSpan';
import { calculateElapsed } from '../time/calculateElapsed';
import { ElapsedFragment } from '../compiler/fragments/ElapsedFragment';
import { TotalFragment } from '../compiler/fragments/TotalFragment';
import { SpansFragment } from '../compiler/fragments/SpansFragment';
import { SystemTimeFragment } from '../compiler/fragments/SystemTimeFragment';

/**
 * SegmentOutputBehavior emits output statements at block lifecycle boundaries.
 * 
 * ## Aspect: Output
 * 
 * **On mount:** Emits a `segment` output announcing block execution started.
 * Merges `fragment:display` (parser-prescribed identity) with runtime state
 * fragments (round, timer).
 * 
 * **On unmount:** Emits a `completion` output with final timing results.
 * Computes elapsed/total from timer spans and includes ElapsedFragment,
 * TotalFragment, SpansFragment, and SystemTimeFragment. For non-timer
 * blocks, creates a degenerate span (start === end) so every block has
 * at least one span registered.
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

    onUnmount(ctx: IBehaviorContext): IRuntimeAction[] {
        const now = ctx.clock.now;
        const nowMs = now.getTime();
        const blockKey = ctx.block.key.toString();

        // Collect display fragments for the completion output
        const displayFragments = this.getFragments(ctx);
        const stateFragments = this.getRuntimeStateFragments(ctx);

        // Merge display + state, deduplicating
        const displayTypes = new Set(displayFragments.map(f => `${f.fragmentType}:${f.type}`));
        const uniqueStateFragments = stateFragments.filter(
            f => !displayTypes.has(`${f.fragmentType}:${f.type}`)
        );
        const fragments: ICodeFragment[] = [...displayFragments, ...uniqueStateFragments];

        // Read timer state — TimerTickBehavior.onUnmount() has already
        // closed the last span by this point (behaviors execute in order).
        const timer = ctx.getMemory('timer') as TimerState | undefined;

        if (timer && timer.spans && timer.spans.length > 0) {
            // Timer block: compute elapsed/total from closed spans
            const elapsed = calculateElapsed(timer, nowMs);
            fragments.push(new ElapsedFragment(elapsed, blockKey, now));

            const firstStart = timer.spans[0].started;
            const lastSpan = timer.spans[timer.spans.length - 1];
            const lastEnd = lastSpan.ended ?? nowMs;
            const total = Math.max(0, lastEnd - firstStart);
            fragments.push(new TotalFragment(total, blockKey, now));

            fragments.push(new SpansFragment([...timer.spans], blockKey, now));
        } else {
            // Non-timer block: create a degenerate span (start === end)
            // so every block has at least one span registered.
            const degenerateSpan = new TimeSpan(nowMs, nowMs);
            fragments.push(new ElapsedFragment(0, blockKey, now));
            fragments.push(new TotalFragment(0, blockKey, now));
            fragments.push(new SpansFragment([degenerateSpan], blockKey, now));
        }

        // System time for audit trail (uses real Date.now(), not the mock clock)
        fragments.push(new SystemTimeFragment(new Date(), blockKey));

        // Also write to fragment:result memory for other consumers
        ctx.pushMemory('fragment:result', fragments.filter(f =>
            f.fragmentType === 'elapsed' ||
            f.fragmentType === 'total' ||
            f.fragmentType === 'spans' ||
            f.fragmentType === 'system-time'
        ));

        // Emit completion output with all fragments
        ctx.emitOutput('completion', fragments, {
            label: this.label ?? ctx.block.label,
            completionReason: ctx.block.completionReason
        });

        return [];
    }

    onDispose(_ctx: IBehaviorContext): void {
        // No cleanup needed
    }
}
