import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TimerBehavior, TIMER_MEMORY_TYPES, TimeSpan } from './TimerBehavior';
import { RuntimeMemory } from '../RuntimeMemory';
import { ScriptRuntime } from '../ScriptRuntime';
import { RuntimeBlock } from '../RuntimeBlock';

describe('TimerBehavior', () => {
    let runtime: ScriptRuntime;
    let block: RuntimeBlock;
    let behavior: TimerBehavior;

    beforeEach(() => {
        runtime = new ScriptRuntime();
        behavior = new TimerBehavior();
        block = new RuntimeBlock(runtime, [1], [behavior], 'Timer');
    });

    it('should allocate timer memory references on push', () => {
        block.push();

        // Search for timer memory references
        const timeSpansRefs = runtime.memory.search({
            id: null,
            ownerId: block.key.toString(),
            type: TIMER_MEMORY_TYPES.TIME_SPANS,
            visibility: 'public'
        });

        const isRunningRefs = runtime.memory.search({
            id: null,
            ownerId: block.key.toString(),
            type: TIMER_MEMORY_TYPES.IS_RUNNING,
            visibility: 'public'
        });

        expect(timeSpansRefs.length).toBe(1);
        expect(isRunningRefs.length).toBe(1);
    });

    it('should initialize with one time span and running state', () => {
        block.push();

        const timeSpansRefs = runtime.memory.search({
            id: null,
            ownerId: block.key.toString(),
            type: TIMER_MEMORY_TYPES.TIME_SPANS,
            visibility: null
        });

        const timeSpansRef = timeSpansRefs[0] as any;
        const timeSpans = runtime.memory.get(timeSpansRef) as TimeSpan[];

        expect(timeSpans.length).toBe(1);
        expect(timeSpans[0].start).toBeInstanceOf(Date);
        expect(timeSpans[0].stop).toBeUndefined();

        const isRunning = behavior.isRunning();
        expect(isRunning).toBe(true);
    });

    it('should stop timer on pop', () => {
        block.push();
        
        // Wait a bit to ensure time passes
        const startTime = Date.now();
        
        block.pop();

        const timeSpans = behavior.getTimeSpans();
        expect(timeSpans[0].stop).toBeInstanceOf(Date);
        expect(timeSpans[0].stop!.getTime()).toBeGreaterThanOrEqual(startTime);

        const isRunning = behavior.isRunning();
        expect(isRunning).toBe(false);
    });

    it('should pause timer', () => {
        block.push();

        behavior.pause();

        const timeSpans = behavior.getTimeSpans();
        expect(timeSpans[0].stop).toBeInstanceOf(Date);
        expect(behavior.isRunning()).toBe(false);
    });

    it('should resume timer by creating new span', () => {
        block.push();
        behavior.pause();

        behavior.resume();

        const timeSpans = behavior.getTimeSpans();
        expect(timeSpans.length).toBe(2);
        expect(timeSpans[0].stop).toBeInstanceOf(Date); // First span stopped
        expect(timeSpans[1].start).toBeInstanceOf(Date); // Second span started
        expect(timeSpans[1].stop).toBeUndefined(); // Second span running
        expect(behavior.isRunning()).toBe(true);
    });

    it('should calculate total elapsed time across multiple spans', () => {
        block.push();

        // Simulate time passing
        const span1Start = new Date(Date.now() - 2000);
        const span1Stop = new Date(Date.now() - 1000);
        const span2Start = new Date(Date.now() - 500);

        const timeSpansRefs = runtime.memory.search({
            id: null,
            ownerId: block.key.toString(),
            type: TIMER_MEMORY_TYPES.TIME_SPANS,
            visibility: null
        });

        const timeSpansRef = timeSpansRefs[0] as any;
        runtime.memory.set(timeSpansRef, [
            { start: span1Start, stop: span1Stop },
            { start: span2Start, stop: undefined }
        ]);

        const elapsed = behavior.getTotalElapsed();

        // Should be at least 1000ms (first span) + 500ms (second span to now)
        expect(elapsed).toBeGreaterThanOrEqual(1500);
    });

    it('should support multiple timers without conflicts', () => {
        const behavior1 = new TimerBehavior();
        const behavior2 = new TimerBehavior();
        
        const block1 = new RuntimeBlock(runtime, [1], [behavior1], 'Timer');
        const block2 = new RuntimeBlock(runtime, [2], [behavior2], 'Timer');

        block1.push();
        block2.push();

        const block1TimeSpans = behavior1.getTimeSpans();
        const block2TimeSpans = behavior2.getTimeSpans();

        expect(block1TimeSpans.length).toBe(1);
        expect(block2TimeSpans.length).toBe(1);
        expect(block1TimeSpans[0]).not.toBe(block2TimeSpans[0]);
    });

    it('should notify subscribers when timer state changes', () => {
        block.push();

        const timeSpansRefs = runtime.memory.search({
            id: null,
            ownerId: block.key.toString(),
            type: TIMER_MEMORY_TYPES.TIME_SPANS,
            visibility: null
        });

        const timeSpansRef = timeSpansRefs[0] as any;
        const callback = vi.fn();
        timeSpansRef.subscribe(callback);

        behavior.pause();

        expect(callback).toHaveBeenCalled();
    });

    it('should handle pause when already paused', () => {
        block.push();
        behavior.pause();

        const timeSpansBefore = behavior.getTimeSpans();
        
        behavior.pause(); // Pause again

        const timeSpansAfter = behavior.getTimeSpans();
        
        // Should not create new spans
        expect(timeSpansAfter.length).toBe(timeSpansBefore.length);
    });

    it('should mark memory references as public visibility', () => {
        block.push();

        const publicRefs = runtime.memory.search({
            id: null,
            ownerId: block.key.toString(),
            type: null,
            visibility: 'public'
        });

        expect(publicRefs.length).toBe(2); // timeSpans and isRunning
    });

    it('should return empty array for getTotalElapsed when not initialized', () => {
        const uninitBehavior = new TimerBehavior();
        const elapsed = uninitBehavior.getTotalElapsed();
        expect(elapsed).toBe(0);
    });
});
