import { describe, it, expect, afterEach } from 'bun:test';
import { RoundsEndBehavior } from '../RoundsEndBehavior';
import { BehaviorTestHarness, MockBlock } from '@/testing/harness';
import { MemoryLocation } from '../../memory/MemoryLocation';

describe('RoundsEndBehavior', () => {
    let harness: BehaviorTestHarness;

    afterEach(() => { harness?.dispose(); });

    function setup(opts: { round?: { current: number; total: number | undefined }; isComplete?: boolean } = {}) {
        harness = new BehaviorTestHarness().withClock(new Date(0));
        const block = new MockBlock('round-block', [new RoundsEndBehavior()], { label: 'Rounds' });
        if (opts.round) {
            block.pushMemory(new MemoryLocation('round', [opts.round as any]));
        }
        harness.push(block);
        harness.mount();
        if (opts.isComplete) block.markComplete('pre-existing');
        return block;
    }

    it('skips when block is already marked complete', () => {
        const block = setup({ round: { current: 4, total: 3 }, isComplete: true });

        const actions = harness.next();

        // markComplete was called once (the pre-existing one), not again by behavior
        expect(block.recordings.markComplete).toHaveLength(0);
        expect(actions).toEqual([]);
    });

    it('completes block when current > total (bounded rounds)', () => {
        const block = setup({ round: { current: 4, total: 3 } });

        const actions = harness.next();

        expect(block.recordings.markComplete).toHaveLength(1);
        expect(block.recordings.markComplete[0].reason).toBe('rounds-exhausted');
        expect(actions.length).toBe(1);
        expect(actions[0].type).toBe('pop-block');
    });

    it('does not complete for unbounded rounds', () => {
        const block = setup({ round: { current: 10, total: undefined } });

        const actions = harness.next();

        expect(block.recordings.markComplete).toHaveLength(0);
        expect(actions).toEqual([]);
    });

    it('does not complete when current equals total (safety net for ChildSelection)', () => {
        // ChildSelectionBehavior handles completion when shouldLoop returns false.
        // RoundsEndBehavior only fires as a safety net when current exceeds total.
        const block = setup({ round: { current: 3, total: 3 } });

        const actions = harness.next();

        expect(block.recordings.markComplete).toHaveLength(0);
        expect(actions).toEqual([]);
    });

    it('does not complete single-round block when current equals total', () => {
        const block = setup({ round: { current: 1, total: 1 } });

        const actions = harness.next();

        expect(block.recordings.markComplete).toHaveLength(0);
        expect(actions).toEqual([]);
    });

    it('no-ops when no round state exists', () => {
        const block = setup();

        const actions = harness.next();

        expect(block.recordings.markComplete).toHaveLength(0);
        expect(actions).toEqual([]);
    });
});
