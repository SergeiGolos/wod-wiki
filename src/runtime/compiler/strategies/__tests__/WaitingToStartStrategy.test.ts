import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { ExecutionContextTestHarness } from '@/testing/harness';
import { WaitingToStartStrategy } from '../WaitingToStartStrategy';
import {
    ReportOutputBehavior,
    LeafExitBehavior,
    DisplayInitBehavior,
    ButtonBehavior
} from '../../../behaviors';

describe('WaitingToStartStrategy', () => {
    let strategy: WaitingToStartStrategy;

    beforeEach(() => {
        strategy = new WaitingToStartStrategy();
    });

    describe('match()', () => {
        it('should always return false (idle blocks are built directly)', () => {
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

        it('should create a WaitingToStartBlock with correct block type', () => {
            const block = strategy.build(harness.runtime);

            expect(block).toBeDefined();
            expect(block.blockType).toBe('WaitingToStart');
        });

        it('should have "Ready to Start" label', () => {
            const block = strategy.build(harness.runtime);

            expect(block.label).toBe('Ready to Start');
        });

        it('should include ReportOutputBehavior', () => {
            const block = strategy.build(harness.runtime);

            expect(block.getBehavior(ReportOutputBehavior)).toBeDefined();
        });

        it('should include LeafExitBehavior', () => {
            const block = strategy.build(harness.runtime);

            expect(block.getBehavior(LeafExitBehavior)).toBeDefined();
        });

        it('should include DisplayInitBehavior', () => {
            const block = strategy.build(harness.runtime);

            expect(block.getBehavior(DisplayInitBehavior)).toBeDefined();
        });

        it('should include ButtonBehavior', () => {
            const block = strategy.build(harness.runtime);

            expect(block.getBehavior(ButtonBehavior)).toBeDefined();
        });

        it('should have no source statement IDs', () => {
            const block = strategy.build(harness.runtime);

            expect(block.sourceIds).toEqual([]);
        });

        it('should create independent instances', () => {
            const block1 = strategy.build(harness.runtime);
            const block2 = strategy.build(harness.runtime);

            expect(block1).not.toBe(block2);
            expect(block1.key).not.toBe(block2.key);
        });
    });

    describe('priority', () => {
        it('should have priority 100', () => {
            expect(strategy.priority).toBe(100);
        });
    });

    describe('default instance', () => {
        it('should export a default instance', async () => {
            const { waitingToStartStrategy } = await import('../WaitingToStartStrategy');
            expect(waitingToStartStrategy).toBeInstanceOf(WaitingToStartStrategy);
        });
    });
});
