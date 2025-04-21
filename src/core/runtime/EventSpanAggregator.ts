import { IRuntimeEvent, StatementNode } from "@/core/timer.types";

export interface EventSpan {
  start: IRuntimeEvent;
  stop?: IRuntimeEvent;
  type: string;
  stack: StatementNode[];
}

/**
 * Aggregates timer events into logical spans (start/stop, lap, complete, etc.)
 * and provides utilities for block duration and transitions.
 *
 * Improvements (2025-04-14):
 * - Enforces canonical event sequence: always alternate `start` and `stop`/terminal event.
 * - Detects and flags malformed event sequences (e.g., consecutive `start` or `stop`).
 * - Optionally repairs event sequences for reporting, ignoring duplicates or incomplete pairs.
 * - Provides robust span aggregation for duration reporting, even with edge cases.
 * - Exposes utility methods for validation and canonical state extraction.
 */
export class EventSpanAggregator {
  private spans: EventSpan[] = [];
  private anomalies: string[] = [];

  constructor(events: IRuntimeEvent[], stack: StatementNode[]) {
    this.aggregate(events, stack);
  }

  /**
   * Aggregates events into spans, enforcing canonical sequence and flagging anomalies.
   */
  private aggregate(events: IRuntimeEvent[], stack: StatementNode[]) {
    let currentSpan: EventSpan | null = null;
    let lastEventType: string | null = null;
    for (const event of events) {
      if (event.name === 'start') {
        if (lastEventType === 'start') {
          this.anomalies.push('Consecutive start events detected. Closing previous span early.');
          if (currentSpan) {
            // Close previous span with this start as a synthetic stop
            currentSpan.stop = event;
            currentSpan.type = 'anomaly';
            this.spans.push(currentSpan);
          }
        } else if (currentSpan) {
          this.spans.push(currentSpan);
        }
        currentSpan = {
          start: event,
          type: 'active',
          stack: stack.slice()
        };
        lastEventType = 'start';
      } else if (['stop', 'complete', 'done', 'lap'].includes(event.name)) {
        if (!currentSpan) {
          this.anomalies.push(`Stop/terminal event (${event.name}) without matching start.`);
          // Optionally ignore or create a synthetic span
        } else {
          currentSpan.stop = event;
          currentSpan.type = event.name;
          this.spans.push(currentSpan);
          currentSpan = null;
        }
        lastEventType = event.name;
      } else {
        lastEventType = event.name;
      }
    }
    if (currentSpan) {
      this.spans.push(currentSpan);
    }
  }

  /**
   * Returns all spans.
   */
  public getSpans(): EventSpan[] {
    return this.spans;
  }

  /**
   * Returns the current active span (if any).
   */
  public getCurrentSpan(): EventSpan | undefined {
    return this.spans.find(span => !span.stop);
  }

  /**
   * Returns a list of anomalies detected during aggregation.
   */
  public getAnomalies(): string[] {
    return this.anomalies;
  }

  /**
   * Returns the total duration for all closed spans.
   */
  public getTotalDuration(): number {
    return this.spans.reduce((sum, span) => {
      if (span.stop && span.start) {
        return sum + (span.stop.timestamp.getTime() - span.start.timestamp.getTime()) / 1000;
      }
      return sum;
    }, 0);
  }

  /**
   * Returns the duration for the current span (if active).
   */
  public getCurrentDuration(now: Date): number {
    const current = this.getCurrentSpan();
    if (current) {
      return (now.getTime() - current.start.timestamp.getTime()) / 1000;
    }
    return 0;
  }
}
