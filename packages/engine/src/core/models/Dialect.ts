import { ICodeStatement } from "./CodeStatement";
import { MetricContainer } from "./MetricContainer";

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
   * Optionally rewrite the statement's metrics in place before {@link analyze}.
   *
   * This is the transform half of the Dialect contract (the {@link DialectAnalysis}
   * return value is the append half). The base Units Dialect implements this to
   * fuse bare Number + unit-word metrics into dimensioned metrics; most dialects
   * leave it undefined and only append hints.
   *
   * Dialects run in registration order and each observes the previous dialects'
   * output, so a sport dialect's `transform` sees units already fused by the base
   * Units Dialect (the Dialect Stack). Implementations must be idempotent.
   */
  transform?(statement: ICodeStatement): void;
  /**
   * Analyze a statement and return emitted metrics (hint markers + values).
   * Called after parsing, before JIT compilation.
   */
  analyze(statement: ICodeStatement): DialectAnalysis;
}
