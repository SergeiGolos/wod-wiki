import { IRuntimeBehavior } from '../contracts/IRuntimeBehavior';
import { IBehaviorContext } from '../contracts/IBehaviorContext';
import { IRuntimeAction } from '../contracts/IRuntimeAction';
import { MetricType } from '../../core/models/Metric';
import { MetricContainer } from '../../core/models/MetricContainer';
import { RoundState, TimerState } from '../memory/MemoryTypes';
import { TimeSpan } from '../models/TimeSpan';
import { calculateElapsed } from '../time/calculateElapsed';
import { CurrentRoundMetric } from '../compiler/metrics/CurrentRoundMetric';
import { ElapsedMetric } from '../compiler/metrics/ElapsedMetric';
import { TotalMetric } from '../compiler/metrics/TotalMetric';
import { SpansMetric } from '../compiler/metrics/SpansMetric';
import { SystemTimeMetric } from '../compiler/metrics/SystemTimeMetric';

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

            ctx.emitOutput('segment', mergedFragments.toArray(), {
                label: this.formatLabel(ctx),
            });
        }

        const round = ctx.getMemoryByTag('round')[0]?.metrics[0] as unknown as RoundState | undefined;
        const shouldEmitMilestones = this.config.emitMilestones ?? !!round;
        if (shouldEmitMilestones && round && (round.total === undefined || round.total > 1)) {
            this.lastEmittedRound = round.current;
            ctx.emitOutput('milestone', this.buildMilestoneFragments(ctx, round).toArray(), {
                label: this.formatRoundLabel(round),
            });
        }

        return [];
    }

    onNext(ctx: IBehaviorContext): IRuntimeAction[] {
        const round = ctx.getMemoryByTag('round')[0]?.metrics[0] as unknown as RoundState | undefined;
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
        ctx.emitOutput('milestone', this.buildMilestoneFragments(ctx, round).toArray(), {
            label: this.formatRoundLabel(round),
        });

        return [];
    }

    onUnmount(ctx: IBehaviorContext): IRuntimeAction[] {
        const timer = ctx.getMemoryByTag('time')[0]?.metrics[0]?.value as TimerState | undefined;
        const round = ctx.getMemoryByTag('round')[0]?.metrics[0] as unknown as RoundState | undefined;
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
            const displayGroups = ctx.block.getMemoryByTag('metric:display');
            if (displayGroups.length > 1) {
                // Split results proportionally across groups
                const resultGroups = this.computeSplitTimeResults(
                    ctx,
                    timer,
                    displayGroups.map(loc => loc.metrics),
                    completionLabel
                );
                this.writeResultGroups(ctx, resultGroups);

                for (const group of resultGroups) {
                    ctx.emitOutput('completion', group.toArray(), {
                        label: completionLabel,
                    });
                }
                return [];
            }
        }

        // Default single-output result
        const resultFragments = shouldComputeTimeResults
            ? this.computeTimeResults(ctx, timer, completionLabel)
            : MetricContainer.from(
                [new SystemTimeMetric(new Date(), ctx.block.key.toString())],
                ctx.block.key.toString()
            );

        this.writeResultMemory(ctx, resultFragments);

        ctx.emitOutput('completion', resultFragments.toArray(), {
            label: completionLabel,
        });

        return [];
    }

    onDispose(_ctx: IBehaviorContext): void {
        // No cleanup needed
    }

    private collectDisplayFragments(ctx: IBehaviorContext): MetricContainer {
        const metrics = MetricContainer.empty(ctx.block.key.toString());
        for (const loc of ctx.block.getMemoryByTag('metric:display')) {
            metrics.merge(loc.metrics);
        }
        return metrics;
    }

    private collectStateFragments(ctx: IBehaviorContext): MetricContainer {
        const metrics = MetricContainer.empty(ctx.block.key.toString());
        for (const loc of ctx.block.getMemoryByTag('round')) metrics.merge(loc.metrics);
        for (const loc of ctx.block.getMemoryByTag('time')) metrics.merge(loc.metrics);
        return metrics;
    }

    private mergeFragments(displayFragments: MetricContainer, stateFragments: MetricContainer): MetricContainer {
        const displayTypes = new Set(displayFragments.map(f => `${f.type}:${f.type}`));
        const uniqueStateFragments = stateFragments.filter(
            f => !displayTypes.has(`${f.type}:${f.type}`)
        );
        return displayFragments.clone().add(...uniqueStateFragments);
    }

    private buildMilestoneFragments(ctx: IBehaviorContext, round: RoundState): MetricContainer {
        const metrics = MetricContainer.empty(ctx.block.key.toString()).add(
            new CurrentRoundMetric(
                round.current,
                round.total,
                ctx.block.key.toString(),
                ctx.clock.now,
            ),
        );

        const timer = ctx.getMemoryByTag('time')[0]?.metrics[0]?.value as TimerState | undefined;
        if (timer) {
            const nowMs = ctx.clock.now.getTime();
            const elapsed = calculateElapsed(timer, nowMs);
            metrics.add(new ElapsedMetric(elapsed, ctx.block.key.toString(), ctx.clock.now));

            if (timer.spans.length > 0) {
                metrics.add(new SpansMetric([...timer.spans], ctx.block.key.toString(), ctx.clock.now));
            }
        }

        return metrics;
    }

    private computeTimeResults(
        ctx: IBehaviorContext,
        timer: TimerState | undefined,
        customRoundLabel?: string
    ): MetricContainer {
        const now = ctx.clock.now;
        const nowMs = now.getTime();
        const blockKey = ctx.block.key.toString();
        const round = ctx.getMemoryByTag('round')[0]?.metrics[0] as unknown as RoundState | undefined;

        if (timer && timer.spans.length > 0) {
            const elapsed = calculateElapsed(timer, nowMs);
            const firstStart = timer.spans[0].started;
            const lastSpan = timer.spans[timer.spans.length - 1];
            const lastEnd = lastSpan.ended ?? nowMs;
            const total = Math.max(0, lastEnd - firstStart);

            const metrics = MetricContainer.empty(blockKey).add(
                new ElapsedMetric(elapsed, blockKey, now),
                new TotalMetric(total, blockKey, now),
                new SpansMetric([...timer.spans], blockKey, now),
                new SystemTimeMetric(new Date(), blockKey),
            );
            if (round) {
                metrics.add(new CurrentRoundMetric(round.current, round.total, blockKey, now, customRoundLabel));
            }
            return metrics;
        }

        const degenerateSpan = new TimeSpan(nowMs, nowMs);
        const metrics = MetricContainer.empty(blockKey).add(
            new ElapsedMetric(0, blockKey, now),
            new TotalMetric(0, blockKey, now),
            new SpansMetric([degenerateSpan], blockKey, now),
            new SystemTimeMetric(new Date(), blockKey),
        );
        if (round) {
            metrics.add(new CurrentRoundMetric(round.current, round.total, blockKey, now, customRoundLabel));
        }
        return metrics;
    }

    private computeSplitTimeResults(
        ctx: IBehaviorContext,
        timer: TimerState | undefined,
        groups: MetricContainer[],
        customRoundLabel?: string
    ): MetricContainer[] {
        const now = ctx.clock.now;
        const nowMs = now.getTime();
        const blockKey = ctx.block.key.toString();
        const round = ctx.getMemoryByTag('round')[0]?.metrics[0] as unknown as RoundState | undefined;

        if (!timer || timer.spans.length === 0) {
            return groups.map((group) => {
                const groupFragments = group.clone().add(
                    new ElapsedMetric(0, blockKey, now),
                    new TotalMetric(0, blockKey, now),
                    new SpansMetric([new TimeSpan(nowMs, nowMs)], blockKey, now),
                    new SystemTimeMetric(new Date(), blockKey),
                );
                if (round) {
                    groupFragments.add(new CurrentRoundMetric(round.current, round.total, blockKey, now, customRoundLabel));
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
                .filter(f => f.type === MetricType.Rep && typeof f.value === 'number')
                .reduce((sum, f) => sum + (f.value as number), 0);
            return reps > 0 ? reps : 1; // Default to 1 if no reps
        });
        const totalWeight = weights.reduce((sum, w) => sum + w, 0);

        // 2. Distribute time and create virtual spans
        let currentOffsetMs = 0;
        return groups.map((group, i) => {
            const weight = weights[i];
            const ratio = weight / totalWeight;
            const groupElapsed = Math.round(totalElapsed * ratio);
            const groupTotal = Math.round(totalDuration * ratio);

            // Create virtual spans for this group starting at an offset from firstStart
            const groupStart = firstStart + currentOffsetMs;
            const groupEnd = groupStart + groupTotal;
            currentOffsetMs += groupTotal;

            const groupFragments = group.clone().add(
                new ElapsedMetric(groupElapsed, blockKey, now),
                new TotalMetric(groupTotal, blockKey, now),
                new SpansMetric([new TimeSpan(groupStart, groupEnd)], blockKey, now),
                new SystemTimeMetric(new Date(), blockKey),
            );
            if (round) {
                groupFragments.add(new CurrentRoundMetric(round.current, round.total, blockKey, now, customRoundLabel));
            }
            return groupFragments;
        });
    }

    private writeResultMemory(ctx: IBehaviorContext, resultFragments: MetricContainer): void {
        const existing = ctx.block.getMemoryByTag('metric:result');
        if (existing.length > 0) {
            ctx.updateMemory('metric:result', resultFragments.toArray());
            return;
        }

        ctx.pushMemory('metric:result', resultFragments.toArray());
    }

    private writeResultGroups(ctx: IBehaviorContext, resultGroups: MetricContainer[]): void {
        const existing = ctx.block.getMemoryByTag('metric:result');
        if (existing.length > 0) {
            // Not supporting partial updates of groups yet
            return;
        }

        for (const group of resultGroups) {
            ctx.pushMemory('metric:result', group.toArray());
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
