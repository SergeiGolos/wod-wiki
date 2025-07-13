import { describe, it, expect, beforeEach } from 'vitest';
import { RuntimeJitStrategies, IRuntimeBlockStrategy, JitStatement } from './RuntimeJitStrategies';
import { RuntimeMetric } from './RuntimeMetric';
import { IRuntimeBlock } from './IRuntimeBlock';
import { ITimerRuntime } from './ITimerRuntime';

// Mock strategy for testing
class MockStrategy implements IRuntimeBlockStrategy {
  private shouldHandle: boolean;
  private returnBlock: IRuntimeBlock | undefined;

  constructor(shouldHandle: boolean = true, returnBlock?: IRuntimeBlock) {
    this.shouldHandle = shouldHandle;
    this.returnBlock = returnBlock;
  }

  canHandle(nodes: JitStatement[], runtime: ITimerRuntime): boolean {
    return this.shouldHandle;
  }

  compile(compiledMetrics: RuntimeMetric[], legacySources: JitStatement[], runtime: ITimerRuntime): IRuntimeBlock | undefined {
    return this.returnBlock;
  }
}

// Mock runtime for testing
const mockRuntime: ITimerRuntime = {
  stack: {
    getParentBlocks: () => [],
    push: () => {},
    pop: () => undefined,
    peek: () => undefined,
    depth: () => 0
  },
  isActive: false,
  isPaused: false,
  elapsedTime: 0,
  currentRep: 1,
  currentRound: 1,
  apply: () => {},
  getCurrentTime: () => Date.now(),
  start: () => {},
  stop: () => {},
  pause: () => {},
  resume: () => {},
  reset: () => {}
};

describe('RuntimeJitStrategies', () => {
  let strategies: RuntimeJitStrategies;

  beforeEach(() => {
    strategies = new RuntimeJitStrategies();
  });

  describe('constructor', () => {
    it('should initialize with empty strategy list', () => {
      expect(strategies.getStrategyCount()).toBe(0);
    });
  });

  describe('addStrategy', () => {
    it('should add strategy to the beginning of the list', () => {
      const strategy1 = new MockStrategy();
      const strategy2 = new MockStrategy();

      strategies.addStrategy(strategy1);
      expect(strategies.getStrategyCount()).toBe(1);

      strategies.addStrategy(strategy2);
      expect(strategies.getStrategyCount()).toBe(2);
    });

    it('should give priority to later-added strategies', () => {
      const mockBlock = {} as IRuntimeBlock;
      const strategy1 = new MockStrategy(true, undefined);
      const strategy2 = new MockStrategy(true, mockBlock);

      strategies.addStrategy(strategy1);
      strategies.addStrategy(strategy2);

      const statements: JitStatement[] = [{ fragments: [], id: 'test' }];
      const result = strategies.compile([], statements, mockRuntime);

      expect(result).toBe(mockBlock);
    });
  });

  describe('compile', () => {
    it('should return undefined when no strategies are registered', () => {
      const statements: JitStatement[] = [{ fragments: [], id: 'test' }];
      const result = strategies.compile([], statements, mockRuntime);

      expect(result).toBeUndefined();
    });

    it('should return undefined when no strategy can handle the statements', () => {
      const strategy = new MockStrategy(false);
      strategies.addStrategy(strategy);

      const statements: JitStatement[] = [{ fragments: [], id: 'test' }];
      const result = strategies.compile([], statements, mockRuntime);

      expect(result).toBeUndefined();
    });

    it('should return block from first matching strategy', () => {
      const mockBlock = {} as IRuntimeBlock;
      const strategy = new MockStrategy(true, mockBlock);
      strategies.addStrategy(strategy);

      const statements: JitStatement[] = [{ fragments: [], id: 'test' }];
      const result = strategies.compile([], statements, mockRuntime);

      expect(result).toBe(mockBlock);
    });

    it('should try strategies in priority order', () => {
      const mockBlock1 = { id: 'block1' } as any;
      const mockBlock2 = { id: 'block2' } as any;
      
      const strategy1 = new MockStrategy(true, mockBlock1);
      const strategy2 = new MockStrategy(true, mockBlock2);

      // Add in order: strategy1 first, then strategy2
      strategies.addStrategy(strategy1);
      strategies.addStrategy(strategy2);

      const statements: JitStatement[] = [{ fragments: [], id: 'test' }];
      const result = strategies.compile([], statements, mockRuntime);

      // Should return mockBlock2 since strategy2 was added later (higher priority)
      expect(result).toBe(mockBlock2);
    });
  });

  describe('clearStrategies', () => {
    it('should remove all strategies', () => {
      strategies.addStrategy(new MockStrategy());
      strategies.addStrategy(new MockStrategy());
      
      expect(strategies.getStrategyCount()).toBe(2);

      strategies.clearStrategies();
      expect(strategies.getStrategyCount()).toBe(0);
    });
  });

  describe('getStrategyCount', () => {
    it('should return correct count', () => {
      expect(strategies.getStrategyCount()).toBe(0);

      strategies.addStrategy(new MockStrategy());
      expect(strategies.getStrategyCount()).toBe(1);

      strategies.addStrategy(new MockStrategy());
      expect(strategies.getStrategyCount()).toBe(2);
    });
  });
});