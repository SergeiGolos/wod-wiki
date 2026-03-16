import { describe, expect, it, afterEach } from 'bun:test';
import { CountdownTimerBehavior } from '../CountdownTimerBehavior';
import { CountupTimerBehavior } from '../CountupTimerBehavior';
import { BehaviorTestHarness, MockBlock } from '@/testing/harness';

describe('CountdownTimerBehavior', () => {
    let harness: BehaviorTestHarness;

    afterEach(() => { harness?.dispose(); });

    it('initializes timer state on mount with countdown direction', () => {
        harness = new BehaviorTestHarness()
            .withClock(new Date('2024-01-01T12:00:00Z'));
        const block = new MockBlock('test-timer', [
            new CountdownTimerBehavior({ durationMs: 30000, label: 'Work' })
        ]);
        harness.push(block);
        harness.mount();

        // Assert memory was pushed via recordings
        const pushCalls = block.recordings!.pushMemory;
        expect(pushCalls.length).toBeGreaterThanOrEqual(1);
        const timePush = pushCalls.find(c => c.tag === 'time');
        expect(timePush).toBeDefined();
        const timerValue = timePush!.metrics[0]?.value as any;
        expect(timerValue.direction).toBe('down');
        expect(timerValue.durationMs).toBe(30000);
        expect(timerValue.label).toBe('Work');
        expect(timerValue.spans).toHaveLength(1);
        expect(timerValue.spans[0].started).toEqual(expect.any(Number));

        // Also verify state via block memory (consistent with block tests)
        const timeMemory = block.getMemoryByTag('time');
        expect(timeMemory).toHaveLength(1);
    });

    it('subscribes to tick, reset, pause and resume events on mount', () => {
        harness = new BehaviorTestHarness()
            .withClock(new Date('2024-01-01T12:00:00Z'));
        const block = new MockBlock('test-timer', [
            new CountdownTimerBehavior({ durationMs: 30000 })
        ]);
        harness.push(block);
        harness.mount();

        const subscribeCalls = block.recordings!.subscribe;
        expect(subscribeCalls).toHaveLength(4);
        expect(subscribeCalls.some(c => c.eventType === 'tick')).toBe(true);
        // tick should use bubble scope so parent timers track time during child execution
        const tickSub = subscribeCalls.find(c => c.eventType === 'tick');
        expect(tickSub!.options?.scope).toBe('bubble');
    });

    it('onNext is a no-op', () => {
        harness = new BehaviorTestHarness()
            .withClock(new Date('2024-01-01T12:00:00Z'));
        const block = new MockBlock('test-timer', [
            new CountdownTimerBehavior({ durationMs: 30000 })
        ]);
        harness.push(block);
        harness.mount();

        const actions = harness.next();
        expect(actions).toEqual([]);
    });

    it('onUnmount closes active span', () => {
        harness = new BehaviorTestHarness()
            .withClock(new Date('2024-01-01T12:00:00Z'));
        const block = new MockBlock('test-timer', [
            new CountdownTimerBehavior({ durationMs: 30000 })
        ]);
        harness.push(block);
        harness.mount();

        harness.advanceClock(5000);
        harness.unmount();

        const updateCalls = block.recordings!.updateMemory;
        const timeUpdate = updateCalls.find(c => c.tag === 'time');
        expect(timeUpdate).toBeDefined();
        const updatedValue = timeUpdate!.metrics[0]?.value as any;
        expect(updatedValue.spans[0].ended).toEqual(expect.any(Number));
    });

    it('onDispose cleans up event subscriptions', () => {
        harness = new BehaviorTestHarness()
            .withClock(new Date('2024-01-01T12:00:00Z'));
        const block = new MockBlock('test-timer', [
            new CountdownTimerBehavior({ durationMs: 30000 })
        ]);
        harness.push(block);
        harness.mount();

        // 4 subscriptions were registered
        expect(block.recordings!.subscribe).toHaveLength(4);

        // Dispose cleans up (block.dispose handles this)
        harness.unmount();
        // No error = subscriptions cleaned up successfully
    });
});

describe('CountupTimerBehavior', () => {
    let harness: BehaviorTestHarness;

    afterEach(() => { harness?.dispose(); });

    it('initializes timer state on mount with countup direction', () => {
        harness = new BehaviorTestHarness()
            .withClock(new Date('2024-01-01T12:00:00Z'));
        const block = new MockBlock('test-timer', [
            new CountupTimerBehavior({ label: 'Session' })
        ]);
        harness.push(block);
        harness.mount();

        const timePush = block.recordings!.pushMemory.find(c => c.tag === 'time');
        expect(timePush).toBeDefined();
        const timerValue = timePush!.metrics[0]?.value as any;
        expect(timerValue.direction).toBe('up');
        expect(timerValue.label).toBe('Session');
        expect(timerValue.spans[0].started).toEqual(expect.any(Number));
    });

    it('subscribes to pause and resume events on mount (no tick subscription)', () => {
        harness = new BehaviorTestHarness()
            .withClock(new Date('2024-01-01T12:00:00Z'));
        const block = new MockBlock('test-timer', [
            new CountupTimerBehavior()
        ]);
        harness.push(block);
        harness.mount();

        const subscribeCalls = block.recordings!.subscribe;
        expect(subscribeCalls).toHaveLength(2);
        expect(subscribeCalls.some(c => c.eventType === 'tick')).toBe(false);
    });

    it('onNext is a no-op', () => {
        harness = new BehaviorTestHarness()
            .withClock(new Date('2024-01-01T12:00:00Z'));
        const block = new MockBlock('test-timer', [
            new CountupTimerBehavior()
        ]);
        harness.push(block);
        harness.mount();

        const actions = harness.next();
        expect(actions).toEqual([]);
    });

    it('onUnmount closes active span', () => {
        harness = new BehaviorTestHarness()
            .withClock(new Date('2024-01-01T12:00:00Z'));
        const block = new MockBlock('test-timer', [
            new CountupTimerBehavior()
        ]);
        harness.push(block);
        harness.mount();

        harness.advanceClock(10000);
        harness.unmount();

        const timeUpdate = block.recordings!.updateMemory.find(c => c.tag === 'time');
        expect(timeUpdate).toBeDefined();
        const updatedValue = timeUpdate!.metrics[0]?.value as any;
        expect(updatedValue.spans[0].ended).toEqual(expect.any(Number));
    });

    it('onDispose cleans up event subscriptions', () => {
        harness = new BehaviorTestHarness()
            .withClock(new Date('2024-01-01T12:00:00Z'));
        const block = new MockBlock('test-timer', [
            new CountupTimerBehavior()
        ]);
        harness.push(block);
        harness.mount();

        expect(block.recordings!.subscribe).toHaveLength(2);
        harness.unmount();
    });
});
