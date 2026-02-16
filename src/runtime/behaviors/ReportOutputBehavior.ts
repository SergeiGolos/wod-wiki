import { IRuntimeBehavior } from '../contracts/IRuntimeBehavior';
import { IBehaviorContext } from '../contracts/IBehaviorContext';
import { IRuntimeAction } from '../contracts/IRuntimeAction';
import { ICodeFragment } from '../../core/models/CodeFragment';
import { RoundState, TimerState } from '../memory/MemoryTypes';
import { TimeSpan } from '../models/TimeSpan';
import { calculateElapsed } from '../time/calculateElapsed';
import { CurrentRoundFragment } from '../compiler/fragments/CurrentRoundFragment';
import { ElapsedFragment } from '../compiler/fragments/ElapsedFragment';
import { TotalFragment } from '../compiler/fragments/TotalFragment';
import { SpansFragment } from '../compiler/fragments/SpansFragment';
import { SystemTimeFragment } from '../compiler/fragments/SystemTimeFragment';

export interface ReportOutputConfig {
    label?: string;
    emitSegmentOnMount?: boolean;
    emitMilestones?: boolean;
    computeTimerResults?: boolean;
}

export class ReportOutputBehavior implements IRuntimeBehavior {
    private lastEmittedRound?: number;

    constructor(private readonly config: ReportOutputConfig = {}) { }

    onMount(ctx: IBehaviorContext): IRuntimeAction[] {
        const shouldEmitSegment = this.config.emitSegmentOnMount ?? false;
        if (shouldEmitSegment) {
            const displayFragments = this.collectDisplayFragments(ctx);
            const stateFragments = this.collectStateFragments(ctx);
            const mergedFragments = this.mergeFragments(displayFragments, stateFragments);

            ctx.emitOutput('segment', mergedFragments, {
                label: this.formatLabel(ctx),
            });
        }

        const round = ctx.getMemory('round') as RoundState | undefined;
        const shouldEmitMilestones = this.config.emitMilestones ?? !!round;
        if (shouldEmitMilestones && round && (round.total === undefined || round.total > 1)) {
            this.lastEmittedRound = round.current;
            ctx.emitOutput('milestone', this.buildMilestoneFragments(ctx, round), {
                label: this.formatRoundLabel(round),
            });
        }

        return [];
    }

    onNext(ctx: IBehaviorContext): IRuntimeAction[] {
        const round = ctx.getMemory('round') as RoundState | undefined;
        const shouldEmitMilestones = this.config.emitMilestones ?? !!round;
        if (!shouldEmitMilestones || !round || (round.total !== undefined && round.total <= 1)) {
            return [];
        }

        if (round.total !== undefined && round.current > round.total) {
            return [];
        }

        // Only emit milestone when the round has actually changed.
        // ChildSelectionBehavior advances the round and dispatches new
        // children in the same onNext cycle, so children:status.allCompleted
        // is always false at this point. Tracking the last emitted round
        // avoids duplicate milestones without depending on child status.
        if (this.lastEmittedRound !== undefined && round.current === this.lastEmittedRound) {
            return [];
        }

        this.lastEmittedRound = round.current;
        ctx.emitOutput('milestone', this.buildMilestoneFragments(ctx, round), {
            label: this.formatRoundLabel(round),
        });

        return [];
    }

    onUnmount(ctx: IBehaviorContext): IRuntimeAction[] {
        // Collect fragments for result memory, but do NOT emit completion output here.
        // The runtime handles segment emission on pop.
        // baseFragments was only used for completion output, which is removed.

        const timer = ctx.getMemory('timer') as TimerState | undefined;
        const shouldComputeTimerResults = this.config.computeTimerResults ?? true;
        const resultFragments = shouldComputeTimerResults
            ? this.computeTimerResults(ctx, timer)
            : [new SystemTimeFragment(new Date(), ctx.block.key.toString())];

        this.writeResultMemory(ctx, resultFragments);

        return [];
    }

    onDispose(_ctx: IBehaviorContext): void {
        // No cleanup needed
    }

    private collectDisplayFragments(ctx: IBehaviorContext): ICodeFragment[] {
        return ctx.block.getMemoryByTag('fragment:display').flatMap(loc => loc.fragments);
    }

    private collectStateFragments(ctx: IBehaviorContext): ICodeFragment[] {
        const roundFragments = ctx.block.getMemoryByTag('round').flatMap(loc => loc.fragments);
        const timerFragments = ctx.block.getMemoryByTag('timer').flatMap(loc => loc.fragments);
        return [...roundFragments, ...timerFragments];
    }

    private mergeFragments(displayFragments: ICodeFragment[], stateFragments: ICodeFragment[]): ICodeFragment[] {
        const displayTypes = new Set(displayFragments.map(f => `${f.fragmentType}:${f.type}`));
        const uniqueStateFragments = stateFragments.filter(
            f => !displayTypes.has(`${f.fragmentType}:${f.type}`)
        );
        return [...displayFragments, ...uniqueStateFragments];
    }

    private buildMilestoneFragments(ctx: IBehaviorContext, round: RoundState): ICodeFragment[] {
        const fragments: ICodeFragment[] = [
            new CurrentRoundFragment(
                round.current,
                round.total,
                ctx.block.key.toString(),
                ctx.clock.now,
            ),
        ];

        const timer = ctx.getMemory('timer') as TimerState | undefined;
        if (timer) {
            const nowMs = ctx.clock.now.getTime();
            const elapsed = calculateElapsed(timer, nowMs);
            fragments.push(new ElapsedFragment(elapsed, ctx.block.key.toString(), ctx.clock.now));

            if (timer.spans.length > 0) {
                fragments.push(new SpansFragment([...timer.spans], ctx.block.key.toString(), ctx.clock.now));
            }
        }

        return fragments;
    }

    private computeTimerResults(ctx: IBehaviorContext, timer: TimerState | undefined): ICodeFragment[] {
        const now = ctx.clock.now;
        const nowMs = now.getTime();
        const blockKey = ctx.block.key.toString();

        if (timer && timer.spans.length > 0) {
            const elapsed = calculateElapsed(timer, nowMs);
            const firstStart = timer.spans[0].started;
            const lastSpan = timer.spans[timer.spans.length - 1];
            const lastEnd = lastSpan.ended ?? nowMs;
            const total = Math.max(0, lastEnd - firstStart);

            return [
                new ElapsedFragment(elapsed, blockKey, now),
                new TotalFragment(total, blockKey, now),
                new SpansFragment([...timer.spans], blockKey, now),
                new SystemTimeFragment(new Date(), blockKey),
            ];
        }

        const degenerateSpan = new TimeSpan(nowMs, nowMs);
        return [
            new ElapsedFragment(0, blockKey, now),
            new TotalFragment(0, blockKey, now),
            new SpansFragment([degenerateSpan], blockKey, now),
            new SystemTimeFragment(new Date(), blockKey),
        ];
    }

    private writeResultMemory(ctx: IBehaviorContext, resultFragments: ICodeFragment[]): void {
        const existing = ctx.block.getMemoryByTag('fragment:result');
        if (existing.length > 0) {
            ctx.updateMemory('fragment:result', resultFragments);
            return;
        }

        ctx.pushMemory('fragment:result', resultFragments);
    }

    private formatLabel(ctx: IBehaviorContext): string {
        return this.config.label ?? ctx.block.label;
    }

    private formatRoundLabel(round: RoundState): string {
        return round.total !== undefined
            ? `Round ${round.current} of ${round.total}`
            : `Round ${round.current}`;
    }
}