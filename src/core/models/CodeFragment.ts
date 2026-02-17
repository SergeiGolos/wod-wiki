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
   * **Time** — runtime timer state stored in block memory.
   *
   * The spans collection (TimeSpan[]) that a block tracks.
   * Displayed on the grid as session-relative time ranges (e.g., :00 → 2:30).
   * Created by runtime behaviors (TimerBehavior, TimerInitBehavior, etc.).
   *
   * @see docs/architecture/time-terminology.md
   */
  Time = 'time',

  /**
   * **Duration** — parser-defined planned duration.
   *
   * A fragment defined by the CodeStatement (e.g., "5:00" → 300 000 ms).
   * Consumed by TimerEndingBehavior to know how long the span elapsed
   * should be before closing the span.
   * Owned by the parser — the runtime reads it but never computes it.
   *
   * @see docs/architecture/time-terminology.md
   */
  Duration = 'duration',

  Rep = 'rep',
  Effort = 'effort',
  Distance = 'distance',
  Rounds = 'rounds',
  CurrentRound = 'current-round',
  Action = 'action',
  Increment = 'increment',
  Group = 'group',
  Text = 'text',
  Resistance = 'resistance',
  Sound = 'sound',
  System = 'system',
  Label = 'label',

  /**
   * **Spans** — raw start/stop TimeSpan[] recordings.
   *
   * Source-of-truth data from which Elapsed and Total are derived.
   * Each span represents a continuous period of active (unpaused) execution.
   *
   * @see docs/architecture/time-terminology.md
   */
  Spans = 'spans',

  /**
   * **Elapsed** — total running time (active only, excludes pauses).
   *
   * Computed as Σ(end − start) for each span segment on the block's Time.
   * Derived from Spans by the runtime.
   *
   * @see docs/architecture/time-terminology.md
   */
  Elapsed = 'elapsed',

  /**
   * **Total** — wall-clock bracket (includes pauses).
   *
   * Computed as lastSpan.end − firstSpan.start.
   * Derived from Spans by the runtime.
   *
   * @see docs/architecture/time-terminology.md
   */
  Total = 'total',

  /**
   * **TimeStamp** — real system time (Date.now()) when a message is logged.
   *
   * Ground-truth wall-clock reference independent of the runtime clock.
   *
   * @see docs/architecture/time-terminology.md
   */
  SystemTime = 'system-time'
}
