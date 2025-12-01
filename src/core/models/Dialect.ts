import { ICodeStatement } from "./CodeStatement";

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
 * Result of dialect analysis on a statement
 */
export interface DialectAnalysis {
  /** Behavioral hints to add to the statement */
  hints: string[];
  /** Inheritance rules for child statements (optional) */
  inheritance?: InheritanceRule[];
}

/**
 * Dialect interface for semantic hint generation.
 * Dialects analyze parsed statements and emit behavioral hints
 * that strategies can query for matching decisions.
 * 
 * Hint Naming Convention:
 * - behavior.* - Generic behavioral patterns (e.g., behavior.time_bound, behavior.repeating_interval)
 * - workout.* - Specific workout type identifiers (e.g., workout.amrap, workout.emom)
 * - feature.* - Optional feature flags (e.g., feature.auto_advance)
 * - domain.* - Domain-specific extensions (e.g., domain.crossfit)
 */
export interface IDialect {
  /** Unique dialect identifier */
  id: string;
  /** Display name */
  name: string;
  /**
   * Analyze a statement and return semantic hints.
   * Called after parsing, before JIT compilation.
   */
  analyze(statement: ICodeStatement): DialectAnalysis;
}
