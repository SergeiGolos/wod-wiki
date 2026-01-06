import { describe, it, expect } from 'bun:test';
import {
  BehaviorDependencyValidator,
  MutualExclusivityValidator,
  BehaviorValidator,
} from '../../../src/runtime/compiler/providers/BehaviorValidation';
import { ChildIndexBehavior } from '../../../src/runtime/behaviors/ChildIndexBehavior';
import { ChildRunnerBehavior } from '../../../src/runtime/behaviors/ChildRunnerBehavior';
import { RoundPerLoopBehavior } from '../../../src/runtime/behaviors/RoundPerLoopBehavior';
import { RoundPerNextBehavior } from '../../../src/runtime/behaviors/RoundPerNextBehavior';
import { SinglePassBehavior } from '../../../src/runtime/behaviors/SinglePassBehavior';
import { BoundLoopBehavior } from '../../../src/runtime/behaviors/BoundLoopBehavior';
import { UnboundLoopBehavior } from '../../../src/runtime/behaviors/UnboundLoopBehavior';
import { BoundTimerBehavior } from '../../../src/runtime/behaviors/BoundTimerBehavior';
import { UnboundTimerBehavior } from '../../../src/runtime/behaviors/UnboundTimerBehavior';

describe('BehaviorDependencyValidator', () => {
  const validator = new BehaviorDependencyValidator();

  describe('ChildRunnerBehavior dependencies', () => {
    it('should fail when ChildRunnerBehavior lacks ChildIndexBehavior', () => {
      const behaviors = [new ChildRunnerBehavior([[1, 2]])];
      const result = validator.validate(behaviors);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'ChildRunnerBehavior requires at least one of: ChildIndexBehavior'
      );
    });

    it('should pass when ChildRunnerBehavior has ChildIndexBehavior', () => {
      const behaviors = [
        new ChildIndexBehavior(2),
        new ChildRunnerBehavior([[1, 2]]),
      ];
      const result = validator.validate(behaviors);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('RoundPerLoopBehavior dependencies', () => {
    it('should fail when RoundPerLoopBehavior lacks ChildIndexBehavior', () => {
      const behaviors = [new RoundPerLoopBehavior()];
      const result = validator.validate(behaviors);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'RoundPerLoopBehavior requires at least one of: ChildIndexBehavior'
      );
    });

    it('should pass when RoundPerLoopBehavior has ChildIndexBehavior', () => {
      const behaviors = [new ChildIndexBehavior(2), new RoundPerLoopBehavior()];
      const result = validator.validate(behaviors);

      expect(result.valid).toBe(true);
    });
  });

  describe('Loop termination behavior dependencies', () => {
    it('should fail when SinglePassBehavior lacks round behavior', () => {
      const behaviors = [new SinglePassBehavior()];
      const result = validator.validate(behaviors);

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('SinglePassBehavior requires');
    });

    it('should pass when SinglePassBehavior has RoundPerLoopBehavior', () => {
      const behaviors = [
        new ChildIndexBehavior(1),
        new RoundPerLoopBehavior(),
        new SinglePassBehavior(),
      ];
      const result = validator.validate(behaviors);

      expect(result.valid).toBe(true);
    });

    it('should pass when SinglePassBehavior has RoundPerNextBehavior', () => {
      const behaviors = [new RoundPerNextBehavior(), new SinglePassBehavior()];
      const result = validator.validate(behaviors);

      expect(result.valid).toBe(true);
    });

    it('should fail when BoundLoopBehavior lacks round behavior', () => {
      const behaviors = [new BoundLoopBehavior(5)];
      const result = validator.validate(behaviors);

      expect(result.valid).toBe(false);
    });

    it('should fail when UnboundLoopBehavior lacks round behavior', () => {
      const behaviors = [new UnboundLoopBehavior()];
      const result = validator.validate(behaviors);

      expect(result.valid).toBe(false);
    });
  });
});

describe('MutualExclusivityValidator', () => {
  const validator = new MutualExclusivityValidator();

  describe('Timer exclusivity', () => {
    it('should fail when both BoundTimerBehavior and UnboundTimerBehavior present', () => {
      const behaviors = [
        new BoundTimerBehavior(60000),
        new UnboundTimerBehavior(),
      ];
      const result = validator.validate(behaviors);

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('PrimaryTimer');
    });

    it('should pass with only BoundTimerBehavior', () => {
      const behaviors = [new BoundTimerBehavior(60000)];
      const result = validator.validate(behaviors);

      expect(result.valid).toBe(true);
    });

    it('should pass with only UnboundTimerBehavior', () => {
      const behaviors = [new UnboundTimerBehavior()];
      const result = validator.validate(behaviors);

      expect(result.valid).toBe(true);
    });
  });

  describe('Round counting exclusivity', () => {
    it('should fail when both RoundPerLoopBehavior and RoundPerNextBehavior present', () => {
      const behaviors = [new RoundPerLoopBehavior(), new RoundPerNextBehavior()];
      const result = validator.validate(behaviors);

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('RoundCounting');
    });
  });

  describe('Loop termination exclusivity', () => {
    it('should fail when multiple loop termination behaviors present', () => {
      const behaviors = [new SinglePassBehavior(), new BoundLoopBehavior(5)];
      const result = validator.validate(behaviors);

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('LoopTermination');
    });

    it('should fail when SinglePassBehavior and UnboundLoopBehavior present', () => {
      const behaviors = [new SinglePassBehavior(), new UnboundLoopBehavior()];
      const result = validator.validate(behaviors);

      expect(result.valid).toBe(false);
    });
  });
});

describe('BehaviorValidator (combined)', () => {
  const validator = new BehaviorValidator();

  it('should validate a correct behavior configuration', () => {
    const behaviors = [
      new ChildIndexBehavior(2),
      new RoundPerLoopBehavior(),
      new BoundLoopBehavior(3),
      new ChildRunnerBehavior([[1], [2]]),
    ];
    const result = validator.validate(behaviors);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should catch both dependency and exclusivity violations', () => {
    const behaviors = [
      new SinglePassBehavior(), // Missing round behavior
      new BoundLoopBehavior(3), // Conflicts with SinglePassBehavior
    ];
    const result = validator.validate(behaviors);

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(2);
  });
});
