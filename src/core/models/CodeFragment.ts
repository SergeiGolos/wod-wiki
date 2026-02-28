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
  | 'analyzed'
  | 'execution';

export interface ICodeFragment {
  readonly image?: string;
  readonly value?: unknown;
  readonly type: string; // Retained for now, will be replaced by fragmentType
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

/**
 * Fragment type enumeration.
 *
 * Time-related terms follow the glossary in docs/architecture/time-terminology.md:
 * - **Duration** (Parser)  — planned target from the script (e.g., "5:00" → 300 000 ms)
 * - **Time / Spans** (Block) — the raw TimeSpan[] start/stop recordings a block tracks
 * - **TimeStamp** (Runtime) — system Date.now() when a message is logged
 * - **Elapsed** (Runtime)  — Σ(end − start) of each span segment (active time, excludes pauses)
 * - **Total** (Runtime)    — lastEnd − firstStart (wall-clock bracket, includes pauses)
 */
export enum FragmentType {
  /**
   * **Duration** (Core) — parser-defined planned target.
   *
   * A fragment defined by the CodeStatement during parsing (e.g., "5:00" → 300 000 ms).
   * It can be a time (duration) or a placeholder to be resolved.
   * Owned by the parser — the runtime reads it but never computes it.
   */
  Duration = 'duration',

  /**
   * **Spans** (Core) — raw start/stop TimeSpan[] recordings.
   *
   * Source-of-truth data recorded using the runtime clock.
   * Each span represents a continuous period of active (unpaused) execution.
   * These can be recorded at runtime or back-filled during analytics.
   */
  Spans = 'spans',

  /**
   * **SystemTime** (Core) — real system time (Date.now()) when a message is logged.
   *
   * Ground-truth wall-clock reference (timestamp) associated with system time metrics.
   * Independent of the runtime clock.
   */
  SystemTime = 'system-time',

  /** @deprecated Use Spans. This represented runtime timer state in block memory. */
  Time = 'time',

  /** @deprecated Calculated from Spans when needed. Σ(end − start) of active segments. */
  Elapsed = 'elapsed',

  /** @deprecated Calculated from Spans when needed. lastEnd − firstStart. */
  Total = 'total',

  Rep = 'rep',
