import { describe, it, expect, beforeEach } from 'bun:test';
import { BehaviorTestHarness, MockBlock } from '@/testing/harness';
import { WorkoutFlowStateMachine } from '../WorkoutFlowStateMachine';

describe('WorkoutFlowStateMachine', () => {
    let harness: BehaviorTestHarness;

    beforeEach(() => {
        harness = new BehaviorTestHarness();
    });

    describe('phase management', () => {
        it('should start in pre-start phase by default', () => {
            const stateMachine = new WorkoutFlowStateMachine();
            expect(stateMachine.getPhase()).toBe('pre-start');
        });

        it('should accept initial phase in constructor', () => {
            const stateMachine = new WorkoutFlowStateMachine('executing');
            expect(stateMachine.getPhase()).toBe('executing');
        });

        it('should check phase correctly', () => {
            const stateMachine = new WorkoutFlowStateMachine('executing');
            expect(stateMachine.isPhase('executing')).toBe(true);
            expect(stateMachine.isPhase('pre-start')).toBe(false);
        });
    });

    describe('transitions', () => {
        it('should allow valid transition from pre-start to executing', () => {
            const stateMachine = new WorkoutFlowStateMachine();
            const result = stateMachine.transition('executing');
            expect(result).toBe(true);
            expect(stateMachine.getPhase()).toBe('executing');
        });

        it('should allow valid transition from executing to completing', () => {
            const stateMachine = new WorkoutFlowStateMachine('executing');
            const result = stateMachine.transition('completing');
            expect(result).toBe(true);
            expect(stateMachine.getPhase()).toBe('completing');
        });

        it('should allow valid transition from executing to complete', () => {
            const stateMachine = new WorkoutFlowStateMachine('executing');
            const result = stateMachine.transition('complete');
            expect(result).toBe(true);
            expect(stateMachine.getPhase()).toBe('complete');
        });

        it('should allow valid transition from completing to post-complete', () => {
            const stateMachine = new WorkoutFlowStateMachine('completing');
            const result = stateMachine.transition('post-complete');
            expect(result).toBe(true);
            expect(stateMachine.getPhase()).toBe('post-complete');
        });

        it('should allow valid transition from post-complete to complete', () => {
            const stateMachine = new WorkoutFlowStateMachine('post-complete');
            const result = stateMachine.transition('complete');
            expect(result).toBe(true);
            expect(stateMachine.getPhase()).toBe('complete');
        });

        it('should reject invalid transition from pre-start to complete', () => {
            const stateMachine = new WorkoutFlowStateMachine();
            const result = stateMachine.transition('complete');
            expect(result).toBe(false);
            expect(stateMachine.getPhase()).toBe('pre-start');
        });

        it('should reject transition from complete to any phase', () => {
            const stateMachine = new WorkoutFlowStateMachine('complete');
            expect(stateMachine.transition('pre-start')).toBe(false);
            expect(stateMachine.transition('executing')).toBe(false);
            expect(stateMachine.getPhase()).toBe('complete');
        });
    });

    describe('isComplete', () => {
        it('should return true for complete phase', () => {
            const stateMachine = new WorkoutFlowStateMachine('complete');
            expect(stateMachine.isComplete()).toBe(true);
        });

        it('should return true for post-complete phase', () => {
            const stateMachine = new WorkoutFlowStateMachine('post-complete');
            expect(stateMachine.isComplete()).toBe(true);
        });

        it('should return false for executing phase', () => {
            const stateMachine = new WorkoutFlowStateMachine('executing');
            expect(stateMachine.isComplete()).toBe(false);
        });
    });

    describe('onNext behavior', () => {
        it('should pop block when in post-complete phase', () => {
            const stateMachine = new WorkoutFlowStateMachine('post-complete');
            const block = new MockBlock('test', [stateMachine]);

            harness.push(block);
            harness.mount();

            const actions = harness.next();

            expect(actions.some(a => a.type === 'pop-block')).toBe(true);
            expect(stateMachine.getPhase()).toBe('complete');
        });

        it('should transition from completing to post-complete on next', () => {
            const stateMachine = new WorkoutFlowStateMachine('completing');
            const block = new MockBlock('test', [stateMachine]);

            harness.push(block);
            harness.mount();

            harness.next();

            expect(stateMachine.getPhase()).toBe('post-complete');
        });

        it('should return no actions in pre-start phase', () => {
            const stateMachine = new WorkoutFlowStateMachine('pre-start');
            const block = new MockBlock('test', [stateMachine]);

            harness.push(block);
            harness.mount();

            const actions = harness.next();

            // No pop action expected
            expect(actions.some(a => a.type === 'pop-block')).toBe(false);
        });
    });
});
