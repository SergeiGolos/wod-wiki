import { MetricBehavior } from "../../types/MetricBehavior";
import { CodeMetadata } from "./CodeMetadata";

/**
 * Origin of a fragment - where it was created and its current state.
 * 
 * Source origins:
 * - 'parser': Fragment created by the parser from source text (value fully specified)
 * - 'compiler': Fragment synthesized by a compiler strategy
 * - 'runtime': Fragment generated during execution (e.g., elapsed time)
 * - 'user': Fragment collected from user input (e.g., actual reps completed)
 * 
 * Value states:
 * - 'collected': Value has been collected and populated
 * - 'hinted': Value is a hint or suggestion not strictly enforced
 * - 'tracked': Value is actively being tracked during execution
 * - 'analyzed': Value is derived from analysis
 */
export type FragmentOrigin = 
  | 'parser' 
  | 'compiler' 
  | 'runtime' 
  | 'user'
  | 'collected'
  | 'hinted'
  | 'tracked'
  | 'analyzed';

export interface ICodeFragment {
  readonly image?: string;
  readonly value?: unknown;
  readonly type: string; // Retained for now, will be replaced by fragmentType
  readonly meta?: CodeMetadata;
  readonly fragmentType: FragmentType;
  /** Behavioral grouping describing the intent of the fragment. */
  readonly behavior?: MetricBehavior;

  /**
   * Origin of this fragment - where it was created and its current state.
   * Defaults to 'parser' for backwards compatibility.
   */
  readonly origin?: FragmentOrigin;

  /**
   * Block key that created/owns this fragment.
   * Present for runtime and user-collected fragments.
   */
  readonly sourceBlockKey?: string;

  /**
   * Timestamp when this fragment was created/recorded.
   * Present for runtime and user-collected fragments.
   */
  readonly timestamp?: Date;

  // Pure data interface - no metric methods
}

export enum FragmentType {
  Timer = 'timer',
  Rep = 'rep',
  Effort = 'effort',
  Distance = 'distance',
  Rounds = 'rounds',
  Action = 'action',
  Increment = 'increment',
  Lap = 'lap',
  Text = 'text',
  Resistance = 'resistance'
}
