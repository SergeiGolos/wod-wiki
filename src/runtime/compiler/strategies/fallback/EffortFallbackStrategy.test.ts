import { describe, it, expect } from 'bun:test';
import { apply, stmtWith, stubRuntime, makeStatement } from '@/testing/harness/StrategyTestHarness';
import { MetricType } from '@/core/models/Metric';
import { EffortFallbackStrategy } from './EffortFallbackStrategy';
import { CountupTimerBehavior, ExitBehavior } from '../../../behaviors';

const runtime = stubRuntime();
const strategy = new EffortFallbackStrategy();

describe('EffortFallbackStrategy', () => {
    describe('match', () => {
        it('returns true for simple effort with no timer, no rounds, no children', () => {
            const result = apply(strategy, [stmtWith(MetricType.Effort, 'Push-ups')], runtime);
            expect(result.matched).toBe(true);
        });

        it('returns false when any statement has Duration', () => {
            const result = apply(strategy, [stmtWith(MetricType.Duration, 60000)], runtime);
            expect(result.matched).toBe(false);
        });

        it('returns false when any statement has Rounds', () => {
            const result = apply(strategy, [stmtWith(MetricType.Rounds, 5)], runtime);
            expect(result.matched).toBe(false);
        });

        it('returns false when any statement has children', () => {
            const stmt = makeStatement(
                [{ type: MetricType.Effort, value: 'Run', origin: 'parser' }],
                { children: [[1]] },
            );
            const result = apply(strategy, [stmt], runtime);
            expect(result.matched).toBe(false);
        });
    });

    describe('apply', () => {
        it('sets blockType effort and adds ExitBehavior and CountupTimerBehavior', () => {
            const result = apply(strategy, [stmtWith(MetricType.Effort, 'Push-ups')], runtime);
            expect(result.blockType).toBe('effort');
            expect(result.hasBehavior(ExitBehavior)).toBe(true);
            expect(result.hasBehavior(CountupTimerBehavior)).toBe(true);
        });

        it('sets sourceIds from statement IDs', () => {
            const s1 = stmtWith(MetricType.Effort, 'Run');
            const result = apply(strategy, [s1], runtime);
            expect(result.sourceIds).toEqual([s1.id]);
        });
    });
});
