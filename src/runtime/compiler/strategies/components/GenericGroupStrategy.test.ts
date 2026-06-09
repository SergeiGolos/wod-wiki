import { describe, it, expect } from 'bun:test';
import { apply, stmtWith, makeStatement, stubRuntime } from '@/testing/harness/StrategyTestHarness';
import { MetricType } from '@/core/models/Metric';
import { GenericGroupStrategy } from './GenericGroupStrategy';
import {
    LabelingBehavior,
    MetricPromotionBehavior,
    CountdownTimerBehavior,
    CountupTimerBehavior,
} from '../../../behaviors';

const runtime = stubRuntime();

describe('GenericGroupStrategy', () => {
    const strategy = new GenericGroupStrategy();

    describe('match', () => {
        it('returns true when statements have children but no timer and no rounds', () => {
            const stmts = [makeStatement([], { children: [[1]] })];
            expect(strategy.match(stmts, runtime)).toBe(true);
        });
        it('returns false when there are no children', () => {
            const stmts = [makeStatement([])];
            expect(strategy.match(stmts, runtime)).toBe(false);
        });
        it('returns false when a timer is present', () => {
            const stmts = [
                makeStatement([{ type: MetricType.Duration, value: 300_000, origin: 'parser' }], { children: [[1]] }),
            ];
            expect(strategy.match(stmts, runtime)).toBe(false);
        });
        it('returns false when rounds are present', () => {
            const stmts = [
                makeStatement([{ type: MetricType.Rounds, value: 3, origin: 'parser' }], { children: [[1]] }),
            ];
            expect(strategy.match(stmts, runtime)).toBe(false);
        });
    });

    describe('apply', () => {
        it('sets blockType to Group and adds LabelingBehavior', () => {
            const stmts = [makeStatement([], { children: [[1]] })];
            const result = apply(strategy, stmts, runtime);
            expect(result.blockType).toBe('Group');
            expect(result.hasBehavior(LabelingBehavior)).toBe(true);
        });
        it('adds MetricPromotionBehavior when resistance is present', () => {
            const stmts = [
                makeStatement([{ type: MetricType.Resistance, value: 135, origin: 'parser' }], { children: [[1]] }),
            ];
            const result = apply(strategy, stmts, runtime);
            expect(result.hasBehavior(MetricPromotionBehavior)).toBe(true);
        });
        it('adds MetricPromotionBehavior when distance is present', () => {
            const stmts = [
                makeStatement([{ type: MetricType.Distance, value: 400, origin: 'parser' }], { children: [[1]] }),
            ];
            const result = apply(strategy, stmts, runtime);
            expect(result.hasBehavior(MetricPromotionBehavior)).toBe(true);
        });
        it('does not add timer or repeater behaviors', () => {
            const stmts = [makeStatement([], { children: [[1]] })];
            const result = apply(strategy, stmts, runtime);
            expect(result.hasBehavior(CountdownTimerBehavior)).toBe(false);
            expect(result.hasBehavior(CountupTimerBehavior)).toBe(false);
            expect(result.matched).toBe(true);
        });
    });
});
