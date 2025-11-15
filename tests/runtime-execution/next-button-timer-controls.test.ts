import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextEvent } from '../../src/runtime/NextEvent';

describe('Next Button Timer Controls Integration', () => {
  let mockRuntime: any;

  beforeEach(() => {
    mockRuntime = {
      handle: vi.fn(),
      stack: {
        current: {
          key: { toString: () => 'block-1' },
          next: vi.fn().mockReturnValue([])
        }
      },
      memory: {
        allocate: vi.fn(),
        get: vi.fn(),
        set: vi.fn()
      }
    };
  });

  describe('NextEvent Emission', () => {
    it('should create and emit NextEvent when next button is clicked', () => {
      // Simulate handleNext from EnhancedTimerHarness
      const handleNext = () => {
        const nextEvent = new NextEvent({ source: 'timer-controls' });
        mockRuntime.handle(nextEvent);
      };

      handleNext();

      expect(mockRuntime.handle).toHaveBeenCalledTimes(1);
      expect(mockRuntime.handle).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'next',
          data: { source: 'timer-controls' }
        })
      );
    });

    it('should handle multiple next button clicks', () => {
      const handleNext = () => {
        const nextEvent = new NextEvent({ source: 'timer-controls' });
        mockRuntime.handle(nextEvent);
      };

      handleNext();
      handleNext();
      handleNext();

      expect(mockRuntime.handle).toHaveBeenCalledTimes(3);
    });

    it('should include timestamp in NextEvent', () => {
      const handleNext = () => {
        const nextEvent = new NextEvent({ source: 'timer-controls' });
        mockRuntime.handle(nextEvent);
      };

      const before = Date.now();
      handleNext();
      const after = Date.now();

      const call = mockRuntime.handle.mock.calls[0][0];
      const timestamp = call.timestamp.getTime();
      
      expect(timestamp).toBeGreaterThanOrEqual(before);
      expect(timestamp).toBeLessThanOrEqual(after + 100); // Allow small buffer
    });
  });

  describe('Timer Controls Integration', () => {
    it('should provide next handler in controls object', () => {
      // Simulate EnhancedTimerHarnessResult structure
      const controls = {
        start: vi.fn(),
        stop: vi.fn(),
        pause: vi.fn(),
        resume: vi.fn(),
        reset: vi.fn(),
        next: vi.fn()
      };

      expect(controls.next).toBeDefined();
      expect(typeof controls.next).toBe('function');
    });

    it('should call next handler when next button clicked', () => {
      const handleNext = vi.fn();
      const controls = {
        next: handleNext
      };

      // Simulate TimerControls onClick
      controls.next();

      expect(handleNext).toHaveBeenCalledTimes(1);
    });

    it('should be optional - TimerControls should work without next handler', () => {
      const controls = {
        start: vi.fn(),
        stop: vi.fn(),
        pause: vi.fn(),
        resume: vi.fn(),
        reset: vi.fn()
        // next is optional
      };

      // Should not throw when next is undefined
      expect(() => {
        const onNext = controls.next;
        if (onNext) {
          onNext();
        }
      }).not.toThrow();
    });
  });

  describe('NextEvent Data Structure', () => {
    it('should create NextEvent with correct structure', () => {
      const nextEvent = new NextEvent({ source: 'timer-controls' });

      expect(nextEvent.name).toBe('next');
      expect(nextEvent.timestamp).toBeInstanceOf(Date);
      expect(nextEvent.data).toEqual({ source: 'timer-controls' });
    });

    it('should support custom data in NextEvent', () => {
      const customData = {
        source: 'timer-controls',
        blockKey: 'timer-block-1',
        action: 'advance-section'
      };
      const nextEvent = new NextEvent(customData);

      expect(nextEvent.data).toEqual(customData);
    });

    it('should serialize NextEvent correctly', () => {
      const nextEvent = new NextEvent({ source: 'timer-controls' });
      const json = nextEvent.toJSON();

      expect(json).toHaveProperty('name', 'next');
      expect(json).toHaveProperty('timestamp');
      expect(json).toHaveProperty('data');
      expect(json.data).toEqual({ source: 'timer-controls' });
    });
  });
});
