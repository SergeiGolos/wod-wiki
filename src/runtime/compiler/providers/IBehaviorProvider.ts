import { ICodeStatement } from '@/core/models/CodeStatement';
import { ICodeFragment } from '@/core/models/CodeFragment';
import { IRuntimeBehavior } from '../../contracts/IRuntimeBehavior';
import { IScriptRuntime } from '../../contracts/IScriptRuntime';
import { BlockContext } from '../../BlockContext';
import { BlockKey } from '@/core/models/BlockKey';

/**
 * Priority levels for behavior providers.
 * Higher numbers are processed first during matching.
 */
export enum BehaviorProviderPriority {
  INFRASTRUCTURE = 1000,
  TIMING = 900,
  LOOP_CONTROL = 800,
  CHILD_EXECUTION = 700,
  COMPLETION = 600,
  REP_SCHEME = 500,
  INTERVAL = 400,
  TRACKING = 300,
  AUDIO = 200,
  UI = 100,
}

/**
 * Result from a behavior provider's contribution.
 */
export interface IBehaviorContribution {
  /** Behaviors to add to the block */
  behaviors: IRuntimeBehavior[];

  /** Behavior type names that this provider excludes (other providers should not add these) */
  excludes?: string[];

  /** Behavior type names that this provider requires to be present */
  requires?: string[];

  /** Behavior type names that this provider conflicts with */
  conflictsWith?: string[];

  /** Block type hint (used to determine final block type) */
  blockTypeHint?: string;
}

/**
 * Context passed during compilation for coordination between providers.
 */
export interface ICompilationContext {
  /** Block key being created */
  readonly blockKey: BlockKey;

  /** Block ID string */
  readonly blockId: string;

  /** Exercise ID if available */
  readonly exerciseId: string;

  /** BlockContext for memory allocation */
  readonly blockContext: BlockContext;

  /** Fragment groups for the block */
  readonly fragmentGroups: ICodeFragment[][];

  /** The code statement being compiled */
  readonly statement: ICodeStatement;

  /** Source IDs from the statement */
  readonly sourceIds: number[];

  /** Accumulated behaviors from previous providers */
  readonly currentBehaviors: IRuntimeBehavior[];

  /** Excluded behavior types (from previous providers) */
  readonly excludedTypes: Set<string>;

  /** Block type hints collected from providers */
  readonly blockTypeHints: string[];

  /** Check if a behavior type is already provided */
  hasBehavior(typeName: string): boolean;

  /** Check if a behavior type is excluded */
  isExcluded(typeName: string): boolean;

  /** Add a behavior to the context */
  addBehavior(behavior: IRuntimeBehavior): void;

  /** Add an exclusion */
  addExclusion(typeName: string): void;

  /** Add a block type hint */
  addBlockTypeHint(hint: string): void;
}

/**
 * A provider that contributes behaviors to a block based on statement analysis.
 * 
 * Providers are called in priority order (highest first). Each provider can:
 * 1. Decide if it can contribute based on statement fragments/hints
 * 2. Provide behaviors and declare requirements/exclusions
 * 3. Influence the final block type through hints
 */
export interface IBehaviorProvider {
  /** Unique identifier for this provider */
  readonly id: string;

  /** Display name for debugging */
  readonly name: string;

  /** Priority (higher = processed first) */
  readonly priority: BehaviorProviderPriority;

  /** Behavior group this provider belongs to (for exclusivity) */
  readonly group?: string;

  /**
   * Determines if this provider can contribute behaviors for the given statement.
   * @param statement The code statement to analyze
   * @param runtime The script runtime context
   * @param context The compilation context with current state
   */
  canProvide(
    statement: ICodeStatement,
    runtime: IScriptRuntime,
    context: ICompilationContext
  ): boolean;

  /**
   * Provides behaviors for the statement.
   * Called only if canProvide returns true.
   * @param statement The code statement to compile
   * @param runtime The script runtime context
   * @param context The compilation context
   */
  provide(
    statement: ICodeStatement,
    runtime: IScriptRuntime,
    context: ICompilationContext
  ): IBehaviorContribution;
}
