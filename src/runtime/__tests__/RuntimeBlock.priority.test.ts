import { describe, it, expect } from 'bun:test';
import { RuntimeBlock } from '../RuntimeBlock';
import { IRuntimeBehavior } from '../contracts/IRuntimeBehavior';
import { PRIORITY_INFRASTRUCTURE, PRIORITY_PRE_EXECUTION_MIN, PRIORITY_CORE_MIN } from '../contracts/BehaviorPriority';

class MockBehaviorWithPriority implements IRuntimeBehavior {
  readonly priority: number;
  name: string;

  constructor(priority: number, name: string) {
    this.priority = priority;
    this.name = name;
  }
}

class MockBehaviorNoPriority implements IRuntimeBehavior {
  name: string;

  constructor(name: string) {
    this.name = name;
  }
}

describe('RuntimeBlock - Priority Ordering', () => {
  describe('behavior sorting', () => {
    it('should sort behaviors by priority (low to high)', () => {
      const lowPriority = new MockBehaviorWithPriority(PRIORITY_CORE_MIN, 'low');
      const medPriority = new MockBehaviorWithPriority(PRIORITY_PRE_EXECUTION_MIN, 'med');
      const highPriority = new MockBehaviorWithPriority(PRIORITY_INFRASTRUCTURE, 'high');

      const block = new RuntimeBlock('test', 'Test', [lowPriority, medPriority, highPriority], {});

      const behaviors = block['behaviors'];
      expect(behaviors[0].name).toBe('high'); // Infrastructure first
      expect(behaviors[1].name).toBe('med');  // Pre-execution second
      expect(behaviors[2].name).toBe('low');  // Core last
    });

    it('should use default priority for behaviors without explicit priority', () => {
      const withPriority = new MockBehaviorWithPriority(PRIORITY_INFRASTRUCTURE, 'explicit');
      const withoutPriority = new MockBehaviorNoPriority('default');

      const block = new RuntimeBlock('test', 'Test', [withoutPriority, withPriority], {});

      const behaviors = block['behaviors'];
      expect(behaviors[0].name).toBe('explicit'); // Lower priority first
      expect(behaviors[1].name).toBe('default');  // Default (1000) last
    });

    it('should preserve insertion order for same priority', () => {
      const behavior1 = new MockBehaviorWithPriority(PRIORITY_CORE_MIN, 'first');
      const behavior2 = new MockBehaviorWithPriority(PRIORITY_CORE_MIN, 'second');
      const behavior3 = new MockBehaviorWithPriority(PRIORITY_CORE_MIN, 'third');

      const block = new RuntimeBlock('test', 'Test', [behavior1, behavior2, behavior3], {});

      const behaviors = block['behaviors'];
      expect(behaviors[0].name).toBe('first');
      expect(behaviors[1].name).toBe('second');
      expect(behaviors[2].name).toBe('third');
    });
  });
});
