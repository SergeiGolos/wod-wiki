import type { ICodeStatement } from './CodeStatement';
import type { MetricContainer } from './MetricContainer';

/**
 * Result of dialect analysis on a statement.
 */
export interface DialectAnalysis {
  /**
   * Metrics emitted by the dialect: hint markers plus any dialect-specific
   * values.
   */
  metrics?: MetricContainer;
}

/**
 * Dialect interface for semantic marker generation.
 */
export interface IDialect {
  /** Unique dialect identifier */
  id: string;
  /** Display name */
  name: string;
  /**
   * Optionally rewrite the statement's metrics in place before analyze.
   */
  transform?(statement: ICodeStatement): void;
  /**
   * Analyze a statement and return emitted metrics (hint markers + values).
   */
  analyze(statement: ICodeStatement): DialectAnalysis;
}
