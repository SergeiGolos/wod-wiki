import { describe, it, expect, beforeEach } from 'bun:test';
import { BehaviorTestHarness, MockBlock } from '@/testing/harness';
import { WorkoutStateBehavior } from '../WorkoutStateBehavior';
import { DisplayModeBehavior } from '../DisplayModeBehavior';
import { WorkoutControlButtonsBehavior } from '../WorkoutControlButtonsBehavior';

describe('WorkoutStateBehavior', () => {
    let harness: BehaviorTestHarness;

    beforeEach(() => {
        harness = new BehaviorTestHarness();
    });

    it('should emit initial state on push', () => {
        const behavior = new WorkoutStateBehavior('running');
        const block = new MockBlock('test', [behavior]);

        harness.push(block);
        const actions = harness.mount();

        expect(actions.some(a => a.type === 'set-workout-state')).toBe(true);
    });

    it('should return correct state', () => {
        const behavior = new WorkoutStateBehavior('idle');

        expect(behavior.getState()).toBe('idle');
    });

    it('should update state and return action', () => {
        const behavior = new WorkoutStateBehavior('idle');

        const actions = behavior.setState('running');

        expect(behavior.getState()).toBe('running');
        expect(actions.length).toBe(1);
        expect(actions[0].type).toBe('set-workout-state');
    });

    it('should return empty array if state unchanged', () => {
        const behavior = new WorkoutStateBehavior('running');

        const actions = behavior.setState('running');

        expect(actions.length).toBe(0);
    });
});

describe('DisplayModeBehavior', () => {
    let harness: BehaviorTestHarness;

    beforeEach(() => {
        harness = new BehaviorTestHarness();
    });

    it('should emit initial mode on push', () => {
        const behavior = new DisplayModeBehavior('clock');
        const block = new MockBlock('test', [behavior]);

        harness.push(block);
        const actions = harness.mount();

        expect(actions.some(a => a.type === 'update-display-mode')).toBe(true);
    });

    it('should return correct mode', () => {
        const behavior = new DisplayModeBehavior('timer');

        expect(behavior.getMode()).toBe('timer');
    });

    it('should update mode and return action', () => {
        const behavior = new DisplayModeBehavior('clock');

        const actions = behavior.setMode('timer');

        expect(behavior.getMode()).toBe('timer');
        expect(actions.length).toBe(1);
        expect(actions[0].type).toBe('update-display-mode');
    });

    it('should return empty array if mode unchanged', () => {
        const behavior = new DisplayModeBehavior('timer');

        const actions = behavior.setMode('timer');

        expect(actions.length).toBe(0);
    });
});

describe('WorkoutControlButtonsBehavior', () => {
    let harness: BehaviorTestHarness;

    beforeEach(() => {
        harness = new BehaviorTestHarness();
    });

    it('should register execution buttons on push', () => {
        const behavior = new WorkoutControlButtonsBehavior('execution');
        const block = new MockBlock('test', [behavior]);

        harness.push(block);
        const actions = harness.mount();

        // Should have 3 buttons: pause, next, complete
        const buttonActions = actions.filter(a => a.type === 'register-button');
        expect(buttonActions.length).toBe(3);
    });

    it('should register start button for idle-start', () => {
        const behavior = new WorkoutControlButtonsBehavior('idle-start');
        const block = new MockBlock('test', [behavior]);

        harness.push(block);
        const actions = harness.mount();

        const buttonActions = actions.filter(a => a.type === 'register-button');
        expect(buttonActions.length).toBe(1);
    });

    it('should register analytics button for idle-end', () => {
        const behavior = new WorkoutControlButtonsBehavior('idle-end');
        const block = new MockBlock('test', [behavior]);

        harness.push(block);
        const actions = harness.mount();

        const buttonActions = actions.filter(a => a.type === 'register-button');
        expect(buttonActions.length).toBe(1);
    });

    it('should support custom buttons', () => {
        const customButton = {
            id: 'btn-custom',
            label: 'Custom',
            icon: 'star' as any,
            action: 'custom:action',
            variant: 'default' as const,
            size: 'lg' as const
        };
        const behavior = new WorkoutControlButtonsBehavior('custom', [customButton]);
        const block = new MockBlock('test', [behavior]);

        harness.push(block);
        const actions = harness.mount();

        const buttonActions = actions.filter(a => a.type === 'register-button');
        expect(buttonActions.length).toBe(1);
    });

    it('should clear buttons on pop', () => {
        const behavior = new WorkoutControlButtonsBehavior('execution');
        const block = new MockBlock('test', [behavior]);

        harness.push(block);
        harness.mount();

        const actions = harness.unmount();

        expect(actions.some(a => a.type === 'clear-buttons')).toBe(true);
    });
});
