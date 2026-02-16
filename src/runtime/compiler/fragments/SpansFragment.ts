import { ICodeFragment, FragmentType, FragmentOrigin } from "../../../core/models/CodeFragment";
import { TimeSpan } from "../../models/TimeSpan";
import { MetricBehavior } from "../../../types/MetricBehavior";

/**
 * SpansFragment tracks the raw start/stop timestamps from the runtime clock.
 *
 * Each span represents a continuous period of active execution (clock running).
 * Multiple spans occur when the timer is paused and resumed.
 *
 * ## Display behavior
 * - Single span with start === end → displayed as a timestamp
 * - Single span with start !== end → displayed as a time range
 * - Multiple spans → displayed as a list of time ranges
 *
 * ## Relationship to other time fragments
 * - All other time values (elapsed, total) are **derived** from spans.
 * - **ElapsedFragment** = sum of span durations (active time only)
 * - **TotalFragment** = wall-clock bracket from first start to last end
 *
 * This fragment is the source of truth for time tracking.
 */
export class SpansFragment implements ICodeFragment {
  readonly type: string = "spans";
  readonly fragmentType = FragmentType.Spans;
  readonly origin: FragmentOrigin = 'runtime';
  readonly behavior: MetricBehavior = MetricBehavior.Recorded;

  /**
   * @param spans Array of TimeSpan objects recording clock start/stop events
   * @param sourceBlockKey Block that owns these spans
   * @param timestamp When this fragment was created
   */
  constructor(
    readonly spans: TimeSpan[],
    readonly sourceBlockKey?: string,
    readonly timestamp?: Date,
  ) {}

  /** The raw TimeSpan array */
  get value(): TimeSpan[] {
    return this.spans;
  }

  /** Human-readable image of the spans */
  get image(): string {
    if (this.spans.length === 0) return '--:--';
    if (this.spans.length === 1) {
      const span = this.spans[0];
      if (span.started === span.ended) {
        return SpansFragment.formatTimestamp(span.started);
      }
      return `${SpansFragment.formatTimestamp(span.started)} – ${SpansFragment.formatTimestamp(span.ended ?? Date.now())}`;
    }
    return `${this.spans.length} spans`;
  }

  /**
   * Whether the last span is still open (clock currently running).
   */
  get isOpen(): boolean {
    if (this.spans.length === 0) return false;
    return this.spans[this.spans.length - 1].isOpen;
  }

  /**
   * Format a timestamp (epoch ms) as HH:MM:SS.
   */
  static formatTimestamp(epochMs: number): string {
    const d = new Date(epochMs);
    const h = d.getHours().toString().padStart(2, '0');
    const m = d.getMinutes().toString().padStart(2, '0');
    const s = d.getSeconds().toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  }
}
