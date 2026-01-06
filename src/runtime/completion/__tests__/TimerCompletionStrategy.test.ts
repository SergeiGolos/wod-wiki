import { describe, it, expect, beforeEach } from 'bun:test';
import { TimerCompletionStrategy } from '../TimerCompletionStrategy';
import { TimerBehavior } from '@/runtime/behaviors/TimerBehavior';
import { MockBlock } from '../../../../tests/harness';

describe('TimerCompletionStrategy', () => {
  let timerBehavior: TimerBehavior;
  let strategy: TimerCompletionStrategy;

  beforeEach(() => {
    timerBehavior = new TimerBehavior('down', 60000);
    strategy = new TimerCompletionStrategy(timerBehavior);
  });

  describe('shouldComplete()', () => {
    it('should return false when timer is not complete', () => {
      const block = new MockBlock('test', [timerBehavior]);
      const now = new Date();
      
      expect(strategy.shouldComplete(block, now)).toBe(false);
    });

    it('should return true when timer is complete', () => {
      const block = new MockBlock('test', [timerBehavior]);
      const startTime = new Date('2024-01-01T12:00:00Z');
      const completionTime = new Date('2024-01-01T12:01:00Z'); // 60 seconds later
      
      // Simulate timer completion
      timerBehavior.isComplete = () => true;
      
      expect(strategy.shouldComplete(block, completionTime)).toBe(true);
    });
  });

  describe('getWatchedEvents()', () => {
    it('should watch timer events', () => {
      const events = strategy.getWatchedEvents();
      
      expect(events).toContain('timer:tick');
      expect(events).toContain('timer:complete');
    });
  });

  describe('getCompletionActions()', () => {
    it('should return empty array by default', () => {
      const block = new MockBlock('test', [timerBehavior]);
      const now = new Date();
      
      const actions = strategy.getCompletionActions(block, now);
      
      expect(actions).toEqual([]);
    });
  });

  describe('getCompletionReason()', () => {
    it('should return descriptive reason', () => {
      const reason = strategy.getCompletionReason();
      
      expect(reason).toBe('Timer expired');
    });
  });
});
