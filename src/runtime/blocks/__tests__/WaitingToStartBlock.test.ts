import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { ExecutionContextTestHarness } from '@/testing/harness';
import { BehaviorTestHarness } from '@/testing/harness/BehaviorTestHarness';
import { WaitingToStartBlock } from '../WaitingToStartBlock';
import {
    ReportOutputBehavior,
    LeafExitBehavior,
    DisplayInitBehavior,
    ButtonBehavior
} from '../../behaviors';

describe('WaitingToStartBlock', () => {

    describe('Behavior Composition', () => {
        let harness: ExecutionContextTestHarness;

        beforeEach(() => {
            harness = new ExecutionContextTestHarness();
        });

        afterEach(() => {
            harness.dispose();
        });

        it('should include all required behaviors', () => {
            const block = new WaitingToStartBlock(harness.runtime);

            expect(block.getBehavior(ReportOutputBehavior)).toBeDefined();
            expect(block.getBehavior(DisplayInitBehavior)).toBeDefined();
            expect(block.getBehavior(ButtonBehavior)).toBeDefined();
            expect(block.getBehavior(LeafExitBehavior)).toBeDefined();
        });

        it('should set correct block type and label', () => {
            const block = new WaitingToStartBlock(harness.runtime);

            expect(block.blockType).toBe('WaitingToStart');
            expect(block.label).toBe('Ready to Start');
        });

        it('should have no source IDs', () => {
            const block = new WaitingToStartBlock(harness.runtime);

            expect(block.sourceIds).toEqual([]);
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

        it('should mount without errors', () => {
            const block = new WaitingToStartBlock(harness.runtime);

            harness.push(block);

            expect(() => harness.mount()).not.toThrow();
        });

        it('should have WaitingToStart block type on stack after mount', () => {
            const block = new WaitingToStartBlock(harness.runtime);

            harness.push(block);
            harness.mount();

            expect(harness.currentBlock).toBeDefined();
            expect(harness.currentBlock!.blockType).toBe('WaitingToStart');
        });

        it('should NOT auto-complete on mount', () => {
            const block = new WaitingToStartBlock(harness.runtime);

            harness.push(block);
            harness.mount();

            expect(block.isComplete).toBe(false);
        });

        it('should mark complete and pop on next()', () => {
            const block = new WaitingToStartBlock(harness.runtime);

            harness.push(block);
            harness.mount();

            // Simulate user clicking "Start"
            harness.next();

            expect(block.isComplete).toBe(true);
        });

        it('should be disposable without errors', () => {
            const block = new WaitingToStartBlock(harness.runtime);

            harness.push(block);
            harness.mount();

            expect(() => harness.unmount()).not.toThrow();
        });
    });

    describe('Static buildBehaviors', () => {
        it('should return correct behavior count', () => {
            const behaviors = WaitingToStartBlock.buildBehaviors();

            // Expected: Segment(1) + Display(1) + Button(1) + LeafExit(1) = 4
            expect(behaviors.length).toBe(4);
        });
    });
});
