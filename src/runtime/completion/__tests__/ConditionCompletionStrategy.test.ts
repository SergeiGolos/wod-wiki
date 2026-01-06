import { describe, it, expect } from 'bun:test';
import { ConditionCompletionStrategy } from '../ConditionCompletionStrategy';
import { MockBlock } from '../../../../tests/harness';

describe('ConditionCompletionStrategy', () => {
  describe('shouldComplete()', () => {
    it('should evaluate condition function', () => {
      const condition = (block: any, now: Date) => block.state.count >= 5;
      const strategy = new ConditionCompletionStrategy(condition, []);
      
      const block = new MockBlock('test', []);
      block.state.count = 3;
      
      expect(strategy.shouldComplete(block, new Date())).toBe(false);
      
      block.state.count = 5;
      expect(strategy.shouldComplete(block, new Date())).toBe(true);
    });

    it('should handle complex conditions', () => {
      const condition = (block: any, now: Date) => {
        return block.state.isComplete && block.state.round > 0;
      };
      const strategy = new ConditionCompletionStrategy(condition, []);
      
      const block = new MockBlock('test', []);
      block.state.isComplete = true;
      block.state.round = 0;
      
      expect(strategy.shouldComplete(block, new Date())).toBe(false);
      
      block.state.round = 1;
      expect(strategy.shouldComplete(block, new Date())).toBe(true);
    });
  });

  describe('getWatchedEvents()', () => {
    it('should return configured events', () => {
      const events = ['custom:event', 'block:update'];
      const strategy = new ConditionCompletionStrategy(() => false, events);
      
      expect(strategy.getWatchedEvents()).toEqual(events);
    });

    it('should handle empty event list', () => {
      const strategy = new ConditionCompletionStrategy(() => false, []);
      
      expect(strategy.getWatchedEvents()).toEqual([]);
    });
  });

  describe('getCompletionActions()', () => {
    it('should return empty array by default', () => {
      const strategy = new ConditionCompletionStrategy(() => true, []);
      const block = new MockBlock('test', []);
      
      const actions = strategy.getCompletionActions(block, new Date());
      
      expect(actions).toEqual([]);
    });
  });

  describe('getCompletionReason()', () => {
    it('should return descriptive reason', () => {
      const strategy = new ConditionCompletionStrategy(() => true, []);
      
      const reason = strategy.getCompletionReason();
      
      expect(reason).toBe('Condition met');
    });
  });
});
