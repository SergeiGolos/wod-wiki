import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ScriptRuntime } from '../../../src/runtime/ScriptRuntime';
import { RuntimeBlock } from '../RuntimeBlock';
import { TimerBehavior } from '../behaviors/TimerBehavior';

/**
 * Integration tests for runtime hooks.
 * 
 * Note: These tests verify the hook logic without React rendering.
 * Full React component tests should be done in Storybook or with React Testing Library.
 */
describe('Runtime Hooks Integration', () => {
    let runtime: ScriptRuntime;

    beforeEach(() => {
        runtime = new ScriptRuntime();
    });

    describe('Timer References', () => {
        it('should be able to search for timer memory references', () => {
            const behavior = new TimerBehavior();
            const block = new RuntimeBlock(runtime, [1], [behavior], 'Timer');
            block.mount(runtime);

            // Simulate what useTimerReferences does
            const timeSpansRefs = runtime.memory.search({
                id: null,
                ownerId: block.key.toString(),
                type: 'timer-time-spans',
                visibility: null
            });

            const isRunningRefs = runtime.memory.search({
                id: null,
                ownerId: block.key.toString(),
                type: 'timer-is-running',
                visibility: null
            });

            expect(timeSpansRefs.length).toBe(1);
            expect(isRunningRefs.length).toBe(1);
        });

        it('should return undefined for non-existent block keys', () => {
            // Simulate searching for a block that doesn't exist
            const timeSpansRefs = runtime.memory.search({
                id: null,
                ownerId: 'non-existent-block',
                type: 'timer-time-spans',
                visibility: null
            });

            expect(timeSpansRefs.length).toBe(0);
        });
    });

    describe('Memory Subscription', () => {
        it('should notify when subscribed to timer state changes', () => {
            const behavior = new TimerBehavior();
            const block = new RuntimeBlock(runtime, [1], [behavior], 'Timer');
            block.mount(runtime);

            const timeSpansRefs = runtime.memory.search({
                id: null,
                ownerId: block.key.toString(),
                type: 'timer-time-spans',
                visibility: null
            });

            const ref = timeSpansRefs[0] as any;
            let notificationCount = 0;

            // Simulate subscription
            const unsubscribe = ref.subscribe(() => {
                notificationCount++;
            });

            behavior.pause();
            expect(notificationCount).toBe(1);

            behavior.resume();
            expect(notificationCount).toBe(2);

            unsubscribe();
        });
    });

    describe('Timer Elapsed Calculation', () => {
        it('should calculate elapsed time correctly', () => {
            const behavior = new TimerBehavior();
            const block = new RuntimeBlock(runtime, [1], [behavior], 'Timer');
            block.mount(runtime);

            // Simulate time passing
            const startTime = Date.now() - 1000;
            
            const timeSpansRefs = runtime.memory.search({
                id: null,
                ownerId: block.key.toString(),
                type: 'timer-time-spans',
                visibility: null
            });

            const ref = timeSpansRefs[0] as any;
            const spans = ref.get();
            spans[0].start = new Date(startTime);
            ref.set([...spans]);

            // Calculate elapsed (simulating what useTimerElapsed does)
            const currentSpans = ref.get();
            const elapsed = currentSpans.reduce((total: number, span: any) => {
                if (!span.start) return total;
                const stop = span.stop?.getTime() || Date.now();
                const start = span.start.getTime();
                return total + (stop - start);
            }, 0);

            expect(elapsed).toBeGreaterThanOrEqual(1000);
        });

        it('should handle multiple spans correctly', () => {
            const behavior = new TimerBehavior();
            const block = new RuntimeBlock(runtime, [1], [behavior], 'Timer');
            block.mount(runtime);

            // Simulate pause/resume cycle
            behavior.pause();
            behavior.resume();

            const timeSpansRefs = runtime.memory.search({
                id: null,
                ownerId: block.key.toString(),
                type: 'timer-time-spans',
                visibility: null
            });

            const ref = timeSpansRefs[0] as any;
            const spans = ref.get();

            expect(spans.length).toBe(2);
            expect(spans[0].stop).toBeDefined();
            expect(spans[1].start).toBeDefined();
            expect(spans[1].stop).toBeUndefined();
        });
    });

    describe('RuntimeProvider Context', () => {
        it('should provide runtime memory access', () => {
            const behavior = new TimerBehavior();
            const block = new RuntimeBlock(runtime, [1], [behavior], 'Timer');
            block.mount(runtime);

            // Verify that runtime memory can be accessed
            const refs = runtime.memory.search({
                id: null,
                ownerId: block.key.toString(),
                type: null,
                visibility: 'public'
            });

            expect(refs.length).toBeGreaterThan(0);
        });
    });

    describe('Edge Cases', () => {
        it('should handle rapid state changes', () => {
            const behavior = new TimerBehavior();
            const block = new RuntimeBlock(runtime, [1], [behavior], 'Timer');
            block.mount(runtime);

            // Rapid pause/resume
            for (let i = 0; i < 5; i++) {
                behavior.pause();
                behavior.resume();
            }

            const timeSpansRefs = runtime.memory.search({
                id: null,
                ownerId: block.key.toString(),
                type: 'timer-time-spans',
                visibility: null
            });

            const ref = timeSpansRefs[0] as any;
            const spans = ref.get();

            // Should have multiple spans from pause/resume cycles
            expect(spans.length).toBeGreaterThan(1);
        });

        it('should handle block disposal gracefully', () => {
            const behavior = new TimerBehavior();
            const block = new RuntimeBlock(runtime, [1], [behavior], 'Timer');
            block.mount(runtime);

            const timeSpansRefs = runtime.memory.search({
                id: null,
                ownerId: block.key.toString(),
                type: 'timer-time-spans',
                visibility: null
            });

            const ref = timeSpansRefs[0] as any;
            let notificationCount = 0;

            ref.subscribe(() => {
                notificationCount++;
            });

            // Dispose the block
            block.dispose(runtime);

            // Should notify subscribers on release
            expect(notificationCount).toBe(1);

            // References should be released
            const afterRefs = runtime.memory.search({
                id: null,
                ownerId: block.key.toString(),
                type: 'timer-time-spans',
                visibility: null
            });

            expect(afterRefs.length).toBe(0);
        });
    });
});
