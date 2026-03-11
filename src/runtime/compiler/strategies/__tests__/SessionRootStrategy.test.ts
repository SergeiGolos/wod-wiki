import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { ExecutionContextTestHarness } from '@/testing/harness';
import { SessionRootStrategy } from '../SessionRootStrategy';
import { SessionRootConfig } from '../../../blocks/SessionRootBlock';
import {
    CountupTimerBehavior,
    ChildSelectionBehavior,
    LabelingBehavior,
    ButtonBehavior,
    ReportOutputBehavior
} from '../../../behaviors';

describe('SessionRootStrategy', () => {
    let strategy: SessionRootStrategy;

    beforeEach(() => {
        strategy = new SessionRootStrategy();
    });

    describe('match()', () => {
        it('should always return false (root blocks are built directly)', () => {
            expect(strategy.match([], {} as any)).toBe(false);
        });

        it('should return false even with valid statements', () => {
            const statements = [{ id: 1, metrics: [], children: [], meta: {}, metricMeta: new Map() }] as any[];
            expect(strategy.match(statements, {} as any)).toBe(false);
        });
    });

    describe('apply()', () => {
        it('should be a no-op', () => {
            // apply() should not throw or modify anything
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

        it('should create a SessionRootBlock with correct block type', () => {
            const config: SessionRootConfig = {
                childGroups: [[1], [2]],
                label: 'Test WOD'
            };

            const block = strategy.build(harness.runtime, config);

            expect(block).toBeDefined();
            expect(block.blockType).toBe('SessionRoot');
        });

        it('should use provided label', () => {
            const config: SessionRootConfig = {
                childGroups: [[1]],
                label: 'Morning WOD'
            };

            const block = strategy.build(harness.runtime, config);

            expect(block.label).toBe('Morning WOD');
        });

        it('should default label to "Session"', () => {
            const config: SessionRootConfig = {
                childGroups: [[1]]
            };

            const block = strategy.build(harness.runtime, config);

            expect(block.label).toBe('Session');
        });

        it('should include all required behaviors for single-round session', () => {
            const config: SessionRootConfig = {
                childGroups: [[1], [2], [3]],
                totalRounds: 1
            };

            const block = strategy.build(harness.runtime, config);

            expect(block.getBehavior(ReportOutputBehavior)).toBeDefined();
            expect(block.getBehavior(CountupTimerBehavior)).toBeDefined();
            expect(block.getBehavior(ChildSelectionBehavior)).toBeDefined();
            expect(block.getBehavior(LabelingBehavior)).toBeDefined();
            expect(block.getBehavior(ButtonBehavior)).toBeDefined();
        });

        it('should include iteration config in ChildSelectionBehavior for single-round session', () => {
            const config: SessionRootConfig = {
                childGroups: [[1]],
                totalRounds: 1
            };

            const block = strategy.build(harness.runtime, config);
            const csb = block.getBehavior(ChildSelectionBehavior);

            expect(csb).toBeDefined();
            expect((csb as any).config?.startRound).toBeDefined();
            expect((csb as any).config?.totalRounds).toBe(1);
        });

        it('should include round config in ChildSelectionBehavior for multi-round session', () => {
            const config: SessionRootConfig = {
                childGroups: [[1]],
                totalRounds: 3
            };

            const block = strategy.build(harness.runtime, config);
            const csb = block.getBehavior(ChildSelectionBehavior);

            expect(csb).toBeDefined();
            expect((csb as any).config?.startRound).toBeDefined();
            expect((csb as any).config?.totalRounds).toBe(3);
        });

        it('should flatten child groups for source IDs', () => {
            const config: SessionRootConfig = {
                childGroups: [[1, 2], [3]]
            };

            const block = strategy.build(harness.runtime, config);

            expect(block.sourceIds).toEqual([1, 2, 3]);
        });
    });

    describe('buildFromStatements()', () => {
        let harness: ExecutionContextTestHarness;

        beforeEach(() => {
            harness = new ExecutionContextTestHarness();
        });

        afterEach(() => {
            harness.dispose();
        });

        it('should create child groups from statement IDs', () => {
            const statements = [
                { id: 10, metrics: [], children: [], meta: {}, metricMeta: new Map() },
                { id: 20, metrics: [], children: [], meta: {}, metricMeta: new Map() },
                { id: 30, metrics: [], children: [], meta: {}, metricMeta: new Map() }
            ] as any[];

            const block = strategy.buildFromStatements(harness.runtime, statements);

            // Each statement becomes its own child group
            expect(block.sourceIds).toEqual([10, 20, 30]);
            expect(block.blockType).toBe('SessionRoot');
        });

        it('should pass through label option', () => {
            const statements = [
                { id: 1, metrics: [], children: [], meta: {}, metricMeta: new Map() }
            ] as any[];

            const block = strategy.buildFromStatements(harness.runtime, statements, {
                label: 'Grace'
            });

            expect(block.label).toBe('Grace');
        });

        it('should pass through totalRounds option', () => {
            const statements = [
                { id: 1, metrics: [], children: [], meta: {}, metricMeta: new Map() }
            ] as any[];

            const block = strategy.buildFromStatements(harness.runtime, statements, {
                totalRounds: 5
            });

            // Multi-round should wire totalRounds into ChildSelectionBehavior config
            const csb = block.getBehavior(ChildSelectionBehavior);
            expect(csb).toBeDefined();
            expect((csb as any).config?.totalRounds).toBe(5);
        });

        it('should default to single-round when no options provided', () => {
            const statements = [
                { id: 1, metrics: [], children: [], meta: {}, metricMeta: new Map() }
            ] as any[];

            const block = strategy.buildFromStatements(harness.runtime, statements);

            // Default single-round session should still have ChildSelectionBehavior with startRound
            const csb = block.getBehavior(ChildSelectionBehavior);
            expect(csb).toBeDefined();
            expect((csb as any).config?.startRound).toBeDefined();
        });
    });

    describe('priority', () => {
        it('should have priority 100', () => {
            expect(strategy.priority).toBe(100);
        });
    });

    describe('default instance', () => {
        it('should export a default instance', async () => {
            const { sessionRootStrategy } = await import('../SessionRootStrategy');
            expect(sessionRootStrategy).toBeInstanceOf(SessionRootStrategy);
        });
    });
});
