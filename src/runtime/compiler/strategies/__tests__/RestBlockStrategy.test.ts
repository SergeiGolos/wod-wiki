import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { ExecutionContextTestHarness } from '@/testing/harness';
import { RestBlockStrategy } from '../components/RestBlockStrategy';
import {
    ReportOutputBehavior,
    TimerBehavior,
    TimerEndingBehavior,
    LabelingBehavior,
    SoundCueBehavior
} from '../../../behaviors';

describe('RestBlockStrategy', () => {
    let strategy: RestBlockStrategy;

    beforeEach(() => {
        strategy = new RestBlockStrategy();
    });

    describe('match()', () => {
        it('should always return false (rest blocks are auto-generated)', () => {
            expect(strategy.match([], {} as any)).toBe(false);
        });

        it('should return false even with valid statements', () => {
            const statements = [{ id: 1, fragments: [], children: [], meta: {} }] as any[];
            expect(strategy.match(statements, {} as any)).toBe(false);
        });
    });

    describe('apply()', () => {
        it('should be a no-op', () => {
            expect(() => strategy.apply({} as any, [], {} as any)).not.toThrow();
        });
    });

    describe('build()', () => {
        let harness: ExecutionContextTestHarness;

        beforeEach(() => {
            harness = new ExecutionContextTestHarness();
        });

        afterEach(() => {
            harness.dispose();
        });

        it('should create a RestBlock with correct block type', () => {
            const block = strategy.build(harness.runtime, {
                durationMs: 30000
            });

            expect(block).toBeDefined();
            expect(block.blockType).toBe('Rest');
        });

        it('should use provided duration', () => {
            const block = strategy.build(harness.runtime, {
                durationMs: 60000
            });

            const timer = block.getBehavior(TimerBehavior);
            expect(timer).toBeDefined();
        });

        it('should use provided label', () => {
            const block = strategy.build(harness.runtime, {
                durationMs: 30000,
                label: 'Break Time'
            });

            expect(block.label).toBe('Break Time');
        });

        it('should default label to "Rest"', () => {
            const block = strategy.build(harness.runtime, {
                durationMs: 30000
            });

            expect(block.label).toBe('Rest');
        });

        it('should include ReportOutputBehavior', () => {
            const block = strategy.build(harness.runtime, { durationMs: 30000 });

            expect(block.getBehavior(ReportOutputBehavior)).toBeDefined();
        });

        it('should include TimerBehavior (countdown)', () => {
            const block = strategy.build(harness.runtime, { durationMs: 30000 });

            expect(block.getBehavior(TimerBehavior)).toBeDefined();
        });

        it('should include TimerEndingBehavior', () => {
            const block = strategy.build(harness.runtime, { durationMs: 30000 });

            expect(block.getBehavior(TimerEndingBehavior)).toBeDefined();
        });

        it('should include LabelingBehavior', () => {
            const block = strategy.build(harness.runtime, { durationMs: 30000 });

            expect(block.getBehavior(LabelingBehavior)).toBeDefined();
        });

        it('should include SoundCueBehavior', () => {
            const block = strategy.build(harness.runtime, { durationMs: 30000 });

            expect(block.getBehavior(SoundCueBehavior)).toBeDefined();
        });

        it('should throw on negative duration', () => {
            expect(() => {
                strategy.build(harness.runtime, { durationMs: -1000 });
            }).toThrow(RangeError);
        });

        it('should accept zero duration', () => {
            const block = strategy.build(harness.runtime, { durationMs: 0 });

            expect(block).toBeDefined();
            expect(block.blockType).toBe('Rest');
        });

        it('should have no source statement IDs', () => {
            const block = strategy.build(harness.runtime, { durationMs: 30000 });

            expect(block.sourceIds).toEqual([]);
        });
    });

    describe('buildWithDuration()', () => {
        let harness: ExecutionContextTestHarness;

        beforeEach(() => {
            harness = new ExecutionContextTestHarness();
        });

        afterEach(() => {
            harness.dispose();
        });

        it('should create a RestBlock with specified duration', () => {
            const block = strategy.buildWithDuration(harness.runtime, 45000);

            expect(block).toBeDefined();
            expect(block.blockType).toBe('Rest');
        });

        it('should use provided label', () => {
            const block = strategy.buildWithDuration(harness.runtime, 45000, 'Cool Down');

            expect(block.label).toBe('Cool Down');
        });

        it('should default label to "Rest"', () => {
            const block = strategy.buildWithDuration(harness.runtime, 45000);

            expect(block.label).toBe('Rest');
        });

        it('should throw on negative duration', () => {
            expect(() => {
                strategy.buildWithDuration(harness.runtime, -5000);
            }).toThrow(RangeError);
        });
    });

    describe('priority', () => {
        it('should have priority 50', () => {
            expect(strategy.priority).toBe(50);
        });
    });

    describe('default instance', () => {
        it('should export a default instance', async () => {
            const { restBlockStrategy } = await import('../components/RestBlockStrategy');
            expect(restBlockStrategy).toBeInstanceOf(RestBlockStrategy);
        });
    });
});
