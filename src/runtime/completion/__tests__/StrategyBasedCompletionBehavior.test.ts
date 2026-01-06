import { describe, it, expect, beforeEach } from 'bun:test';
import { StrategyBasedCompletionBehavior } from '../StrategyBasedCompletionBehavior';
import { ConditionCompletionStrategy } from '../ConditionCompletionStrategy';
import { ICompletionStrategy } from '@/runtime/contracts/ICompletionStrategy';
import { MockBlock } from '../../../../tests/harness';
import { IRuntimeBlock, IRuntimeAction } from '@/runtime/contracts';

class MockCompletionStrategy implements ICompletionStrategy {
  shouldCompleteCalled = false;
  shouldCompleteResult = false;

  shouldComplete(block: IRuntimeBlock, now: Date): boolean {
    this.shouldCompleteCalled = true;
    return this.shouldCompleteResult;
  }

  getCompletionActions(block: IRuntimeBlock, now: Date): IRuntimeAction[] {
    return [];
  }

  getWatchedEvents(): string[] {
    return ['test:event'];
  }

  getCompletionReason(): string {
    return 'Mock completion';
  }
}

describe('StrategyBasedCompletionBehavior', () => {
  let mockStrategy: MockCompletionStrategy;
  let behavior: StrategyBasedCompletionBehavior;
  let block: MockBlock;

  beforeEach(() => {
    mockStrategy = new MockCompletionStrategy();
    behavior = new StrategyBasedCompletionBehavior(mockStrategy);
    block = new MockBlock('test', [behavior]);
  });

  describe('onNext()', () => {
    it('should delegate to strategy.shouldComplete', () => {
      behavior.onNext(block);

      expect(mockStrategy.shouldCompleteCalled).toBe(true);
    });

    it('should return PopBlockAction when strategy says complete', () => {
      mockStrategy.shouldCompleteResult = true;

      const actions = behavior.onNext(block);

      expect(actions.length).toBeGreaterThan(0);
      expect(actions[0].constructor.name).toContain('Pop');
    });

    it('should return empty when strategy says not complete', () => {
      mockStrategy.shouldCompleteResult = false;

      const actions = behavior.onNext(block);

      expect(actions.length).toBe(0);
    });
  });

  describe('onEvent()', () => {
    it('should check completion on relevant events', () => {
      mockStrategy.shouldCompleteResult = true;

      const actions = behavior.onEvent(block, 'test:event');

      expect(mockStrategy.shouldCompleteCalled).toBe(true);
      expect(actions.length).toBeGreaterThan(0);
    });

    it('should ignore non-watched events', () => {
      mockStrategy.shouldCompleteResult = true;

      const actions = behavior.onEvent(block, 'other:event');

      expect(actions.length).toBe(0);
    });
  });

  describe('integration with ConditionCompletionStrategy', () => {
    it('should work with condition-based strategy', () => {
      const condition = (block: any) => block.state.count >= 5;
      const strategy = new ConditionCompletionStrategy(condition, ['update']);
      const behavior = new StrategyBasedCompletionBehavior(strategy);

      const block = new MockBlock('test', [behavior]);
      block.state.count = 3;

      let actions = behavior.onNext(block);
      expect(actions.length).toBe(0);

      block.state.count = 5;
      actions = behavior.onNext(block);
      expect(actions.length).toBeGreaterThan(0);
    });
  });

  describe('completion actions', () => {
    it('should include strategy completion actions before pop', () => {
      class StrategyWithActions implements ICompletionStrategy {
        shouldComplete(): boolean {
          return true;
        }

        getCompletionActions(block: IRuntimeBlock, now: Date): IRuntimeAction[] {
          return [{ type: 'custom-action' } as any];
        }

        getWatchedEvents(): string[] {
          return [];
        }

        getCompletionReason(): string {
          return 'test';
        }
      }

      const strategy = new StrategyWithActions();
      const behavior = new StrategyBasedCompletionBehavior(strategy);
      const block = new MockBlock('test', [behavior]);

      const actions = behavior.onNext(block);

      expect(actions.length).toBeGreaterThan(1); // custom + pop
    });
  });
});
