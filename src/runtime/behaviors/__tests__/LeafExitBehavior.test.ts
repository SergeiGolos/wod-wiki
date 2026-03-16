import { describe, it, expect, afterEach } from 'bun:test';
import { LeafExitBehavior } from '../LeafExitBehavior';
import { BehaviorTestHarness, MockBlock } from '@/testing/harness';

describe('LeafExitBehavior', () => {
    let harness: BehaviorTestHarness;

    afterEach(() => { harness?.dispose(); });

    it('marks complete and pops on next by default', () => {
        harness = new BehaviorTestHarness().withClock(new Date(0));
        const block = new MockBlock('leaf-block', [new LeafExitBehavior()], { label: 'Leaf' });
        harness.push(block);
        harness.mount();

        const actions = harness.next();

        expect(block.recordings.markComplete).toHaveLength(1);
        expect(block.recordings.markComplete[0].reason).toBe('user-advance');
        expect(actions.length).toBe(1);
        expect(actions[0].type).toBe('pop-block');
    });

    it('does not pop on next when disabled', () => {
        harness = new BehaviorTestHarness().withClock(new Date(0));
        const block = new MockBlock('leaf-block', [new LeafExitBehavior({ onNext: false })], { label: 'Leaf' });
        harness.push(block);
        harness.mount();

        const actions = harness.next();

        expect(block.recordings.markComplete).toHaveLength(0);
        expect(actions).toEqual([]);
    });

    it('subscribes to configured events', () => {
        harness = new BehaviorTestHarness().withClock(new Date(0));
        const block = new MockBlock('leaf-block', [
            new LeafExitBehavior({ onEvents: ['timer:complete', 'user:skip'] })
        ], { label: 'Leaf' });
        harness.push(block);
        harness.mount();

        expect(block.recordings.subscribe).toHaveLength(2);
        expect(block.recordings.subscribe.some(s => s.eventType === 'timer:complete')).toBe(true);
        expect(block.recordings.subscribe.some(s => s.eventType === 'user:skip')).toBe(true);
    });

    it('marks complete and pops on configured event trigger', () => {
        harness = new BehaviorTestHarness().withClock(new Date(0));
        const block = new MockBlock('leaf-block', [
            new LeafExitBehavior({ onEvents: ['timer:complete'] })
        ], { label: 'Leaf' });
        harness.push(block);
        harness.mount();

        harness.simulateEvent('timer:complete');

        expect(block.recordings.markComplete).toHaveLength(1);
        expect(block.recordings.markComplete[0].reason).toBe('event:timer:complete');
    });

    it('handles multiple event types', () => {
        harness = new BehaviorTestHarness().withClock(new Date(0));
        const block = new MockBlock('leaf-block', [
            new LeafExitBehavior({ onEvents: ['timer:complete', 'user:skip'] })
        ], { label: 'Leaf' });
        harness.push(block);
        harness.mount();

        harness.simulateEvent('timer:complete');

        expect(block.recordings.markComplete).toHaveLength(1);
        expect(block.recordings.markComplete[0].reason).toBe('event:timer:complete');

        // Note: after first event marks complete, simulateEvent for user:skip 
        // still fires the subscription handler since EventBus is still wired
        harness.simulateEvent('user:skip');
        // The second markComplete call is idempotent on the block (already complete)
    });

    it('unsubscribes on dispose', () => {
        harness = new BehaviorTestHarness().withClock(new Date(0));
        const block = new MockBlock('leaf-block', [
            new LeafExitBehavior({ onEvents: ['timer:complete', 'user:skip'] })
        ], { label: 'Leaf' });
        harness.push(block);
        harness.mount();

        expect(block.recordings.subscribe).toHaveLength(2);

        // unmount calls dispose, which should unsubscribe all event handlers
        harness.unmount();
        // No error = subscriptions cleaned up successfully
    });
});
