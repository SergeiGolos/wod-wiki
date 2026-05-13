/**
 * Unit tests for PushRestBlockAction
 *
 * Targets: src/runtime/actions/stack/PushRestBlockAction.ts
 * (64.28% — 5 missing lines per Codecov WOD-271)
 *
 * Coverage goals:
 *  - Constructor stores durationMs and label
 *  - type field is 'push-rest-block'
 *  - do() constructs a RestBlock and returns a PushBlockAction
 *  - Default label is "Rest" when not supplied
 *  - Custom label is passed through to the RestBlock
 */
import { describe, it, expect, afterEach } from 'bun:test';
import { PushRestBlockAction } from '../PushRestBlockAction';
import { PushBlockAction } from '../PushBlockAction';
import { BehaviorTestHarness } from '@/testing/harness';

describe('PushRestBlockAction', () => {
    let harness: BehaviorTestHarness;

    afterEach(() => { harness?.dispose(); });

    it('has type "push-rest-block"', () => {
        const action = new PushRestBlockAction(30_000);
        expect(action.type).toBe('push-rest-block');
    });

    it('stores durationMs', () => {
        const action = new PushRestBlockAction(45_000);
        expect(action.durationMs).toBe(45_000);
    });

    it('defaults label to "Rest"', () => {
        const action = new PushRestBlockAction(30_000);
        expect(action.label).toBe('Rest');
    });

    it('accepts a custom label', () => {
        const action = new PushRestBlockAction(30_000, 'Recovery');
        expect(action.label).toBe('Recovery');
    });

    it('do() returns exactly one PushBlockAction', () => {
        harness = new BehaviorTestHarness();
        const action = new PushRestBlockAction(30_000);

        const childActions = action.do(harness.runtime);

        expect(childActions).toHaveLength(1);
        expect(childActions[0]).toBeInstanceOf(PushBlockAction);
        expect(childActions[0].type).toBe('push-block');
    });

    it('do() pushes a block with the correct label', () => {
        harness = new BehaviorTestHarness();
        const action = new PushRestBlockAction(60_000, 'Cooldown');

        const childActions = action.do(harness.runtime);

        const pushAction = childActions[0] as PushBlockAction;
        expect(pushAction.block.label).toBe('Cooldown');
    });

    it('do() creates a block with the configured duration in memory', () => {
        harness = new BehaviorTestHarness();
        const durationMs = 90_000;
        const action = new PushRestBlockAction(durationMs);

        const childActions = action.do(harness.runtime);

        // PushBlockAction carries the block reference
        const pushAction = childActions[0] as PushBlockAction;
        expect(pushAction.block).toBeDefined();
        expect(pushAction.block.blockType).toBe('Rest');
    });
});
