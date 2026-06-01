import { ICodeStatement } from "./CodeStatement";
import { MetricContainer } from "./MetricContainer";

/**
 * Mode for inheritance rules - how child statements should handle parent values
 */
export type InheritanceMode = 'clear' | 'modify' | 'ensure';

/**
 * Rule describing how a property should be inherited by child statements
 */
export interface InheritanceRule {
  /** Property to inherit (e.g., 'timer', 'weight') */
  property: string;
  /** How the child should handle the value */
  mode: InheritanceMode;
  /** Value to inherit (for 'ensure' mode) */
  value?: unknown;
}

/**
 * Result of dialect analysis on a statement.
 *
 * Dialects emit semantic markers and dialect-specific values as a single
 * {@link MetricContainer}. Semantic markers are {@link MetricType.Hint} metrics
 * (build them with `hintsToContainer`); domain values are ordinary metrics.
 * `DialectRegistry.process()` appends these onto `statement.metrics`.
 */
export interface DialectAnalysis {
  /**
   * Metrics emitted by the dialect: hint markers plus any dialect-specific
   * values. Each may carry a `MetricAction` (currently only `suppress`).
   */
  metrics?: MetricContainer;
  /** Inheritance rules for child statements (optional) */
  inheritance?: InheritanceRule[];
}

/**
 * Dialect interface for semantic marker generation.
 * Dialects analyze parsed statements and emit hint metrics
 * that strategies can query for matching decisions.
 *
 * Hint Naming Convention (the string value of each {@link MetricType.Hint} metric):
 * - behavior.* - Generic behavioral patterns (e.g. behavior.time_bound, behavior.repeating_interval)
 * - workout.* - Specific workout type identifiers (e.g. workout.amrap, workout.emom)
 * - feature.* - Optional feature flags (e.g. feature.auto_advance)
 * - domain.* - Domain-specific extensions (e.g. domain.crossfit)
 */
export interface IDialect {
  /** Unique dialect identifier */
  id: string;
  /** Display name */
  name: string;
  /**
   * Analyze a statement and return emitted metrics (hint markers + values).
   * Called after parsing, before JIT compilation.
   */
  analyze(statement: ICodeStatement): DialectAnalysis;
}
