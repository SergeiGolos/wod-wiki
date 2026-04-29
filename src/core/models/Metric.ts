/**
 * Origin of a metrics - where it was created and its current state.
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
/**
 * Compiler instruction attached by dialect-origin metrics.
 * - 'set':      inject this metric; precedence tier handles display resolution
 * - 'suppress': hide all metrics of this type from display (sentinel pattern)
 * - 'inherit':  propagate this metric value down to child statements
 * Parser metrics never carry an action (undefined = passive).
 */
export type MetricAction = 'set' | 'suppress' | 'inherit';

export type MetricOrigin =
  | 'parser'
  | 'compiler'
  | 'runtime'
  | 'user'
  | 'collected'
  | 'hinted'
  | 'tracked'
  | 'analyzed'
  | 'execution';

export interface IMetric {
  readonly image?: string;
  readonly value?: unknown;
  /**
   * The metric type. Use a `MetricType` enum value for standard types, or any
   * string for custom derived metrics produced by enrichment processes
   * (e.g. `'speed'`, `'pace'`, `'rep-rate'`, `'power'`).
   */
  readonly type: MetricType | string;
  readonly origin: MetricOrigin;
  readonly unit?: string;

  /**
   * Compiler instruction attached by dialect-origin metrics.
   * - 'set':      inject this metric; precedence tier handles display resolution
   * - 'suppress': hide all metrics of this type from display (sentinel pattern)
   * - 'inherit':  propagate this metric value down to child statements
   * Parser metrics never carry an action (undefined = passive).
   */
  readonly action?: MetricAction;

  /**
   * Block key that created/owns this metrics.
   * Present for runtime and user-collected metric.
   */
  readonly sourceBlockKey?: string;

  /**
   * Timestamp when this metrics was created/recorded.
   * Present for runtime and user-collected metric.
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
export enum MetricType {
  /**
   * **Duration** (Core) — parser-defined planned target.
   *
   * A metrics defined by the CodeStatement during parsing (e.g., "5:00" → 300 000 ms).
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
  Lap = 'lap',
  Metric = 'metric',
  Volume = 'volume',
  Intensity = 'intensity',
  Load = 'load',
  Work = 'work',
}
