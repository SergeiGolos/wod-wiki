import { describe, it, expect } from 'bun:test';
import { apply, stmtWith, makeStatement, stubRuntime } from '@/testing/harness/StrategyTestHarness';
import { MetricType } from '@/core/models/Metric';
import { BlockBuilder } from '../../BlockBuilder';
import { RoundsMetric } from '../../metrics/RoundsMetric';
import { GenericLoopStrategy } from './GenericLoopStrategy';
import {
    LabelingBehavior,
    MetricPromotionBehavior,
    ExitBehavior,
} from '../../../behaviors';

const runtime = stubRuntime();

describe('GenericLoopStrategy', () => {
    const strategy = new GenericLoopStrategy();

    describe('match', () => {
        it('returns true when any statement has a Rounds metric', () => {
            const stmts = [makeStatement([new RoundsMetric(3)])];
            expect(strategy.match(stmts, runtime)).toBe(true);
        });
        it('returns false when no rounds are present', () => {
            const stmts = [stmtWith(MetricType.Rep, 10)];
            expect(strategy.match(stmts, runtime)).toBe(false);
        });
        it('returns false for empty statements', () => {
            expect(strategy.match([], runtime)).toBe(false);
        });
    });

    describe('apply', () => {
        it('returns early when builder already has round config', () => {
            const builder = new BlockBuilder(runtime);
            builder.asRepeater({ totalRounds: 2 });
            const stmts = [makeStatement([new RoundsMetric(3)])];
            strategy.apply(builder, stmts, runtime);
            expect(builder.getBlockType()).toBe('Block');
        });
        it('sets blockType to Rounds and adds ExitBehavior and LabelingBehavior', () => {
            const stmts = [makeStatement([new RoundsMetric(5)])];
            const result = apply(strategy, stmts, runtime);
            expect(result.blockType).toBe('Rounds');
            expect(result.exitMode).toBe('immediate');
            expect(result.hasBehavior(LabelingBehavior)).toBe(true);
        });
        it('uses asRepeater so the builder has round config after apply', () => {
            const stmts = [makeStatement([new RoundsMetric(4)])];
            const result = apply(strategy, stmts, runtime);
            expect(result.matched).toBe(true);
            expect(result.blockType).toBe('Rounds');
        });
        it('handles a rep scheme alongside rounds', () => {
            const stmts = [
                makeStatement([
                    new RoundsMetric(3),
                    { type: MetricType.Rep, value: 21, origin: 'parser' },
                    { type: MetricType.Rep, value: 15, origin: 'parser' },
                    { type: MetricType.Rep, value: 9, origin: 'parser' },
                ]),
            ];
            const result = apply(strategy, stmts, runtime);
            expect(result.blockType).toBe('Rounds');
            const promotion = result.getBehavior(MetricPromotionBehavior);
            expect(promotion).toBeDefined();
            expect(promotion!.repScheme).toEqual([21, 15, 9]);
        });
        it('adds MetricPromotionBehavior for resistance metrics', () => {
            const stmts = [
                makeStatement([
                    new RoundsMetric(3),
                    { type: MetricType.Resistance, value: 225, origin: 'parser' },
                ]),
            ];
            const result = apply(strategy, stmts, runtime);
            expect(result.hasBehavior(MetricPromotionBehavior)).toBe(true);
        });
    });
});
