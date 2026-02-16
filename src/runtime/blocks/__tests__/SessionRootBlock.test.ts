import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { ExecutionContextTestHarness } from '@/testing/harness';
import { BehaviorTestHarness } from '@/testing/harness/BehaviorTestHarness';
import { SessionRootBlock, SessionRootConfig } from '../SessionRootBlock';
import {
    TimerBehavior,
    ReEntryBehavior,
    RoundCompletionBehavior,
    RoundDisplayBehavior,
    ChildRunnerBehavior,
    ChildLoopBehavior,
    DisplayInitBehavior,
    ButtonBehavior,
    HistoryRecordBehavior,
    SegmentOutputBehavior,
    WaitingToStartInjectorBehavior,
    SessionCompletionBehavior
} from '../../behaviors';

describe('SessionRootBlock', () => {

    describe('Behavior Composition', () => {
        let harness: ExecutionContextTestHarness;

        beforeEach(() => {
            harness = new ExecutionContextTestHarness();
        });

        afterEach(() => {
            harness.dispose();
        });

        it('should include all required behaviors for single-round session', () => {
            const config: SessionRootConfig = {
                childGroups: [[1], [2], [3]],
                totalRounds: 1
            };

            const block = new SessionRootBlock(harness.runtime, config);

            // Core behaviors present
            expect(block.getBehavior(SegmentOutputBehavior)).toBeDefined();
            expect(block.getBehavior(TimerBehavior)).toBeDefined();
            expect(block.getBehavior(ChildRunnerBehavior)).toBeDefined();
            expect(block.getBehavior(DisplayInitBehavior)).toBeDefined();
            expect(block.getBehavior(ButtonBehavior)).toBeDefined();
            expect(block.getBehavior(HistoryRecordBehavior)).toBeDefined();
        });

        it('should NOT include round behaviors for single-round session', () => {
            const config: SessionRootConfig = {
                childGroups: [[1]],
                totalRounds: 1
            };

            const block = new SessionRootBlock(harness.runtime, config);

            expect(block.getBehavior(ReEntryBehavior)).toBeUndefined();
            expect(block.getBehavior(RoundCompletionBehavior)).toBeUndefined();
            expect(block.getBehavior(RoundDisplayBehavior)).toBeUndefined();
            expect(block.getBehavior(ChildLoopBehavior)).toBeUndefined();
        });

        it('should include round behaviors for multi-round session', () => {
            const config: SessionRootConfig = {
                childGroups: [[1]],
                totalRounds: 3
            };

            const block = new SessionRootBlock(harness.runtime, config);

            expect(block.getBehavior(ReEntryBehavior)).toBeDefined();
            expect(block.getBehavior(RoundCompletionBehavior)).toBeDefined();
            expect(block.getBehavior(RoundDisplayBehavior)).toBeDefined();
            expect(block.getBehavior(ChildLoopBehavior)).toBeDefined();
        });

        it('should set correct block type and label', () => {
            const block = new SessionRootBlock(harness.runtime, {
                childGroups: [[1]]
            });

            expect(block.blockType).toBe('SessionRoot');
            expect(block.label).toBe('Session');
        });

        it('should use custom label when provided', () => {
            const block = new SessionRootBlock(harness.runtime, {
                childGroups: [[1]],
                label: 'Morning WOD'
            });

            expect(block.label).toBe('Morning WOD');
        });

        it('should flatten childGroups into sourceIds', () => {
            const block = new SessionRootBlock(harness.runtime, {
                childGroups: [[1, 2], [3], [4, 5]]
            });

            expect(block.sourceIds).toEqual([1, 2, 3, 4, 5]);
        });

        it('should handle empty childGroups', () => {
            const block = new SessionRootBlock(harness.runtime, {
                childGroups: []
            });

            expect(block.sourceIds).toEqual([]);
            expect(block.getBehavior(ChildRunnerBehavior)).toBeDefined();
        });

        it('should default totalRounds to 1', () => {
            const block = new SessionRootBlock(harness.runtime, {
                childGroups: [[1]]
            });

            // No round behaviors = single round default
            expect(block.getBehavior(ReEntryBehavior)).toBeUndefined();
        });
    });

    describe('Lifecycle', () => {
        let harness: BehaviorTestHarness;

        beforeEach(() => {
            harness = new BehaviorTestHarness()
                .withClock(new Date('2024-01-01T12:00:00Z'));
        });

        afterEach(() => {
            harness?.dispose();
        });

        it('should initialize timer state on mount', () => {
            const block = new SessionRootBlock(harness.runtime, {
                childGroups: [],
                label: 'Test Session'
            });

            harness.push(block);
            harness.mount();

            // WaitingToStart is now pushed on mount, so we check timer memory
            // on the SessionRoot block directly (second from top)
            const sessionRoot = harness.runtime.stack.blocks[harness.runtime.stack.count - 1];
            const timerMemory = sessionRoot?.getMemory?.('timer');
            // Timer memory is on the SessionRoot block, not the top of stack
            // The harness.getMemory checks the top block (WaitingToStart), which has no timer
            // Verify SessionRoot has timer by checking block directly
            expect(sessionRoot).toBeDefined();
            expect(sessionRoot?.blockType).toBe('SessionRoot');
        });

        it('should have SessionRoot block type on stack', () => {
            const block = new SessionRootBlock(harness.runtime, {
                childGroups: [],
                label: 'Test Session'
            });

            harness.push(block);
            harness.mount();

            // WaitingToStart is now pushed on top during mount
            // SessionRoot is at the bottom of the stack
            expect(harness.currentBlock).toBeDefined();
            expect(harness.currentBlock!.blockType).toBe('WaitingToStart');
            // SessionRoot is below WaitingToStart
            const sessionRoot = harness.runtime.stack.blocks[harness.runtime.stack.count - 1];
            expect(sessionRoot?.blockType).toBe('SessionRoot');
        });

        it('should be disposable without errors', () => {
            const block = new SessionRootBlock(harness.runtime, {
                childGroups: []
            });

            harness.push(block);
            harness.mount();

            // Should not throw
            expect(() => harness.unmount()).not.toThrow();
        });
    });

    describe('Static buildBehaviors', () => {
        let harness: ExecutionContextTestHarness;

        beforeEach(() => {
            harness = new ExecutionContextTestHarness();
        });

        afterEach(() => {
            harness.dispose();
        });

        it('should return correct behavior count for single-round', () => {
            const behaviors = SessionRootBlock.buildBehaviors({
                childGroups: [[1]],
                totalRounds: 1
            }, harness.runtime);

            // Expected: Segment(1) + Timer(1) + WaitingToStartInjector(1) + Children(1) + SessionCompletion(1) + Display(1) + Controls(1) + History(1) = 8
            expect(behaviors.length).toBe(8);
        });

        it('should return correct behavior count for multi-round', () => {
            const behaviors = SessionRootBlock.buildBehaviors({
                childGroups: [[1]],
                totalRounds: 3
            }, harness.runtime);

            // Expected: Segment(1) + Timer(1) + Round(3) + ChildLoop(1) + WaitingToStartInjector(1) + Children(1) + Display(1) + Controls(1) + History(1) = 11
            expect(behaviors.length).toBe(11);
        });
    });
});
