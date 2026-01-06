import { describe, it, expect } from 'bun:test';
import { RuntimeBlock } from '../RuntimeBlock';
import { IRuntimeBehavior } from '../contracts/IRuntimeBehavior';

class BehaviorA implements IRuntimeBehavior {
  name = 'BehaviorA';
}

class BehaviorB implements IRuntimeBehavior {
  name = 'BehaviorB';
  readonly requiredBehaviors = [BehaviorA];
}

class BehaviorC implements IRuntimeBehavior {
  name = 'BehaviorC';
}

class BehaviorD implements IRuntimeBehavior {
  name = 'BehaviorD';
  readonly conflictingBehaviors = [BehaviorC];
}

describe('RuntimeBlock - Dependency Validation', () => {
  describe('required dependencies', () => {
    it('should validate required behaviors are present', () => {
      const behaviorA = new BehaviorA();
      const behaviorB = new BehaviorB();

      // Should not throw when dependency is present
      expect(() => {
        new RuntimeBlock('test', 'Test', [behaviorA, behaviorB], {});
      }).not.toThrow();
    });

    it('should throw when required behavior is missing', () => {
      const behaviorB = new BehaviorB();

      // Should throw when dependency is missing
      expect(() => {
        new RuntimeBlock('test', 'Test', [behaviorB], {});
      }).toThrow(/requires BehaviorA/);
    });

    it('should include block label in error message', () => {
      const behaviorB = new BehaviorB();

      try {
        new RuntimeBlock('test-block', 'My Test Block', [behaviorB], {});
        expect(true).toBe(false); // Should not reach here
      } catch (error: any) {
        expect(error.message).toContain('My Test Block');
        expect(error.message).toContain('BehaviorB');
        expect(error.message).toContain('BehaviorA');
      }
    });
  });

  describe('conflicting behaviors', () => {
    it('should allow behaviors when conflicts are not present', () => {
      const behaviorC = new BehaviorC();
      const behaviorD = new BehaviorD();

      // Should not throw when only one is present
      expect(() => {
        new RuntimeBlock('test', 'Test', [behaviorD], {});
      }).not.toThrow();
    });

    it('should throw when conflicting behaviors are both present', () => {
      const behaviorC = new BehaviorC();
      const behaviorD = new BehaviorD();

      // Should throw when both conflicting behaviors are present
      expect(() => {
        new RuntimeBlock('test', 'Test', [behaviorC, behaviorD], {});
      }).toThrow(/conflicts with BehaviorC/);
    });

    it('should include block label in conflict error message', () => {
      const behaviorC = new BehaviorC();
      const behaviorD = new BehaviorD();

      try {
        new RuntimeBlock('conflict-test', 'Conflict Test', [behaviorC, behaviorD], {});
        expect(true).toBe(false); // Should not reach here
      } catch (error: any) {
        expect(error.message).toContain('Conflict Test');
        expect(error.message).toContain('BehaviorD');
        expect(error.message).toContain('BehaviorC');
      }
    });
  });

  describe('complex scenarios', () => {
    it('should validate multiple dependencies', () => {
      class BehaviorE implements IRuntimeBehavior {
        name = 'BehaviorE';
        readonly requiredBehaviors = [BehaviorA, BehaviorC];
      }

      const behaviorA = new BehaviorA();
      const behaviorC = new BehaviorC();
      const behaviorE = new BehaviorE();

      // Should not throw when all dependencies present
      expect(() => {
        new RuntimeBlock('test', 'Test', [behaviorA, behaviorC, behaviorE], {});
      }).not.toThrow();

      // Should throw when one dependency missing
      expect(() => {
        new RuntimeBlock('test', 'Test', [behaviorA, behaviorE], {});
      }).toThrow();
    });
  });
});
