import { IRuntimeBehavior } from '../contracts/IRuntimeBehavior';
import { IBehaviorContext, Unsubscribe } from '../contracts/IBehaviorContext';
import { IRuntimeAction } from '../contracts/IRuntimeAction';
import { TimerDirection, TimerState } from '../memory/MemoryTypes';
import { TimeSpan } from '../models/TimeSpan';
import { ICodeFragment, FragmentType } from '../../core/models/CodeFragment';
import { calculateElapsed } from '../time/calculateElapsed';
import { ElapsedFragment } from '../compiler/fragments/ElapsedFragment';
import { TotalFragment } from '../compiler/fragments/TotalFragment';

export interface TimerConfig {
    direction: TimerDirection;
    durationMs?: number;
    label?: string;
    role?: 'primary' | 'secondary' | 'hidden' | 'auto';
}

export class TimerBehavior implements IRuntimeBehavior {
    constructor(public readonly config: TimerConfig) { }

    private readonly subscriptions: Unsubscribe[] = [];
    private isPaused = false;

    onMount(ctx: IBehaviorContext): IRuntimeAction[] {
        const nowMs = ctx.clock.now.getTime();
        const label = this.config.label ?? ctx.block.label;
        const role = this.config.role === 'hidden' ? 'auto' : (this.config.role ?? 'primary');

        const timerState: TimerState = {
            spans: [new TimeSpan(nowMs)],
            direction: this.config.direction,
            durationMs: this.config.durationMs,
            label,
            role,
        };

        ctx.pushMemory('timer', [this.createTimerFragment(ctx, timerState)]);

        this.subscriptions.push(
            ctx.subscribe('timer:pause' as any, (_event, pauseCtx) => {
                if (this.isPaused) return [];

                const timer = pauseCtx.getMemory('timer') as TimerState | undefined;
                if (!timer || timer.spans.length === 0) return [];

                const pausedState: TimerState = {
                    ...timer,
                    spans: this.closeCurrentSpan(timer.spans, pauseCtx.clock.now.getTime()),
                };

                pauseCtx.updateMemory('timer', [this.createTimerFragment(pauseCtx, pausedState)]);
                this.isPaused = true;
                return [];
            })
        );

        this.subscriptions.push(
            ctx.subscribe('timer:resume' as any, (_event, resumeCtx) => {
                if (!this.isPaused) return [];

                const timer = resumeCtx.getMemory('timer') as TimerState | undefined;
                if (!timer) return [];

                const resumedState: TimerState = {
                    ...timer,
                    spans: [...timer.spans, new TimeSpan(resumeCtx.clock.now.getTime())],
                };

                resumeCtx.updateMemory('timer', [this.createTimerFragment(resumeCtx, resumedState)]);
                this.isPaused = false;
                return [];
            })
        );

        return [];
    }

    onNext(ctx: IBehaviorContext): IRuntimeAction[] {
        const timer = ctx.getMemory('timer') as TimerState | undefined;
        if (!timer || timer.spans.length === 0) return [];

        if (this.isPaused) {
            return [];
        }

        const nowMs = ctx.clock.now.getTime();
        const resetState: TimerState = {
            ...timer,
            spans: [...this.closeCurrentSpan(timer.spans, nowMs), new TimeSpan(nowMs)],
        };

        ctx.updateMemory('timer', [this.createTimerFragment(ctx, resetState)]);
        return [];
    }

    onUnmount(ctx: IBehaviorContext): IRuntimeAction[] {
        const timer = ctx.getMemory('timer') as TimerState | undefined;
        if (!timer || timer.spans.length === 0) {
            return [];
        }

        const nowMs = ctx.clock.now.getTime();
        const closedSpans = this.closeCurrentSpan(timer.spans, nowMs);
        const closedState: TimerState = {
            ...timer,
            spans: closedSpans,
        };

        ctx.updateMemory('timer', [this.createTimerFragment(ctx, closedState)]);

        const elapsed = calculateElapsed(closedState, nowMs);
        const firstStart = closedSpans[0].started;
        const lastEnd = closedSpans[closedSpans.length - 1].ended ?? nowMs;
        const total = Math.max(0, lastEnd - firstStart);

        this.appendResultFragments(ctx, [
            new ElapsedFragment(elapsed, ctx.block.key.toString(), ctx.clock.now),
            new TotalFragment(total, ctx.block.key.toString(), ctx.clock.now),
        ]);

        return [];
    }

    onDispose(_ctx: IBehaviorContext): void {
        for (const unsubscribe of this.subscriptions) {
            try {
                unsubscribe();
            } catch {
                // no-op
            }
        }
        this.subscriptions.length = 0;
    }

    private closeCurrentSpan(spans: readonly TimeSpan[], endMs: number): TimeSpan[] {
        return spans.map((span, index) => {
            if (index === spans.length - 1 && span.ended === undefined) {
                return new TimeSpan(span.started, endMs);
            }
            return span;
        });
    }

    private createTimerFragment(ctx: IBehaviorContext, timer: TimerState): ICodeFragment {
        return {
            fragmentType: FragmentType.Timer,
            type: 'timer',
            image: this.formatDuration(timer.durationMs),
            origin: 'runtime',
            value: timer,
            sourceBlockKey: ctx.block.key.toString(),
            timestamp: ctx.clock.now,
        };
    }

    private appendResultFragments(ctx: IBehaviorContext, nextFragments: ICodeFragment[]): void {
        const resultLocs = ctx.block.getMemoryByTag('fragment:result');
        if (resultLocs.length > 0) {
            const existing = resultLocs[0].fragments;
            ctx.updateMemory('fragment:result', [...existing, ...nextFragments]);
            return;
        }

        ctx.pushMemory('fragment:result', nextFragments);
    }

    private formatDuration(durationMs: number | undefined): string {
        if (durationMs === undefined || durationMs === 0) {
            return '0:00';
        }

        const totalSeconds = Math.floor(durationMs / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
}