import { IRuntimeBehavior } from '../../contracts/IRuntimeBehavior';

/**
 * Result of validation.
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Dependency specification for a behavior.
 * If multiple dependencies are specified, at least one must be present (OR logic).
 */
export interface BehaviorDependency {
  /** Behavior type that has dependencies */
  behaviorType: string;
  /** Dependencies - at least one must be present */
  requiresAnyOf: string[];
}

/**
 * Mutual exclusivity group - only one member can be present.
 */
export interface ExclusivityGroup {
  name: string;
  members: string[];
}

/**
 * Validates that all behavior dependencies are satisfied.
 */
export class BehaviorDependencyValidator {
  private readonly dependencies: BehaviorDependency[] = [
    {
      behaviorType: 'ChildRunnerBehavior',
      requiresAnyOf: ['ChildIndexBehavior'],
    },
    {
      behaviorType: 'RoundPerLoopBehavior',
      requiresAnyOf: ['ChildIndexBehavior'],
    },
    {
      behaviorType: 'RepSchemeBehavior',
      requiresAnyOf: ['RoundPerLoopBehavior', 'RoundPerNextBehavior'],
    },
    {
      behaviorType: 'SinglePassBehavior',
      requiresAnyOf: ['RoundPerLoopBehavior', 'RoundPerNextBehavior'],
    },
    {
      behaviorType: 'BoundLoopBehavior',
      requiresAnyOf: ['RoundPerLoopBehavior', 'RoundPerNextBehavior'],
    },
    {
      behaviorType: 'UnboundLoopBehavior',
      requiresAnyOf: ['RoundPerLoopBehavior', 'RoundPerNextBehavior'],
    },
    {
      behaviorType: 'IntervalWaitingBehavior',
      requiresAnyOf: ['BoundTimerBehavior', 'TimerBehavior'],
    },
    {
      behaviorType: 'IntervalTimerRestartBehavior',
      requiresAnyOf: ['BoundTimerBehavior', 'TimerBehavior'],
    },
  ];

  validate(behaviors: IRuntimeBehavior[]): ValidationResult {
    const behaviorTypes = new Set(behaviors.map((b) => b.constructor.name));
    const errors: string[] = [];
    const warnings: string[] = [];

    for (const behavior of behaviors) {
      const typeName = behavior.constructor.name;
      const dep = this.dependencies.find((d) => d.behaviorType === typeName);

      if (dep && dep.requiresAnyOf.length > 0) {
        const hasAnyDep = dep.requiresAnyOf.some((d) => behaviorTypes.has(d));
        if (!hasAnyDep) {
          errors.push(
            `${typeName} requires at least one of: ${dep.requiresAnyOf.join(', ')}`
          );
        }
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * Register additional dependency at runtime.
   */
  addDependency(dependency: BehaviorDependency): void {
    this.dependencies.push(dependency);
  }
}

/**
 * Validates mutual exclusivity constraints.
 */
export class MutualExclusivityValidator {
  private readonly exclusivityGroups: ExclusivityGroup[] = [
    {
      name: 'PrimaryTimer',
      members: ['BoundTimerBehavior', 'UnboundTimerBehavior'],
    },
    {
      name: 'RoundCounting',
      members: ['RoundPerLoopBehavior', 'RoundPerNextBehavior'],
    },
    {
      name: 'LoopTermination',
      members: ['SinglePassBehavior', 'BoundLoopBehavior', 'UnboundLoopBehavior'],
    },
  ];

  validate(behaviors: IRuntimeBehavior[]): ValidationResult {
    const behaviorTypes = new Set(behaviors.map((b) => b.constructor.name));
    const errors: string[] = [];
    const warnings: string[] = [];

    for (const group of this.exclusivityGroups) {
      const present = group.members.filter((m) => behaviorTypes.has(m));
      if (present.length > 1) {
        errors.push(
          `Mutual exclusivity violation in ${group.name}: ${present.join(', ')} cannot coexist`
        );
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * Register additional exclusivity group at runtime.
   */
  addGroup(group: ExclusivityGroup): void {
    this.exclusivityGroups.push(group);
  }
}

/**
 * Combined validator that checks both dependencies and exclusivity.
 */
export class BehaviorValidator {
  private readonly dependencyValidator = new BehaviorDependencyValidator();
  private readonly exclusivityValidator = new MutualExclusivityValidator();

  validate(behaviors: IRuntimeBehavior[]): ValidationResult {
    const depResult = this.dependencyValidator.validate(behaviors);
    const exclResult = this.exclusivityValidator.validate(behaviors);

    return {
      valid: depResult.valid && exclResult.valid,
      errors: [...depResult.errors, ...exclResult.errors],
      warnings: [...depResult.warnings, ...exclResult.warnings],
    };
  }
}
