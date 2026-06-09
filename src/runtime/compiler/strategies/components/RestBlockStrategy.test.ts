import { describe, it, expect } from 'bun:test';
import { apply, stmtWith, stubRuntime } from '@/testing/harness/StrategyTestHarness';
import { MetricType } from '@/core/models/Metric';
import { RestBlockStrategy } from './RestBlockStrategy';
import { RestBlock } from '../../../blocks/RestBlock';

const runtime = stubRuntime();

describe('RestBlockStrategy', () => {
    const strategy = new RestBlockStrategy();

    it('match always returns false', () => {
        const stmts = [stmtWith(MetricType.Duration, 60_000)];
        expect(strategy.match(stmts, runtime)).toBe(false);
    });
    it('apply is a no-op', () => {
        const stmts = [stmtWith(MetricType.Duration, 60_000)];
        const result = apply(strategy, stmts, runtime);
        expect(result.matched).toBe(false);
        expect(result.blockType).toBe('Block');
    });
    it('build creates a real RestBlock', () => {
        const block = strategy.build(runtime, { durationMs: 30_000, label: 'Rest' });
        expect(block).toBeInstanceOf(RestBlock);
    });
    it('buildWithDuration creates a RestBlock with the given duration', () => {
        const block = strategy.buildWithDuration(runtime, 45_000);
        expect(block).toBeInstanceOf(RestBlock);
    });
});
