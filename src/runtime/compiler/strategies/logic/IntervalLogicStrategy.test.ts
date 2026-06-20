import { describe, it, expect } from 'bun:test';
import { apply, stmtWith, stubRuntime, makeStatement } from '@/testing/harness/StrategyTestHarness';
import { MetricType } from '@/core/models/Metric';
import { IntervalLogicStrategy } from './IntervalLogicStrategy';
import { CountdownTimerBehavior, LabelingBehavior, SoundCueBehavior, MetricPromotionBehavior } from '../../../behaviors';

const runtime = stubRuntime();
const strategy = new IntervalLogicStrategy();

describe('IntervalLogicStrategy', () => {
    describe('match', () => {
        it('returns true for Duration + repeating_interval hint', () => {
            const result = apply(strategy, [
                stmtWith(MetricType.Duration, 60000),
                stmtWith(MetricType.Hint, 'behavior.repeating_interval'),
            ], runtime);
            expect(result.matched).toBe(true);
        });

        it('returns true for Duration + emom keyword', () => {
            const result = apply(strategy, [
                stmtWith(MetricType.Duration, 60000),
                stmtWith(MetricType.Effort, 'emom'),
            ], runtime);
            expect(result.matched).toBe(true);
        });

        it('returns false for Duration-only statements', () => {
            const result = apply(strategy, [stmtWith(MetricType.Duration, 60000)], runtime);
            expect(result.matched).toBe(false);
        });

        it('returns false for hint-only statements', () => {
            const result = apply(strategy, [stmtWith(MetricType.Hint, 'behavior.repeating_interval')], runtime);
            expect(result.matched).toBe(false);
        });
    });

    describe('apply', () => {
        it('sets blockType EMOM and adds timer, label, and sound behaviors', () => {
            const stmt = makeStatement([
                { type: MetricType.Duration, value: 60000, origin: 'parser' },
                { type: MetricType.Hint, value: 'behavior.repeating_interval', origin: 'parser' },
            ]);
            const result = apply(strategy, [stmt], runtime);
            expect(result.blockType).toBe('EMOM');
            expect(result.hasBehavior(CountdownTimerBehavior)).toBe(true);
            expect(result.hasBehavior(LabelingBehavior)).toBe(true);
            expect(result.hasBehavior(SoundCueBehavior)).toBe(true);
        });

        it('adds MetricPromotionBehavior when Resistance is present', () => {
            const stmt = makeStatement([
                { type: MetricType.Duration, value: 60000, origin: 'parser' },
                { type: MetricType.Hint, value: 'behavior.repeating_interval', origin: 'parser' },
                { type: MetricType.Resistance, value: 135, origin: 'parser' },
            ]);
            const result = apply(strategy, [stmt], runtime);
            expect(result.hasBehavior(MetricPromotionBehavior)).toBe(true);
        });

        it('does not add MetricPromotionBehavior without Resistance or Distance', () => {
            const stmt = makeStatement([
                { type: MetricType.Duration, value: 60000, origin: 'parser' },
                { type: MetricType.Hint, value: 'behavior.repeating_interval', origin: 'parser' },
            ]);
            const result = apply(strategy, [stmt], runtime);
            expect(result.hasBehavior(MetricPromotionBehavior)).toBe(false);
        });
    });
});
