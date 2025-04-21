import { describe, expect, it } from "vitest";
import { EventSpanAggregator } from "../EventSpanAggregator";
import { IRuntimeEvent, StatementNode } from "@/core/timer.types";

describe('EventSpanAggregator', () => {
  const makeEvent = (name: string, ms: number): IRuntimeEvent => ({
    name,
    timestamp: new Date(ms),
  } as IRuntimeEvent);
  const dummyStack: StatementNode[] = [{ id: 1 } as StatementNode];

  it('aggregates simple start-stop span', () => {
    const events = [
      makeEvent('start', 0),
      makeEvent('stop', 10000),
    ];
    const agg = new EventSpanAggregator(events, dummyStack);
    const spans = agg.getSpans();
    expect(spans.length).toBe(1);
    expect(spans[0].type).toBe('stop');
    expect(agg.getTotalDuration()).toBeCloseTo(10);
  });

  it('handles multiple spans and active span', () => {
    const events = [
      makeEvent('start', 0),
      makeEvent('stop', 5000),
      makeEvent('start', 10000),
    ];
    const agg = new EventSpanAggregator(events, dummyStack);
    expect(agg.getSpans().length).toBe(2);
    expect(agg.getCurrentSpan()).toBeDefined();
    expect(agg.getCurrentDuration(new Date(15000))).toBeCloseTo(5);
    expect(agg.getTotalDuration()).toBeCloseTo(5);
  });

  it('returns 0 for current duration if no active span', () => {
    const events = [
      makeEvent('start', 0),
      makeEvent('stop', 1000),
    ];
    const agg = new EventSpanAggregator(events, dummyStack);
    expect(agg.getCurrentDuration(new Date(2000))).toBe(0);
  });
});
