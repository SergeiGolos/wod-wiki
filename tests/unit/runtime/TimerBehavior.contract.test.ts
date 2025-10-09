import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TimerBehavior } from '../../../src/runtime/behaviors/TimerBehavior';
import { createMockRuntime } from './test-utils';
import { mockPerformanceNow } from './timer-test-utils';
import { createEventCapture } from './event-test-utils';

/**
 * Contract tests for TimerBehavior
 * 
 * Validates API contract from contracts/runtime-blocks-api.md:
 * - Constructor validates direction ('up' | 'down')
 * - onPush() starts timer interval
 * - onPop() stops timer interval
 * - Emits timer:tick events every ~100ms
 * - Emits timer:complete when countdown reaches zero
 * - Cleanup properly in disposal
 *
 * STATUS: Testing real implementation
 */

describe('TimerBehavior Contract', () => {
  let runtime: ReturnType<typeof createMockRuntime>;
  let mockTimer: ReturnType<typeof mockPerformanceNow>;
  let eventCapture: ReturnType<typeof createEventCapture>;

  beforeEach(() => {
    runtime = createMockRuntime();
    mockTimer = mockPerformanceNow();
    eventCapture = createEventCapture();
    vi.useFakeTimers();
  });

  afterEach(() => {
    mockTimer.cleanup();
    vi.restoreAllMocks();
    vi.useRealTimers();
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
    it('should start timer interval', () => {
      const behavior = new TimerBehavior('up');
      const mockBlock = { key: { toString: () => 'test-block' } } as any;
      
      const actions = behavior.onPush(runtime, mockBlock);
      
      // Verify behavior started (has interval or state)
      expect(behavior.isRunning()).toBe(true);
    });

    it('should emit timer:started event via runtime.handle()', () => {
      const behavior = new TimerBehavior('up');
      const mockBlock = { key: { toString: () => 'test-block' } } as any;
      
      behavior.onPush(runtime, mockBlock);
      
      // Should emit timer:started via runtime.handle()
      const calls = (runtime.handle as any).mock.calls.filter((call: any[]) => 
        call[0]?.name === 'timer:started'
      );
      expect(calls.length).toBeGreaterThanOrEqual(1);
      expect(calls[0][0].data.blockId).toBe('test-block');
    });
  });

  describe('onPop()', () => {
    it('should stop timer interval', () => {
      const behavior = new TimerBehavior('up');
      const mockBlock = { key: { toString: () => 'test-block' } } as any;
      
      behavior.onPush(runtime, mockBlock);
      expect(behavior.isRunning()).toBe(true);
      
      behavior.onPop(runtime, mockBlock);
      expect(behavior.isRunning()).toBe(false);
    });

    it('should preserve elapsed time state', () => {
      const behavior = new TimerBehavior('up');
      const mockBlock = { key: { toString: () => 'test-block' } } as any;
      
      behavior.onPush(runtime, mockBlock);
      mockTimer.timer.advance(5000); // 5 seconds
      const elapsedBefore = behavior.getElapsedMs();
      
      behavior.onPop(runtime, mockBlock);
      
      // Elapsed time should be preserved
      expect(behavior.getElapsedMs()).toBe(elapsedBefore);
    });
  });

  describe('Timer Tick Events', () => {
    it('should emit timer:tick events every ~100ms', () => {
      const behavior = new TimerBehavior('up');
      const mockBlock = { key: { toString: () => 'test-block' } } as any;
      
      behavior.onPush(runtime, mockBlock);
      vi.advanceTimersByTime(300); // 3 ticks
      
      const calls = (runtime.handle as any).mock.calls.filter((call: any[]) => 
        call[0]?.name === 'timer:tick'
      );
      expect(calls.length).toBeGreaterThanOrEqual(3);
    });

    it('should include elapsed time in tick events for count-up', () => {
      const behavior = new TimerBehavior('up');
      const mockBlock = { key: { toString: () => 'test-block' } } as any;
      
      const startTime = performance.now();
      behavior.onPush(runtime, mockBlock);
      mockTimer.timer.advance(500);
      vi.advanceTimersByTime(100);
      
      const calls = (runtime.handle as any).mock.calls.filter((call: any[]) => 
        call[0]?.name === 'timer:tick'
      );
      // Check that elapsed time is reasonable (should be ~500ms + tick interval)
      expect(calls[0][0].data.elapsedMs).toBeGreaterThanOrEqual(100);
      expect(calls[0][0].data.elapsedMs).toBeLessThan(1000);
    });

    it('should include remaining time in tick events for countdown', () => {
      const behavior = new TimerBehavior('down', 10000);
      const mockBlock = { key: { toString: () => 'test-block' } } as any;
      
      behavior.onPush(runtime, mockBlock);
      vi.advanceTimersByTime(100);
      
      const calls = (runtime.handle as any).mock.calls.filter((call: any[]) => 
        call[0]?.name === 'timer:tick'
      );
      // Should have remaining time in event data
      expect(calls[0][0].data.remainingMs).toBeDefined();
      expect(calls[0][0].data.remainingMs).toBeLessThanOrEqual(10000);
      expect(calls[0][0].data.remainingMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Timer Completion', () => {
    it('should emit timer:complete when countdown reaches zero', () => {
      const behavior = new TimerBehavior('down', 500);
      const mockBlock = { key: { toString: () => 'test-block' } } as any;
      
      behavior.onPush(runtime, mockBlock);
      mockTimer.timer.advance(500);
      vi.advanceTimersByTime(600);
      
      const completeCalls = (runtime.handle as any).mock.calls.filter((call: any[]) => 
        call[0]?.name === 'timer:complete'
      );
      expect(completeCalls.length).toBeGreaterThanOrEqual(1);
    });

    it('should NOT emit timer:complete for count-up timers', () => {
      const behavior = new TimerBehavior('up');
      const mockBlock = { key: { toString: () => 'test-block' } } as any;
      
      behavior.onPush(runtime, mockBlock);
      vi.advanceTimersByTime(60000); // 60 seconds
      
      const completeCalls = (runtime.handle as any).mock.calls.filter((call: any[]) => 
        call[0]?.name === 'timer:complete'
      );
      expect(completeCalls.length).toBe(0);
    });

    it('should include exact completion timestamp', () => {
      const behavior = new TimerBehavior('down', 500);
      const mockBlock = { key: { toString: () => 'test-block' } } as any;
      
      behavior.onPush(runtime, mockBlock);
      mockTimer.timer.advance(500);
      vi.advanceTimersByTime(600);
      
      const completeCalls = (runtime.handle as any).mock.calls.filter((call: any[]) => 
        call[0]?.name === 'timer:complete'
      );
      expect(completeCalls[0][0].timestamp).toBeInstanceOf(Date);
    });
  });

  describe('Pause/Resume via Events', () => {
    it('should stop ticking when pause event received', () => {
      const behavior = new TimerBehavior('up');
      const mockBlock = { key: { toString: () => 'test-block' } } as any;
      
      behavior.onPush(runtime, mockBlock);
      const ticksBefore = (runtime.handle as any).mock.calls.filter((call: any[]) => 
        call[0]?.name === 'timer:tick'
      ).length;
      
      behavior.pause();
      vi.advanceTimersByTime(500);
      
      const ticksAfter = (runtime.handle as any).mock.calls.filter((call: any[]) => 
        call[0]?.name === 'timer:tick'
      ).length;
      
      expect(ticksAfter).toBe(ticksBefore); // No new ticks
    });

    it('should resume ticking when resume event received', () => {
      const behavior = new TimerBehavior('up');
      const mockBlock = { key: { toString: () => 'test-block' } } as any;
      
      behavior.onPush(runtime, mockBlock);
      behavior.pause();
      vi.advanceTimersByTime(200);
      
      const ticksBeforeResume = (runtime.handle as any).mock.calls.filter((call: any[]) => 
        call[0]?.name === 'timer:tick'
      ).length;
      
      behavior.resume();
      vi.advanceTimersByTime(200);
      
      const ticksAfterResume = (runtime.handle as any).mock.calls.filter((call: any[]) => 
        call[0]?.name === 'timer:tick'
      ).length;
      
      expect(ticksAfterResume).toBeGreaterThan(ticksBeforeResume);
    });

    it('should preserve elapsed time during pause', () => {
      const behavior = new TimerBehavior('up');
      const mockBlock = { key: { toString: () => 'test-block' } } as any;
      
      behavior.onPush(runtime, mockBlock);
      mockTimer.timer.advance(5000);
      vi.advanceTimersByTime(100);
      
      const elapsedBeforePause = behavior.getElapsedMs();
      behavior.pause();
      
      vi.advanceTimersByTime(10000); // 10 seconds paused
      mockTimer.timer.advance(10000);
      
      const elapsedDuringPause = behavior.getElapsedMs();
      expect(elapsedDuringPause).toBe(elapsedBeforePause);
    });
  });

  describe('Disposal', () => {
    it('should clear interval on dispose', () => {
      const behavior = new TimerBehavior('up');
      const mockBlock = { key: { toString: () => 'test-block' } } as any;
      
      behavior.onPush(runtime, mockBlock);
      expect(behavior.isRunning()).toBe(true);
      
      behavior.dispose();
      expect(behavior.isRunning()).toBe(false);
      
      // Verify no more ticks after disposal
      const ticksBefore = (runtime.handle as any).mock.calls.filter((call: any[]) => 
        call[0]?.name === 'timer:tick'
      ).length;
      vi.advanceTimersByTime(500);
      const ticksAfter = (runtime.handle as any).mock.calls.filter((call: any[]) => 
        call[0]?.name === 'timer:tick'
      ).length;
      
      expect(ticksAfter).toBe(ticksBefore);
    });

    it('should complete disposal in <50ms', () => {
      const behavior = new TimerBehavior('up');
      const mockBlock = { key: { toString: () => 'test-block' } } as any;
      
      behavior.onPush(runtime, mockBlock);
      
      const startTime = performance.now();
      behavior.dispose();
      const duration = performance.now() - startTime;
      
      expect(duration).toBeLessThan(50);
    });

    it('should not throw when disposing inactive timer', () => {
      const behavior = new TimerBehavior('up');
      const mockBlock = { key: { toString: () => 'test-block' } } as any;
      
      expect(() => {
        behavior.dispose();
      }).not.toThrow();
    });
  });

  describe('Performance', () => {
    it('should execute tick handler in <16ms for 60fps', () => {
      const behavior = new TimerBehavior('up');
      const mockBlock = { key: { toString: () => 'test-block' } } as any;
      
      behavior.onPush(runtime, mockBlock);
      
      // Measure tick performance by manually calling tick
      const startTime = performance.now();
      (behavior as any).tick(runtime, mockBlock);
      const duration = performance.now() - startTime;
      
      expect(duration).toBeLessThan(16);
    });
  });
});
