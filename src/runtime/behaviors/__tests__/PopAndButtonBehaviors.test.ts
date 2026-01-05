import { describe, it, expect, beforeEach } from 'bun:test';
import { BehaviorTestHarness, MockBlock } from '@/testing/harness';
import { PopOnEventBehavior } from '../PopOnEventBehavior';
import { PopOnNextBehavior } from '../PopOnNextBehavior';
import { SingleButtonBehavior } from '../SingleButtonBehavior';
import { TransitionTimingBehavior } from '../TransitionTimingBehavior';

describe('PopOnEventBehavior', () => {
    it('should pop when matching event is received', () => {
        const behavior = new PopOnEventBehavior(['stop', 'view-results']);
        const block = new MockBlock('test', [behavior]);

        const event = { name: 'stop', timestamp: new Date(), data: {} };
        const actions = behavior.onEvent(event, block);

        expect(actions.some(a => a.type === 'pop-block')).toBe(true);
    });

    it('should not pop when non-matching event is received', () => {
        const behavior = new PopOnEventBehavior(['stop', 'view-results']);
        const block = new MockBlock('test', [behavior]);

        const event = { name: 'timer:tick', timestamp: new Date(), data: {} };
        const actions = behavior.onEvent(event, block);

        expect(actions.some(a => a.type === 'pop-block')).toBe(false);
    });

    it('should support multiple event types', () => {
        const behavior = new PopOnEventBehavior(['stop', 'view-results', 'dismiss']);
        const block = new MockBlock('test', [behavior]);

        // Each event should trigger pop
        const stopEvent = { name: 'stop', timestamp: new Date(), data: {} };
        expect(behavior.onEvent(stopEvent, block).some(a => a.type === 'pop-block')).toBe(true);

        const viewEvent = { name: 'view-results', timestamp: new Date(), data: {} };
        expect(behavior.onEvent(viewEvent, block).some(a => a.type === 'pop-block')).toBe(true);

        const dismissEvent = { name: 'dismiss', timestamp: new Date(), data: {} };
        expect(behavior.onEvent(dismissEvent, block).some(a => a.type === 'pop-block')).toBe(true);
    });
});

describe('PopOnNextBehavior', () => {
    let harness: BehaviorTestHarness;

    beforeEach(() => {
        harness = new BehaviorTestHarness();
    });

    it('should pop when next is called', () => {
        const behavior = new PopOnNextBehavior();
        const block = new MockBlock('test', [behavior]);

        harness.push(block);
        harness.mount();

        const actions = harness.next();

        expect(actions.some(a => a.type === 'pop-block')).toBe(true);
    });
});

describe('SingleButtonBehavior', () => {
    let harness: BehaviorTestHarness;

    beforeEach(() => {
        harness = new BehaviorTestHarness();
    });

    it('should register button on push', () => {
        const behavior = new SingleButtonBehavior({
            id: 'btn-start',
            label: 'Start',
            icon: 'play',
            action: 'timer:start',
            variant: 'default',
            size: 'lg'
        });
        const block = new MockBlock('test', [behavior]);

        harness.push(block);
        const actions = harness.mount();

        expect(actions.some(a => a.type === 'register-button')).toBe(true);
    });
});

describe('TransitionTimingBehavior', () => {
    let harness: BehaviorTestHarness;

    beforeEach(() => {
        harness = new BehaviorTestHarness();
    });

    it('should emit metric on pop', () => {
        const behavior = new TransitionTimingBehavior();
        const block = new MockBlock({ id: 'test', label: 'Ready' }, [behavior]);

        harness.push(block);
        harness.mount();

        // Advance time
        harness.advanceClock(5000);

        const actions = harness.unmount();

        expect(actions.some(a => a.type === 'emit-event')).toBe(true);
    });

    it('should track time between push and pop', () => {
        const behavior = new TransitionTimingBehavior();
        const block = new MockBlock('test', [behavior]);

        harness.push(block);
        harness.mount();

        // Advance time by 10 seconds
        harness.advanceClock(10000);

        const actions = harness.unmount();
        const emitAction = actions.find(a => a.type === 'emit-event');

        expect(emitAction).toBeDefined();
    });
});
