# EventSpanAggregator

The `EventSpanAggregator` is a utility class in the wod.wiki runtime responsible for aggregating timer events into logical spans (such as start/stop, lap, complete, etc.) and providing utilities for block duration and transitions. This enables robust analytics, accurate timer display, and reusable logic for block/span computation.

## Purpose
- Decouples event aggregation and span logic from handlers (like TickHandler).
- Computes durations, transitions, and block relationships for workout analytics and display.
- Supports advanced features like pause/resume, laps, and multi-block workouts.

## Usage

```ts
import { EventSpanAggregator } from "@/core/runtime/EventSpanAggregator";

const aggregator = new EventSpanAggregator(events, stack);
const spans = aggregator.getSpans();
const total = aggregator.getTotalDuration();
const current = aggregator.getCurrentSpan();
```

## API
- **constructor(events: RuntimeEvent[], stack: StatementNode[]):**
  Aggregates the provided events and stack into spans.
- **getSpans(): EventSpan[]**
  Returns all computed spans.
- **getCurrentSpan(): EventSpan | undefined**
  Returns the current active span (if any).
- **getTotalDuration(): number**
  Returns the sum of all closed spans (in seconds).
- **getCurrentDuration(now: Date): number**
  Returns the duration (in seconds) for the current active span, up to the provided time.

## Example
```ts
const events = [
  { name: 'start', timestamp: new Date(0) },
  { name: 'stop', timestamp: new Date(5000) },
  { name: 'start', timestamp: new Date(10000) },
];
const aggregator = new EventSpanAggregator(events, stack);
console.log(aggregator.getTotalDuration()); // 5
console.log(aggregator.getCurrentDuration(new Date(15000))); // 5
```

## Integration
- Used by `TickHandler` to compute elapsed time for display and logic.
- Can be used by analytics/reporting modules for accurate workout breakdowns.

## See Also
- [TickHandler](./TickHandler.md)
- [Runtime.md](./Runtime.md)
