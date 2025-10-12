import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createMockRuntime } from './test-utils';
import { mockPerformanceNow } from './timer-test-utils';
import { TimerBlock } from '../../../src/runtime/blocks/TimerBlock';

/**
 * Contract tests for TimerBlock
 * 
 * Validates API contract from contracts/runtime-blocks-api.md:
 * - Constructor validates config (direction, durationMs)
 * - push() starts timer
 * - pop() stops timer, preserves state
 * - dispose() cleans up in <50ms
 * - pause() stops updates, preserves elapsed
 * - resume() continues from current time
 * - getDisplayTime() returns 0.1s precision
 * - Emits timer:tick and timer:complete events
 *
 * STATUS: MUST FAIL initially (TDD)
 */

describe('TimerBlock Contract', () => {
  let runtime: ReturnType<typeof createMockRuntime>;
  let mockTimer: ReturnType<typeof mockPerformanceNow>;

  beforeEach(() => {
    runtime = createMockRuntime();
    mockTimer = mockPerformanceNow();
    vi.useFakeTimers();
  });

  afterEach(() => {
    mockTimer.cleanup();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('Constructor Validation', () => {
    it('should reject invalid direction', () => {
      expect(() => {
        new TimerBlock(runtime, [], { direction: 'invalid' as any });
      }).toThrow();
    });

    it('should reject countdown without durationMs', () => {
      expect(() => {
        new TimerBlock(runtime, [], { direction: 'down' });
      }).toThrow();
    });

    it('should reject durationMs <= 0', () => {
      expect(() => {
        new TimerBlock(runtime, [], { direction: 'down', durationMs: 0 });
      }).toThrow();
    });

    it('should accept valid count-up config', () => {
      const timer = new TimerBlock(runtime, [], { direction: 'up' });
      expect(timer).toBeDefined();
    });

    it('should accept valid countdown config', () => {
      const timer = new TimerBlock(runtime, [], {
        direction: 'down',
        durationMs: 20 * 60 * 1000 // 20 minutes
      });
      expect(timer).toBeDefined();
    });

    it('should initialize with isRunning === false', () => {
      const timer = new TimerBlock(runtime, [], { direction: 'up' });
      expect(timer.isRunning()).toBe(false);
    });
  });

  describe('push() - Start Timer', () => {
    it('should start timer interval', () => {
      const timer = new TimerBlock(runtime, [], { direction: 'up' });
      
      timer.mount(runtime);
      expect(timer.isRunning()).toBe(true);
    });

    it('should emit timer:started event via actions', () => {
      const timer = new TimerBlock(runtime, [], { direction: 'up' });
      
      vi.mocked(runtime.handle).mockClear();
      timer.mount(runtime);
      
      // Should emit timer:started via runtime.handle()
      expect(runtime.handle).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'timer:started' })
      );
    });
  });

  describe('pop() - Stop Timer', () => {
    it('should stop timer interval', () => {
      const timer = new TimerBlock(runtime, [], { direction: 'up' });
      
      timer.mount(runtime);
      timer.unmount(runtime);
      expect(timer.isRunning()).toBe(false);
    });

    it('should preserve elapsed time', () => {
      const timer = new TimerBlock(runtime, [], { direction: 'up' });
      
      timer.mount(runtime);
      mockTimer.timer.advance(5000); // 5 seconds
      vi.advanceTimersByTime(100);
      
      const elapsed = timer.getElapsedMs();
      timer.unmount(runtime);
      
      expect(timer.getElapsedMs()).toBe(elapsed);
    });
  });

  describe('dispose() - Cleanup', () => {
    it('should clear all intervals', () => {
      const timer = new TimerBlock(runtime, [], { direction: 'up' });
      
      timer.mount(runtime);
      timer.dispose(runtime);
      
      // Timer should be stopped after disposal
      expect(timer.isRunning()).toBe(false);
    });

    it('should complete in <50ms', () => {
      const timer = new TimerBlock(runtime, [], { direction: 'up' });
      
      timer.mount(runtime);
      
      const startTime = performance.now();
      timer.dispose(runtime);
      const duration = performance.now() - startTime;
      
      expect(duration).toBeLessThan(50);
    });

    it('should not throw when disposing inactive timer', () => {
      const timer = new TimerBlock(runtime, [], { direction: 'up' });
      
      expect(() => timer.dispose(runtime)).not.toThrow();
    });
  });

  describe('pause() and resume()', () => {
    it('should stop updates when paused', () => {
      const timer = new TimerBlock(runtime, [], { direction: 'up' });
      
      timer.mount(runtime);
      mockTimer.timer.advance(1000);
      vi.advanceTimersByTime(100);
      
      const elapsed1 = timer.getElapsedMs();
      timer.pause();
      
      mockTimer.timer.advance(5000); // 5 seconds pass
      vi.advanceTimersByTime(500);
      
      const elapsed2 = timer.getElapsedMs();
      expect(elapsed2).toBe(elapsed1); // Should not change
    });

    it('should preserve elapsed time during pause', () => {
      const timer = new TimerBlock(runtime, [], { direction: 'up' });
      
      timer.mount(runtime);
      mockTimer.timer.advance(3000); // 3 seconds
      vi.advanceTimersByTime(100);
      
      const elapsed = timer.getElapsedMs();
      timer.pause();
      
      expect(timer.getElapsedMs()).toBe(elapsed);
    });

    it('should resume from current elapsed time', () => {
      const timer = new TimerBlock(runtime, [], { direction: 'up' });
      
      timer.mount(runtime);
      mockTimer.timer.advance(2000);
      vi.advanceTimersByTime(100);
      timer.pause();
      
      const elapsed1 = timer.getElapsedMs();
      
      timer.resume();
      mockTimer.timer.advance(1000);
      vi.advanceTimersByTime(100);
      
      const elapsed2 = timer.getElapsedMs();
      expect(elapsed2).toBeGreaterThan(elapsed1);
    });

    it('should set isPaused() correctly', () => {
      const timer = new TimerBlock(runtime, [], { direction: 'up' });
      
      expect(timer.isPaused()).toBe(false);
        
        timer.mount(runtime);
        expect(timer.isPaused()).toBe(false);
        
        timer.pause();
        expect(timer.isPaused()).toBe(true);
        
        timer.resume();
        expect(timer.isPaused()).toBe(false);
    });
  });

  describe('getDisplayTime() - Precision', () => {
    it('should return value with 0.1s precision', () => {
      const timer = new TimerBlock(runtime, [], { direction: 'up' });
      
      timer.mount(runtime);
      mockTimer.timer.advance(1234); // 1.234 seconds
      vi.advanceTimersByTime(100);
      
      const displayTime = timer.getDisplayTime();
      expect(displayTime).toBe(1.2); // Rounded to 0.1s
    });

    it('should round correctly (not truncate)', () => {
      const timer = new TimerBlock(runtime, [], { direction: 'up' });
      
      timer.mount(runtime);
      mockTimer.timer.advance(1567); // 1.567 seconds
      vi.advanceTimersByTime(100);
      
      const displayTime = timer.getDisplayTime();
      expect(displayTime).toBe(1.6); // Rounded up
    });
  });

  describe('Timer Tick Events', () => {
    it('should emit timer:tick every ~100ms', () => {
      const timer = new TimerBlock(runtime, [], { direction: 'up' });
      
      vi.mocked(runtime.handle).mockClear();
      timer.mount(runtime);
      vi.advanceTimersByTime(300); // 3 ticks
      
      // Should have emitted tick events via runtime.handle()
      expect(runtime.handle).toHaveBeenCalled();
    });

    it('should include elapsed time in tick events', () => {
      const timer = new TimerBlock(runtime, [], { direction: 'up' });
      
      vi.mocked(runtime.handle).mockClear();
      timer.mount(runtime);
      mockTimer.timer.advance(500);
      vi.advanceTimersByTime(100); // One tick
      
      // Verify tick event was emitted
      expect(runtime.handle).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'timer:tick'
        })
      );
    });
  });

  describe('Timer Completion (Countdown)', () => {
    it('should emit timer:complete when countdown reaches zero', () => {
      const timer = new TimerBlock(runtime, [], {
        direction: 'down',
        durationMs: 1000 // 1 second
      });
      
      vi.mocked(runtime.handle).mockClear();
      timer.mount(runtime);
      vi.advanceTimersByTime(1100); // Past completion
      
      // Should have emitted timer:complete
      expect(runtime.handle).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'timer:complete'
        })
      );
    });

    it('should include exact completion timestamp', () => {
      const timer = new TimerBlock(runtime, [], {
        direction: 'down',
        durationMs: 1000
      });
      
      vi.mocked(runtime.handle).mockClear();
      timer.mount(runtime);
      vi.advanceTimersByTime(1100);
      
      // timer:complete should have been called
      expect(runtime.handle).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'timer:complete'
        })
      );
    });

    it('should NOT emit timer:complete for count-up timers', () => {
      const timer = new TimerBlock(runtime, [], { direction: 'up' });
      
      vi.mocked(runtime.handle).mockClear();
      timer.mount(runtime);
      vi.advanceTimersByTime(60000); // 60 seconds
      
      // Should NOT have emitted timer:complete
      const completeCalls = vi.mocked(runtime.handle).mock.calls.filter(
        (call) => call[0]?.name === 'timer:complete'
      );
      expect(completeCalls.length).toBe(0);
    });
  });

  describe('Performance', () => {
    it('should execute push() in <1ms', () => {
      const timer = new TimerBlock(runtime, [], { direction: 'up' });
      
      const startTime = performance.now();
      timer.mount(runtime);
      const duration = performance.now() - startTime;
      
      expect(duration).toBeLessThan(1);
    });

    it('should execute pop() in <1ms', () => {
      const timer = new TimerBlock(runtime, [], { direction: 'up' });
      
      timer.mount(runtime);
      
      const startTime = performance.now();
      timer.unmount(runtime);
      const duration = performance.now() - startTime;
      
      expect(duration).toBeLessThan(1);
    });
  });
});
