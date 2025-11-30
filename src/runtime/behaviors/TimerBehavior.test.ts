import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TimerBehavior, TIMER_MEMORY_TYPES } from './TimerBehavior';
import { ScriptRuntime } from '../ScriptRuntime';
import { RuntimeBlock } from '../RuntimeBlock';
import { WodScript } from '../../parser/WodScript';
import { JitCompiler } from '../JitCompiler';

describe('TimerBehavior', () => {
    let runtime: ScriptRuntime;
    let block: RuntimeBlock;
    let behavior: TimerBehavior;

    beforeEach(() => {
        const script = new WodScript('test', []);
        const compiler = new JitCompiler([]);
        runtime = new ScriptRuntime(script, compiler);
        behavior = new TimerBehavior();
        block = new RuntimeBlock(runtime, [1], [behavior], 'Timer');
    });

    it('should allocate timer memory references on push', () => {
        block.mount(runtime);

        // Search for timer memory references
        const timerRefs = runtime.memory.search({
            id: null,
            ownerId: block.key.toString(),
            type: `${TIMER_MEMORY_TYPES.PREFIX}${block.key.toString()}`,
            visibility: 'public'
        });

        expect(timerRefs.length).toBe(1);
    });

    it('should initialize with one time span and running state', () => {
        block.mount(runtime);

        const timerRefs = runtime.memory.search({
            id: null,
            ownerId: block.key.toString(),
            type: `${TIMER_MEMORY_TYPES.PREFIX}${block.key.toString()}`,
            visibility: null
        });

        const timerRef = timerRefs[0] as any;
        const timerState = runtime.memory.get(timerRef) as any;

        expect(timerState.spans.length).toBe(1);
        expect(timerState.spans[0].start).toBeTypeOf('number'); // Date.now() returns number
        expect(timerState.spans[0].stop).toBeUndefined();

        const isRunning = behavior.isRunning();
        expect(isRunning).toBe(true);
    });

    it('should stop timer on pop', () => {
        block.mount(runtime);
        
        // Wait a bit to ensure time passes
        const startTime = Date.now();
        
        behavior.onDispose(runtime, block);

        const timeSpans = behavior.getTimeSpans();
        expect(timeSpans[0].stop).toBeTypeOf('number');
        expect(timeSpans[0].stop).toBeGreaterThanOrEqual(startTime);

        const isRunning = behavior.isRunning();
        expect(isRunning).toBe(false);
    });

    it('should pause timer', () => {
        block.mount(runtime);

        behavior.pause();

        const timeSpans = behavior.getTimeSpans();
        expect(timeSpans[0].stop).toBeTypeOf('number');
        expect(behavior.isRunning()).toBe(false);
    });

    it('should resume timer by creating new span', () => {
        block.mount(runtime);
        behavior.pause();

        behavior.resume();

        const timeSpans = behavior.getTimeSpans();
        expect(timeSpans.length).toBe(2);
        expect(timeSpans[0].stop).toBeTypeOf('number'); // First span stopped
        expect(timeSpans[1].start).toBeTypeOf('number'); // Second span started
        expect(timeSpans[1].stop).toBeUndefined(); // Second span running
        expect(behavior.isRunning()).toBe(true);
    });

    it('should calculate total elapsed time across multiple spans', () => {
        block.mount(runtime);

        // Simulate time passing
        const span1Start = new Date(Date.now() - 2000);
        const span1Stop = new Date(Date.now() - 1000);
        const span2Start = new Date(Date.now() - 500);

        const timerRefs = runtime.memory.search({
            id: null,
            ownerId: block.key.toString(),
            type: `${TIMER_MEMORY_TYPES.PREFIX}${block.key.toString()}`,
            visibility: null
        });

        const timerRef = timerRefs[0] as any;
        const currentState = runtime.memory.get(timerRef) as any;
        
        runtime.memory.set(timerRef, {
            ...currentState,
            spans: [
                { start: span1Start.getTime(), stop: span1Stop.getTime() },
                { start: span2Start.getTime(), stop: undefined }
            ]
        });

        const elapsed = behavior.getTotalElapsed();

        // Should be at least 1000ms (first span) + 500ms (second span to now)
        expect(elapsed).toBeGreaterThanOrEqual(1500);
    });

    it('should support multiple timers without conflicts', () => {
        const behavior1 = new TimerBehavior();
        const behavior2 = new TimerBehavior();
        
        const block1 = new RuntimeBlock(runtime, [1], [behavior1], 'Timer');
        const block2 = new RuntimeBlock(runtime, [2], [behavior2], 'Timer');

        block1.mount(runtime);
        block2.mount(runtime);

        const block1TimeSpans = behavior1.getTimeSpans();
        const block2TimeSpans = behavior2.getTimeSpans();

        expect(block1TimeSpans.length).toBe(1);
        expect(block2TimeSpans.length).toBe(1);
        expect(block1TimeSpans[0]).not.toBe(block2TimeSpans[0]);
    });

    it('should notify subscribers when timer state changes', () => {
        block.mount(runtime);

        const timerRefs = runtime.memory.search({
            id: null,
            ownerId: block.key.toString(),
            type: `${TIMER_MEMORY_TYPES.PREFIX}${block.key.toString()}`,
            visibility: null
        });

        const timerRef = timerRefs[0] as any;
        const callback = vi.fn();
        timerRef.subscribe(callback);

        behavior.pause();

        expect(callback).toHaveBeenCalled();
    });

    it('should handle pause when already paused', () => {
        block.mount(runtime);
        behavior.pause();

        const timeSpansBefore = behavior.getTimeSpans();
        
        behavior.pause(); // Pause again

        const timeSpansAfter = behavior.getTimeSpans();
        
        // Should not create new spans
        expect(timeSpansAfter.length).toBe(timeSpansBefore.length);
    });

    it('should mark memory references as public visibility', () => {
        block.mount(runtime);

        const publicRefs = runtime.memory.search({
            id: null,
            ownerId: block.key.toString(),
            type: null,
            visibility: 'public'
        });

        expect(publicRefs.length).toBe(1); // TimerState
    });

    it('should return empty array for getTotalElapsed when not initialized', () => {
        const uninitBehavior = new TimerBehavior();
        const elapsed = uninitBehavior.getTotalElapsed();
        expect(elapsed).toBe(0);
    });
});
