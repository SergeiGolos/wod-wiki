import { describe, it, expect } from 'bun:test';
import { apply, stmtWith, stubRuntime } from '@/testing/harness/StrategyTestHarness';
import { MetricType } from '@/core/models/Metric';
import { BlockBuilder } from '@/runtime/compiler/BlockBuilder';
import { ReportOutputStrategy } from './ReportOutputStrategy';
import { ReportOutputBehavior } from '../../../behaviors';

const runtime = stubRuntime();

describe('ReportOutputStrategy', () => {
    it('matches non-empty statements', () => {
        expect(apply(new ReportOutputStrategy(), [stmtWith(MetricType.Reps, 5)], runtime).matched).toBe(true);
    });

    it('does not match empty statements', () => {
        expect(apply(new ReportOutputStrategy(), [], runtime).matched).toBe(false);
    });

    it('adds ReportOutputBehavior when not present', () => {
        const result = apply(new ReportOutputStrategy(), [stmtWith(MetricType.Reps, 5)], runtime);
        expect(result.hasBehavior(ReportOutputBehavior)).toBe(true);
    });

    it('skips when builder already has ReportOutputBehavior', () => {
        const builder = new BlockBuilder(runtime);
        builder.addBehavior(new ReportOutputBehavior());
        new ReportOutputStrategy().apply(builder, [stmtWith(MetricType.Reps, 5)], runtime);
        expect(builder.hasBehavior(ReportOutputBehavior)).toBe(true);
    });
});
