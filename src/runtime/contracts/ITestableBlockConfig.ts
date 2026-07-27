import type { IRuntimeAction } from './IRuntimeAction';
import type { CompletionDecision } from './IRuntimeBlock';
import type { IRuntimeActionable } from './primitives/IRuntimeActionable';
/**
 * Configuration for method interception behavior.
 * Defined here (in runtime/contracts) so that both production runtime
 * code and the testing layer can reference it without creating a
 * runtime → testing circular dependency.
 */
export type InterceptMode =
  | 'passthrough'  // Call underlying method normally
  | 'spy'          // Call method and record arguments/return
  | 'override'     // Replace with custom implementation
  | 'ignore';      // Skip method call entirely

/**
 * Configuration for TestableBlock behavior.
 * Used by IRuntimeOptions to allow debug-mode block wrapping.
 */
export interface TestableBlockConfig {
  /** Custom ID for easy identification in visualizations */
  testId?: string;

  /** Custom label override for display purposes */
  labelOverride?: string;

  /** Mode for mount() interception */
  mountMode?: InterceptMode;
  /** Custom mount implementation when mode is 'override' */
  mountOverride?: (runtime: IRuntimeActionable) => IRuntimeAction[];

  /** Mode for next() interception */
  nextMode?: InterceptMode;
  /** Custom next implementation when mode is 'override' */
  nextOverride?: (runtime: IRuntimeActionable) => IRuntimeAction[];

  /** Mode for inspectNext() interception */
  inspectNextMode?: InterceptMode;
  /** Custom inspectNext implementation when mode is 'override' */
  inspectNextOverride?: (runtime: IRuntimeActionable) => CompletionDecision;
  /** Mode for unmount() interception */
  unmountMode?: InterceptMode;
  /** Custom unmount implementation when mode is 'override' */
  unmountOverride?: (runtime: IRuntimeActionable) => IRuntimeAction[];

  /** Mode for dispose() interception */
  disposeMode?: InterceptMode;
  /** Custom dispose implementation when mode is 'override' */
  disposeOverride?: (runtime: IRuntimeActionable) => void;
}
