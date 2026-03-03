import { IRuntimeBehavior } from '../contracts/IRuntimeBehavior';
import { IBehaviorContext } from '../contracts/IBehaviorContext';
import { IRuntimeAction } from '../contracts/IRuntimeAction';
import { FragmentType, ICodeFragment } from '../../core/models/CodeFragment';
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
    computeTimeResults?: boolean;
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

        const round = ctx.getMemoryByTag('round')[0]?.fragments[0] as unknown as RoundState | undefined;
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
        const round = ctx.getMemoryByTag('round')[0]?.fragments[0] as unknown as RoundState | undefined;
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
        const timer = ctx.getMemoryByTag('time')[0]?.fragments[0]?.value as TimerState | undefined;
        const round = ctx.getMemoryByTag('round')[0]?.fragments[0] as unknown as RoundState | undefined;
        const shouldComputeTimeResults = this.config.computeTimeResults ?? true;

        // Determine a descriptive completion label
        let completionLabel = this.config.label ?? 'Completed';
        if (!this.config.label) {
            if (ctx.block.blockType === 'SessionRoot') {
                completionLabel = 'Session Completed';
            } else if (round && round.total !== undefined && round.total > 1) {
                completionLabel = `Completed ${round.total} Round(s)`;
            } else if (round && round.current > 1) {
                // Fallback for unbounded rounds where at least one round was done
                completionLabel = `Completed ${round.current} Round(s)`;
            }
        }

        if (shouldComputeTimeResults) {
            const displayGroups = ctx.block.getMemoryByTag('fragment:display');
            if (displayGroups.length > 1) {
                // Split results proportionally across groups
                const resultGroups = this.computeSplitTimeResults(
                    ctx,
                    timer,
                    displayGroups.map(loc => loc.fragments),
                    completionLabel
                );
                this.writeResultGroups(ctx, resultGroups);

                for (const group of resultGroups) {
                    ctx.emitOutput('completion', group, {
                        label: completionLabel,
                    });
                }
                return [];
            }
        }

        // Default single-output result
        const resultFragments = shouldComputeTimeResults
            ? this.computeTimeResults(ctx, timer, completionLabel)
            : [new SystemTimeFragment(new Date(), ctx.block.key.toString())];

        this.writeResultMemory(ctx, resultFragments);

        ctx.emitOutput('completion', resultFragments, {
            label: completionLabel,
        });

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
        const timerFragments = ctx.block.getMemoryByTag('time').flatMap(loc => loc.fragments);
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

        const timer = ctx.getMemoryByTag('time')[0]?.fragments[0]?.value as TimerState | undefined;
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

    private computeTimeResults(
        ctx: IBehaviorContext,
        timer: TimerState | undefined,
        customRoundLabel?: string
    ): ICodeFragment[] {
        const now = ctx.clock.now;
        const nowMs = now.getTime();
        const blockKey = ctx.block.key.toString();
        const round = ctx.getMemoryByTag('round')[0]?.fragments[0] as unknown as RoundState | undefined;

        if (timer && timer.spans.length > 0) {
            const elapsed = calculateElapsed(timer, nowMs);
            const firstStart = timer.spans[0].started;
            const lastSpan = timer.spans[timer.spans.length - 1];
            const lastEnd = lastSpan.ended ?? nowMs;
            const total = Math.max(0, lastEnd - firstStart);

            const fragments: ICodeFragment[] = [
                new ElapsedFragment(elapsed, blockKey, now),
                new TotalFragment(total, blockKey, now),
                new SpansFragment([...timer.spans], blockKey, now),
                new SystemTimeFragment(new Date(), blockKey),
            ];
            if (round) {
                fragments.push(new CurrentRoundFragment(round.current, round.total, blockKey, now, customRoundLabel));
            }
            return fragments;
        }

        const degenerateSpan = new TimeSpan(nowMs, nowMs);
        const fragments: ICodeFragment[] = [
            new ElapsedFragment(0, blockKey, now),
            new TotalFragment(0, blockKey, now),
            new SpansFragment([degenerateSpan], blockKey, now),
            new SystemTimeFragment(new Date(), blockKey),
        ];
        if (round) {
            fragments.push(new CurrentRoundFragment(round.current, round.total, blockKey, now, customRoundLabel));
        }
        return fragments;
    }

    private computeSplitTimeResults(
        ctx: IBehaviorContext,
        timer: TimerState | undefined,
        groups: ICodeFragment[][],
        customRoundLabel?: string
    ): ICodeFragment[][] {
        const now = ctx.clock.now;
        const nowMs = now.getTime();
        const blockKey = ctx.block.key.toString();
        const round = ctx.getMemoryByTag('round')[0]?.fragments[0] as unknown as RoundState | undefined;

        if (!timer || timer.spans.length === 0) {
            return groups.map(() => {
                const groupFragments: ICodeFragment[] = [
                    new ElapsedFragment(0, blockKey, now),
                    new TotalFragment(0, blockKey, now),
                    new SpansFragment([new TimeSpan(nowMs, nowMs)], blockKey, now),
                    new SystemTimeFragment(new Date(), blockKey),
                ];
                if (round) {
                    groupFragments.push(new CurrentRoundFragment(round.current, round.total, blockKey, now, customRoundLabel));
                }
                return groupFragments;
            });
        }

        const totalElapsed = calculateElapsed(timer, nowMs);
        const firstStart = timer.spans[0].started;
        const lastEnd = timer.spans[timer.spans.length - 1].ended ?? nowMs;
        const totalDuration = lastEnd - firstStart;

        // 1. Calculate weights for each group based on reps
        const weights = groups.map(group => {
            const reps = group
                .filter(f => f.fragmentType === FragmentType.Rep && typeof f.value === 'number')
                .reduce((sum, f) => sum + (f.value as number), 0);
            return reps > 0 ? reps : 1; // Default to 1 if no reps
        });
        const totalWeight = weights.reduce((sum, w) => sum + w, 0);

        // 2. Distribute time and create virtual spans
        let currentOffsetMs = 0;
        return groups.map((_, i) => {
            const weight = weights[i];
            const ratio = weight / totalWeight;
            const groupElapsed = Math.round(totalElapsed * ratio);
            const groupTotal = Math.round(totalDuration * ratio);

            // Create virtual spans for this group starting at an offset from firstStart
            const groupStart = firstStart + currentOffsetMs;
            const groupEnd = groupStart + groupTotal;
            currentOffsetMs += groupTotal;

            const groupFragments: ICodeFragment[] = [
                new ElapsedFragment(groupElapsed, blockKey, now),
                new TotalFragment(groupTotal, blockKey, now),
                new SpansFragment([new TimeSpan(groupStart, groupEnd)], blockKey, now),
                new SystemTimeFragment(new Date(), blockKey),
            ];
            if (round) {
                groupFragments.push(new CurrentRoundFragment(round.current, round.total, blockKey, now, customRoundLabel));
            }
            return groupFragments;
        });
    }

    private writeResultMemory(ctx: IBehaviorContext, resultFragments: ICodeFragment[]): void {
        const existing = ctx.block.getMemoryByTag('fragment:result');
        if (existing.length > 0) {
            ctx.updateMemory('fragment:result', resultFragments);
            return;
        }

        ctx.pushMemory('fragment:result', resultFragments);
    }

    private writeResultGroups(ctx: IBehaviorContext, resultGroups: ICodeFragment[][]): void {
        const existing = ctx.block.getMemoryByTag('fragment:result');
        if (existing.length > 0) {
            // Not supporting partial updates of groups yet
            return;
        }

        for (const group of resultGroups) {
            ctx.pushMemory('fragment:result', group);
        }
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
