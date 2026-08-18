import { describe, it, expect } from 'vitest';
import { apply, stmtWith, stubRuntime } from '../harness/harness/StrategyTestHarness';
import { MetricType } from '@wod-wiki/core';
import { BlockBuilder } from '../../src/runtime/compiler/BlockBuilder';
import { ReportOutputStrategy } from '../../src/runtime/compiler/strategies/enhancements/ReportOutputStrategy';
import { ReportOutputBehavior } from '../../src/runtime/behaviors';

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
