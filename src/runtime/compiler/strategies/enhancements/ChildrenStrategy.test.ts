import { describe, it, expect } from 'bun:test';
import { apply, stubRuntime, makeStatement } from '@/testing/harness/StrategyTestHarness';
import { MetricType } from '@/core/models/Metric';
import { BlockBuilder } from '@/runtime/compiler/BlockBuilder';
import { ChildrenStrategy } from './ChildrenStrategy';
import { ChildSelectionBehavior, ExitBehavior, MetricPromotionBehavior } from '../../../behaviors';

const runtime = stubRuntime();

describe('ChildrenStrategy', () => {
    it('matches when statement has children', () => {
        const stmt = makeStatement([{ type: MetricType.Reps, value: 5, origin: 'parser' }], { children: [[1, 2]] });
        expect(apply(new ChildrenStrategy(), [stmt], runtime).matched).toBe(true);
    });

    it('does not match when no children or empty children', () => {
        const noChildren = makeStatement([{ type: MetricType.Reps, value: 5, origin: 'parser' }]);
        expect(apply(new ChildrenStrategy(), [noChildren], runtime).matched).toBe(false);

        const emptyChildren = makeStatement([{ type: MetricType.Reps, value: 5, origin: 'parser' }], { children: [] });
        expect(apply(new ChildrenStrategy(), [emptyChildren], runtime).matched).toBe(false);
    });

    it('returns early when builder already has ChildSelectionBehavior', () => {
        const builder = new BlockBuilder(runtime);
        builder.addBehavior(new ChildSelectionBehavior({ childGroups: [[1]] }));
        builder.addBehavior(new ExitBehavior({ mode: 'immediate' }));
        new ChildrenStrategy().apply(builder, [makeStatement([], { children: [[1]] })], runtime);
        expect(builder.hasBehavior(ExitBehavior)).toBe(true);
    });

    it('removes ExitBehavior and adds ChildSelectionBehavior plus deferred ExitBehavior', () => {
        const builder = new BlockBuilder(runtime);
        builder.addBehavior(new ExitBehavior({ mode: 'immediate' }));
        new ChildrenStrategy().apply(builder, [makeStatement([], { children: [[1]] })], runtime);
        expect(builder.hasBehavior(ChildSelectionBehavior)).toBe(true);
        expect(builder.hasBehavior(ExitBehavior)).toBe(true);
    });

    it('sets up looping when builder has countdown timer', () => {
        const builder = new BlockBuilder(runtime);
        builder.asTimer({ direction: 'down', durationMs: 60000 });
        new ChildrenStrategy().apply(builder, [makeStatement([], { children: [[1]] })], runtime);
        expect(builder.hasBehavior(ChildSelectionBehavior)).toBe(true);
        expect(builder.hasBehavior(ExitBehavior)).toBe(true);
    });

    it('reorders MetricPromotionBehavior to end if present', () => {
        const builder = new BlockBuilder(runtime);
        builder.addBehavior(new MetricPromotionBehavior({ promotions: [] }));
        new ChildrenStrategy().apply(builder, [makeStatement([], { children: [[1]] })], runtime);
        expect(builder.hasBehavior(MetricPromotionBehavior)).toBe(true);
        expect(builder.hasBehavior(ChildSelectionBehavior)).toBe(true);
    });
});
