import { describe, it, expect } from 'bun:test';
import { apply, stmtWith, makeStatement, stubRuntime } from '@/testing/harness/StrategyTestHarness';
import { MetricType } from '@/core/models/Metric';
import { BlockBuilder } from '../../BlockBuilder';
import { DurationMetric } from '../../metrics/DurationMetric';
import { hintMetric } from '@/core/metrics/hints';
import { GenericTimerStrategy } from './GenericTimerStrategy';
import {
    CountdownTimerBehavior,
    CountupTimerBehavior,
    ExitBehavior,
    type ExitConfig,
    SoundCueBehavior,
    LabelingBehavior,
} from '../../../behaviors';
import type { IRuntimeBehavior } from '@/runtime/contracts/IRuntimeBehavior';

const runtime = stubRuntime();

describe('GenericTimerStrategy', () => {
    const strategy = new GenericTimerStrategy();

    describe('match', () => {
        it('returns true when any statement has a Duration metric with parser origin', () => {
            const stmts = [makeStatement([new DurationMetric('5:00')])];
            expect(strategy.match(stmts, runtime)).toBe(true);
        });
        it('returns false when only runtime-generated durations are present', () => {
            const stmts = [stmtWith(MetricType.Duration, 300_000, { origin: 'runtime' })];
            expect(strategy.match(stmts, runtime)).toBe(false);
        });
        it('returns false when no durations are present', () => {
            const stmts = [stmtWith(MetricType.Rep, 10)];
            expect(strategy.match(stmts, runtime)).toBe(false);
        });
    });

    describe('apply', () => {
        it('returns early when builder already has a timer behavior', () => {
            const builder = new BlockBuilder(runtime);
            builder.asTimer({ direction: 'down', durationMs: 60_000 });
            const stmts = [makeStatement([new DurationMetric('3:00')])];
            strategy.apply(builder, stmts, runtime);
            expect(builder.getBlockType()).toBe('Block');
        });
        it('with countdown duration, adds CountdownTimerBehavior, ExitBehavior, SoundCueBehavior, and LabelingBehavior', () => {
            const stmts = [makeStatement([new DurationMetric('3:00')])];
            const result = apply(strategy, stmts, runtime);
            expect(result.hasBehavior(CountdownTimerBehavior)).toBe(true);
            expect(result.hasBehavior(ExitBehavior)).toBe(true);
            expect(result.hasBehavior(SoundCueBehavior)).toBe(true);
            expect(result.hasBehavior(LabelingBehavior)).toBe(true);
        });
        it('with countup (no duration), adds CountupTimerBehavior, ExitBehavior, and LabelingBehavior but no sound', () => {
            const stmts = [makeStatement([new DurationMetric(':?')])];
            const result = apply(strategy, stmts, runtime);
            expect(result.hasBehavior(CountupTimerBehavior)).toBe(true);
            expect(result.hasBehavior(ExitBehavior)).toBe(true);
            expect(result.hasBehavior(LabelingBehavior)).toBe(true);
            expect(result.hasBehavior(SoundCueBehavior)).toBe(false);
        });
        it('required countdown timer gives ExitBehavior onEvents timer:complete', () => {
            const stmts = [
                makeStatement([
                    new DurationMetric('2:00', false, true),
                    hintMetric('behavior.required_timer'),
                ]),
            ];
            const result = apply(strategy, stmts, runtime);
            const exit = result.getBehavior(ExitBehavior);
            expect(exit).toBeDefined();
            const exitWithConfig = exit as unknown as IRuntimeBehavior & { config: ExitConfig };
            expect(exitWithConfig.config.onEvents).toEqual(['timer:complete']);
            expect(exitWithConfig.config.onNext).toBe(false);
            expect(result.hasBehavior(CountdownTimerBehavior)).toBe(true);
        });
    });
});
