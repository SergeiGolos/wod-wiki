import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { ExecutionContextTestHarness } from '@/testing/harness';
import { SessionRootStrategy } from '../SessionRootStrategy';
import { SessionRootConfig } from '../../../blocks/SessionRootBlock';
import {
    TimerBehavior,
    ReEntryBehavior,
    RoundsEndBehavior,
    RoundDisplayBehavior,
    ChildSelectionBehavior,
    DisplayInitBehavior,
    ButtonBehavior,
    HistoryRecordBehavior,
    SegmentOutputBehavior
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
            const statements = [{ id: 1, fragments: [], children: [], meta: {} }] as any[];
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

            expect(block.getBehavior(SegmentOutputBehavior)).toBeDefined();
            expect(block.getBehavior(TimerBehavior)).toBeDefined();
            expect(block.getBehavior(ChildSelectionBehavior)).toBeDefined();
            expect(block.getBehavior(DisplayInitBehavior)).toBeDefined();
            expect(block.getBehavior(ButtonBehavior)).toBeDefined();
            expect(block.getBehavior(HistoryRecordBehavior)).toBeDefined();
        });

        it('should NOT include round behaviors for single-round session', () => {
            const config: SessionRootConfig = {
                childGroups: [[1]],
                totalRounds: 1
            };

            const block = strategy.build(harness.runtime, config);

            expect(block.getBehavior(ReEntryBehavior)).toBeDefined();
            expect(block.getBehavior(RoundsEndBehavior)).toBeDefined();
            expect(block.getBehavior(RoundDisplayBehavior)).toBeUndefined();
            expect(block.getBehavior(ChildSelectionBehavior)).toBeDefined();
        });

        it('should include round behaviors for multi-round session', () => {
            const config: SessionRootConfig = {
                childGroups: [[1]],
                totalRounds: 3
            };

            const block = strategy.build(harness.runtime, config);

            expect(block.getBehavior(ReEntryBehavior)).toBeDefined();
            expect(block.getBehavior(RoundsEndBehavior)).toBeDefined();
            expect(block.getBehavior(RoundDisplayBehavior)).toBeDefined();
            expect(block.getBehavior(ChildSelectionBehavior)).toBeDefined();
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
                { id: 10, fragments: [], children: [], meta: {} },
                { id: 20, fragments: [], children: [], meta: {} },
                { id: 30, fragments: [], children: [], meta: {} }
            ] as any[];

            const block = strategy.buildFromStatements(harness.runtime, statements);

            // Each statement becomes its own child group
            expect(block.sourceIds).toEqual([10, 20, 30]);
            expect(block.blockType).toBe('SessionRoot');
        });

        it('should pass through label option', () => {
            const statements = [
                { id: 1, fragments: [], children: [], meta: {} }
            ] as any[];

            const block = strategy.buildFromStatements(harness.runtime, statements, {
                label: 'Grace'
            });

            expect(block.label).toBe('Grace');
        });

        it('should pass through totalRounds option', () => {
            const statements = [
                { id: 1, fragments: [], children: [], meta: {} }
            ] as any[];

            const block = strategy.buildFromStatements(harness.runtime, statements, {
                totalRounds: 5
            });

            // Multi-round should have round behaviors
            expect(block.getBehavior(ReEntryBehavior)).toBeDefined();
            expect(block.getBehavior(RoundsEndBehavior)).toBeDefined();
        });

        it('should default to single-round when no options provided', () => {
            const statements = [
                { id: 1, fragments: [], children: [], meta: {} }
            ] as any[];

            const block = strategy.buildFromStatements(harness.runtime, statements);

            expect(block.getBehavior(ReEntryBehavior)).toBeDefined();
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
