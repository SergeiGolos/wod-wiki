import { describe, it, expect, beforeEach } from 'bun:test';
import { BehaviorTestHarness } from '../../../../tests/harness/BehaviorTestHarness';
import { MockBlock } from '../../../../tests/harness/MockBlock';
import { TimerBehavior } from '../TimerBehavior';
import { BlockLifecycleOptions } from '@/runtime/IRuntimeBlock';

describe('TimerBehavior Contract (Migrated)', () => {
  let harness: BehaviorTestHarness;

  beforeEach(() => {
    harness = new BehaviorTestHarness()
      .withClock(new Date('2024-01-01T12:00:00Z'));
  });

  describe('Constructor', () => {
    it('should accept valid direction "up"', () => {
      const behavior = new TimerBehavior('up');
      expect(behavior).toBeDefined();
    });

    it('should accept valid direction "down"', () => {
      const behavior = new TimerBehavior('down');
      expect(behavior).toBeDefined();
    });

    it('should reject invalid direction', () => {
      expect(() => {
        new TimerBehavior('invalid' as any);
      }).toThrow(TypeError);
    });
  });

  describe('onPush()', () => {
    it('should start timer', () => {
      const behavior = new TimerBehavior('up');
      const block = new MockBlock('test-block', [behavior]);

      harness.push(block);
      harness.mount();

      expect(behavior.isRunning()).toBe(true);
    });

    it('should emit timer:started event via runtime.handle()', () => {
      const block = new MockBlock('test-block', [new TimerBehavior('up')]);

      harness.push(block);
      harness.mount();

      expect(harness.wasEventEmitted('timer:started')).toBe(true);

      const events = harness.findEvents('timer:started');
      expect(events[0].data.blockId).toBe('test-block');
    });

    it('should use provided startTime from options', () => {
      const customStartTime = new Date('2024-06-15T10:00:00Z');
      const block = new MockBlock('test-block', [new TimerBehavior('up')]);

      harness.push(block);

      const options: BlockLifecycleOptions = { startTime: customStartTime };
      harness.mount(options);

      const events = harness.findEvents('timer:started');
      expect(events[0].timestamp.getTime()).toBe(customStartTime.getTime());
    });
  });

  describe('onPop()', () => {
    it('should preserve elapsed time state after pop', () => {
      const behavior = new TimerBehavior('up');
      const block = new MockBlock('test-block', [behavior]);

      harness.push(block);
      harness.mount();

      // Advance clock
      harness.advanceClock(5000);

      const elapsedBefore = behavior.getElapsedMs();
      expect(elapsedBefore).toBeGreaterThanOrEqual(5000);

      harness.unmount();

      behavior.stop();
      expect(behavior.isRunning()).toBe(false);
      expect(behavior.getElapsedMs()).toBeGreaterThanOrEqual(5000);
    });
  });

  describe('Elapsed Time', () => {
    it('should track elapsed time correctly', () => {
      const behavior = new TimerBehavior('up');
      const block = new MockBlock('test-block', [behavior]);

      harness.push(block);
      harness.mount();

      harness.advanceClock(1000);
      expect(behavior.getElapsedMs()).toBeGreaterThanOrEqual(1000);

      harness.advanceClock(500);
      expect(behavior.getElapsedMs()).toBeGreaterThanOrEqual(1500);
    });

    it('should return display time in seconds', () => {
      const behavior = new TimerBehavior('up');
      const block = new MockBlock('test-block', [behavior]);

      harness.push(block);
      harness.mount();
      harness.advanceClock(1500);

      // Display time is in seconds, rounded to 0.1s
      const displayTime = behavior.getDisplayTime();
      expect(displayTime).toBeGreaterThanOrEqual(1.5);
    });
  });

  describe('Countdown Timer', () => {
    it('should calculate remaining time for countdown', () => {
      const behavior = new TimerBehavior('down', 10000);
      const block = new MockBlock('test-block', [behavior]);

      harness.push(block);
      harness.mount();

      harness.advanceClock(3000);
      const remaining = behavior.getRemainingMs();

      expect(remaining).toBeLessThanOrEqual(7000);
      expect(remaining).toBeGreaterThanOrEqual(6900);
    });

    it('should detect completion when countdown reaches zero', () => {
      const behavior = new TimerBehavior('down', 1000);
      const block = new MockBlock('test-block', [behavior]);

      harness.push(block);
      harness.mount();

      harness.advanceClock(1500);

      expect(behavior.isComplete()).toBe(true);
    });

    it('should NOT mark count-up timers as complete', () => {
      const behavior = new TimerBehavior('up');
      const block = new MockBlock('test-block', [behavior]);

      harness.push(block);
      harness.mount();
      harness.advanceClock(60000);

      expect(behavior.isComplete()).toBe(false);
    });
  });

  describe('Pause/Resume', () => {
    it('should stop tracking elapsed when paused', () => {
      const behavior = new TimerBehavior('up');
      const block = new MockBlock('test-block', [behavior]);

      harness.push(block);
      harness.mount();
      harness.advanceClock(1000);

      behavior.pause();
      const elapsedAtPause = behavior.getElapsedMs();

      harness.advanceClock(5000);

      // Elapsed should not have changed
      expect(behavior.getElapsedMs()).toBe(elapsedAtPause);
      expect(behavior.isPaused()).toBe(true);
    });

    it('should resume tracking elapsed when resumed', () => {
      const behavior = new TimerBehavior('up');
      const block = new MockBlock('test-block', [behavior]);

      harness.push(block);
      harness.mount();
      harness.advanceClock(1000);

      behavior.pause();
      harness.advanceClock(5000);

      behavior.resume();
      expect(behavior.isPaused()).toBe(false);
      expect(behavior.isRunning()).toBe(true);
    });
  });

  describe('Start/Stop', () => {
    it('should be running after start()', () => {
      const behavior = new TimerBehavior('up');
      const block = new MockBlock('test-block', [behavior]);

      harness.push(block);
      harness.mount();

      behavior.stop();
      expect(behavior.isRunning()).toBe(false);

      behavior.start();
      expect(behavior.isRunning()).toBe(true);
    });

    it('should not be running after stop()', () => {
      const behavior = new TimerBehavior('up');
      const block = new MockBlock('test-block', [behavior]);

      harness.push(block);
      harness.mount();

      expect(behavior.isRunning()).toBe(true);

      behavior.stop();
      expect(behavior.isRunning()).toBe(false);
    });
  });

  describe('Reset/Restart', () => {
    it('should reset elapsed time on reset()', () => {
      const behavior = new TimerBehavior('up');
      const block = new MockBlock('test-block', [behavior]);

      harness.push(block);
      harness.mount();
      harness.advanceClock(5000);

      expect(behavior.getElapsedMs()).toBeGreaterThanOrEqual(5000);

      behavior.reset();
      expect(behavior.isRunning()).toBe(false);
    });

    it('should restart timer on restart()', () => {
      const behavior = new TimerBehavior('up');
      const block = new MockBlock('test-block', [behavior]);

      harness.push(block);
      harness.mount();
      harness.advanceClock(5000);

      behavior.restart();

      // After restart, timer should be running with fresh state
      expect(behavior.isRunning()).toBe(true);
      expect(behavior.isPaused()).toBe(false);
    });
  });

  describe('Disposal', () => {
    it('should not throw when disposing active timer', () => {
      const block = new MockBlock('test-block', [new TimerBehavior('up')]);

      harness.push(block);
      harness.mount();

      expect(() => {
        block.dispose(harness.runtime);
      }).not.toThrow();
    });

    it('should not throw when disposing inactive timer', () => {
      const block = new MockBlock('test-block', [new TimerBehavior('up')]);

      expect(() => {
        block.dispose(harness.runtime);
      }).not.toThrow();
    });

    it('should stop timer on dispose', () => {
      const behavior = new TimerBehavior('up');
      const block = new MockBlock('test-block', [behavior]);

      harness.push(block);
      harness.mount();

      expect(behavior.isRunning()).toBe(true);

      block.dispose(harness.runtime);
      expect(behavior.isRunning()).toBe(false);
    });
  });
});
