/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useClockRegistry } from './src/hooks/useClockRegistry';
import { SetEffortAction } from './src/core/runtime/outputs/SetEffortAction';
import { SetClockAction } from './src/core/runtime/outputs/SetClockAction';
import { TimeSpanDuration } from './src/core/TimeSpanDuration';

describe('Effort Integration Tests', () => {
  describe('SetEffortAction', () => {
    it('should create SET_EFFORT action with correct event type', () => {
      const action = new SetEffortAction('primary', 'Push-ups');
      
      expect(action.eventType).toBe('SET_EFFORT');
      expect(action.target).toBe('primary');
      expect(action.effort).toBe('Push-ups');
    });

    it('should generate correct output event', () => {
      const action = new SetEffortAction('primary', 'Burpees');
      const mockRuntime = {
        trace: { current: () => null }
      };
      const mockInput = vi.fn();
      
      const events = action.write(mockRuntime, mockInput);
      
      expect(events).toHaveLength(1);
      expect(events[0].eventType).toBe('SET_EFFORT');
      expect(events[0].bag.target).toBe('primary');
      expect(events[0].bag.effort).toBe('Burpees');
      expect(events[0].timestamp).toBeInstanceOf(Date);
    });
  });

  describe('useClockRegistry effort tracking', () => {
    it('should handle SET_EFFORT events and update efforts map', () => {
      const { result } = renderHook(() => useClockRegistry([]));
      
      // Initial state should have empty efforts map
      expect(result.current.efforts.size).toBe(0);
      
      // Add SET_EFFORT event
      const effortEvents = [{
        eventType: 'SET_EFFORT',
        bag: {
          target: 'primary',
          effort: 'Squats'
        },
        timestamp: new Date()
      }];
      
      const { result: updatedResult } = renderHook(() => useClockRegistry(effortEvents));
      
      expect(updatedResult.current.efforts.get('primary')).toBe('Squats');
    });

    it('should handle SET_SPAN events with effort information', () => {
      const mockDuration = new TimeSpanDuration(30000, '+', null);
      
      const clockEvents = [{
        eventType: 'SET_SPAN',
        bag: {
          target: 'primary',
          duration: mockDuration,
          effort: 'Mountain Climbers'
        },
        timestamp: new Date()
      }];
      
      const { result } = renderHook(() => useClockRegistry(clockEvents));
      
      expect(result.current.durations.get('primary')).toBe(mockDuration);
      expect(result.current.efforts.get('primary')).toBe('Mountain Climbers');
    });

    it('should update multiple clocks with different efforts', () => {
      const events = [
        {
          eventType: 'SET_EFFORT',
          bag: { target: 'primary', effort: 'Push-ups' },
          timestamp: new Date()
        },
        {
          eventType: 'SET_EFFORT',
          bag: { target: 'secondary', effort: 'Rest' },
          timestamp: new Date()
        }
      ];
      
      const { result } = renderHook(() => useClockRegistry(events));
      
      expect(result.current.efforts.get('primary')).toBe('Push-ups');
      expect(result.current.efforts.get('secondary')).toBe('Rest');
    });
  });

  describe('Event type validation', () => {
    it('should include all required event types in OutputEventType', async () => {
      // Import the OutputEventType to validate it includes our new types
      const { OutputEventType } = await import('./src/core/OutputEventType');
      
      // Since OutputEventType is a type union, we can't directly test it
      // Instead, we test that our actions use valid event types
      const effortAction = new SetEffortAction('test', 'test-effort');
      const clockAction = new SetClockAction('test');
      
      expect(['SET_EFFORT', 'SET_SPAN']).toContain(effortAction.eventType);
      expect(['SET_EFFORT', 'SET_SPAN']).toContain(clockAction.eventType);
    });
  });

  describe('Integration flow', () => {
    it('should handle complete effort workflow', () => {
      // Simulate the complete flow from EffortBlock to display
      const events = [
        // EffortBlock emits SET_EFFORT
        {
          eventType: 'SET_EFFORT',
          bag: { target: 'primary', effort: 'Jumping Jacks' },
          timestamp: new Date()
        },
        // Runtime also emits SET_SPAN with effort info
        {
          eventType: 'SET_SPAN',
          bag: {
            target: 'primary',
            duration: new TimeSpanDuration(45000, '+', null),
            effort: 'Jumping Jacks'
          },
          timestamp: new Date()
        },
        // Timer state change
        {
          eventType: 'SET_TIMER_STATE',
          bag: { target: 'primary', state: 'RUNNING_COUNTDOWN' },
          timestamp: new Date()
        }
      ];
      
      const { result } = renderHook(() => useClockRegistry(events));
      
      // Verify all information is captured
      expect(result.current.efforts.get('primary')).toBe('Jumping Jacks');
      expect(result.current.durations.get('primary')).toBeDefined();
      expect(result.current.states.get('primary')).toBe('RUNNING_COUNTDOWN');
    });
  });

  describe('Edge cases', () => {
    it('should handle events without effort information gracefully', () => {
      const events = [{
        eventType: 'SET_SPAN',
        bag: {
          target: 'primary',
          duration: new TimeSpanDuration(30000, '+', null)
          // No effort property
        },
        timestamp: new Date()
      }];
      
      const { result } = renderHook(() => useClockRegistry(events));
      
      expect(result.current.durations.get('primary')).toBeDefined();
      expect(result.current.efforts.get('primary')).toBeUndefined();
    });

    it('should handle malformed SET_EFFORT events', () => {
      const events = [
        {
          eventType: 'SET_EFFORT',
          bag: { target: 'primary' }, // Missing effort
          timestamp: new Date()
        },
        {
          eventType: 'SET_EFFORT',
          bag: { effort: 'Push-ups' }, // Missing target
          timestamp: new Date()
        }
      ];
      
      const { result } = renderHook(() => useClockRegistry(events));
      
      // Should not crash and should not add invalid entries
      expect(result.current.efforts.size).toBe(0);
    });

    it('should override previous effort for same target', () => {
      const events = [
        {
          eventType: 'SET_EFFORT',
          bag: { target: 'primary', effort: 'Push-ups' },
          timestamp: new Date()
        },
        {
          eventType: 'SET_EFFORT',
          bag: { target: 'primary', effort: 'Sit-ups' },
          timestamp: new Date()
        }
      ];
      
      const { result } = renderHook(() => useClockRegistry(events));
      
      expect(result.current.efforts.get('primary')).toBe('Sit-ups');
    });
  });
});
