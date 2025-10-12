# Behavior Metric Emission Guide

This guide explains how to emit metrics from runtime behaviors using the new fitness projection system.

## Overview

Behaviors can now emit structured metrics during workout execution using the `EmitMetricAction`. This allows for automatic collection of performance data without coupling behaviors to the analytics layer.

## Basic Pattern

```typescript
import { IRuntimeBehavior } from '../IRuntimeBehavior';
import { IRuntimeAction } from '../IRuntimeAction';
import { IScriptRuntime } from '../IScriptRuntime';
import { IRuntimeBlock } from '../IRuntimeBlock';
import { EmitMetricAction } from '../actions/EmitMetricAction';
import { RuntimeMetric, MetricValue, TimeSpan } from '../RuntimeMetric';

export class ExampleBehavior implements IRuntimeBehavior {
  
  onNext(runtime: IScriptRuntime, block: IRuntimeBlock): IRuntimeAction[] {
    const actions: IRuntimeAction[] = [];
    
    // Collect metric values
    const values: MetricValue[] = [
      { type: 'repetitions', value: 10, unit: 'reps' },
      { type: 'resistance', value: 100, unit: 'kg' }
    ];
    
    // Get time spans (if tracked)
    const timeSpans: TimeSpan[] = this.getTimeSpans(block);
    
    // Get exercise ID from context
    const exerciseId = block.context.exerciseId;
    
    // Create and emit metric
    if (exerciseId && values.length > 0 && timeSpans.length > 0) {
      const metric: RuntimeMetric = {
        exerciseId,
        values,
        timeSpans
      };
      
      actions.push(new EmitMetricAction(metric));
    }
    
    return actions;
  }
  
  private getTimeSpans(block: IRuntimeBlock): TimeSpan[] {
    // Implementation depends on your behavior
    return [];
  }
}
```

## Detailed Example: RoundsBehavior Integration

Here's how to modify `RoundsBehavior` to emit metrics:

```typescript
import { IRuntimeBehavior } from '../IRuntimeBehavior';
import { IRuntimeAction } from '../IRuntimeAction';
import { IScriptRuntime } from '../IScriptRuntime';
import { IRuntimeBlock } from '../IRuntimeBlock';
import { TypedMemoryReference } from '../IMemoryReference';
import { MemoryTypeEnum } from '../MemoryTypeEnum';
import { EmitMetricAction } from '../actions/EmitMetricAction';
import { RuntimeMetric, MetricValue, TimeSpan } from '../RuntimeMetric';

export class RoundsBehavior implements IRuntimeBehavior {
  private currentRound = 0;
  
  constructor(
    private readonly totalRounds: number,
    private readonly repScheme?: number[],
    private readonly roundsStateRef?: TypedMemoryReference<RoundsState>
  ) {}
  
  onNext(runtime: IScriptRuntime, block: IRuntimeBlock): IRuntimeAction[] {
    this.currentRound++;
    
    const actions: IRuntimeAction[] = [];
    
    // Update rounds state
    if (this.roundsStateRef) {
      this.roundsStateRef.set({
        currentRound: this.currentRound,
        totalRounds: this.totalRounds,
        completedRounds: this.currentRound - 1,
      });
    }
    
    // Emit metric for the completed round
    if (this.currentRound <= this.totalRounds) {
      const metric = this.createRoundMetric(block);
      if (metric) {
        actions.push(new EmitMetricAction(metric));
      }
    }
    
    // Emit round events
    if (this.currentRound > this.totalRounds) {
      runtime.handle({
        name: 'rounds:complete',
        timestamp: new Date(),
        data: {
          blockId: block.key.toString(),
          totalRoundsCompleted: this.totalRounds,
        },
      });
    } else {
      runtime.handle({
        name: 'rounds:changed',
        timestamp: new Date(),
        data: {
          blockId: block.key.toString(),
          currentRound: this.currentRound,
          totalRounds: this.totalRounds,
        },
      });
    }
    
    return actions;
  }
  
  private createRoundMetric(block: IRuntimeBlock): RuntimeMetric | null {
    const exerciseId = block.context.exerciseId;
    if (!exerciseId) return null;
    
    // Collect effort values from context
    const values = this.collectEffortMetrics(block);
    if (values.length === 0) return null;
    
    // Get time spans from timer behavior (if present)
    const timeSpansRef = block.context.get<TimeSpan[]>(MemoryTypeEnum.TIMER_TIME_SPANS);
    const timeSpans = timeSpansRef?.get() || [];
    
    if (timeSpans.length === 0) {
      // If no timer spans, create a synthetic span
      const now = new Date();
      timeSpans.push({ start: now, stop: now });
    }
    
    return {
      exerciseId,
      values,
      timeSpans: [...timeSpans] // Copy to avoid mutation
    };
  }
  
  private collectEffortMetrics(block: IRuntimeBlock): MetricValue[] {
    const values: MetricValue[] = [];
    
    // Get reps from rep scheme or default
    const reps = this.repScheme?.[this.currentRound - 1] || 
                 this.getDefaultReps();
    
    if (reps !== undefined) {
      values.push({
        type: 'repetitions',
        value: reps,
        unit: 'reps'
      });
    }
    
    // Get resistance from context if available
    const resistanceRef = block.context.get<number>('resistance');
    const resistance = resistanceRef?.get();
    
    if (resistance !== undefined) {
      values.push({
        type: 'resistance',
        value: resistance,
        unit: 'kg'
      });
    }
    
    return values;
  }
  
  private getDefaultReps(): number | undefined {
    // Return default reps if not in scheme
    return undefined;
  }
}
```

## Timer Integration

When using timer behaviors, capture time spans:

```typescript
import { IRuntimeBehavior } from '../IRuntimeBehavior';
import { IRuntimeAction } from '../IRuntimeAction';
import { IScriptRuntime } from '../IScriptRuntime';
import { IRuntimeBlock } from '../IRuntimeBlock';
import { TypedMemoryReference } from '../IMemoryReference';
import { TimeSpan } from '../RuntimeMetric';
import { StartTimerAction } from '../actions/StartTimerAction';
import { StopTimerAction } from '../actions/StopTimerAction';

export class TimerBehavior implements IRuntimeBehavior {
  
  constructor(
    private readonly direction: 'up' | 'down',
    private readonly duration?: number,
    private readonly timeSpansRef?: TypedMemoryReference<TimeSpan[]>,
    private readonly isRunningRef?: TypedMemoryReference<boolean>
  ) {}
  
  onPush(runtime: IScriptRuntime, block: IRuntimeBlock): IRuntimeAction[] {
    const actions: IRuntimeAction[] = [];
    
    // Initialize time span
    const now = new Date();
    const initialSpan: TimeSpan = { start: now, stop: now };
    
    if (this.timeSpansRef) {
      this.timeSpansRef.set([initialSpan]);
    }
    
    if (this.isRunningRef) {
      this.isRunningRef.set(true);
    }
    
    actions.push(new StartTimerAction());
    
    return actions;
  }
  
  onPop(runtime: IScriptRuntime, block: IRuntimeBlock): IRuntimeAction[] {
    const actions: IRuntimeAction[] = [];
    
    // Update final time span
    const now = new Date();
    
    if (this.timeSpansRef) {
      const spans = this.timeSpansRef.get() || [];
      if (spans.length > 0) {
        spans[spans.length - 1].stop = now;
        this.timeSpansRef.set(spans);
      }
    }
    
    if (this.isRunningRef) {
      this.isRunningRef.set(false);
    }
    
    actions.push(new StopTimerAction());
    
    return actions;
  }
}
```

## Best Practices

### 1. Check for Required Data

Always verify that required data is available before emitting a metric:

```typescript
if (!exerciseId) {
  console.warn('Cannot emit metric: exerciseId not set');
  return [];
}

if (values.length === 0) {
  console.warn('Cannot emit metric: no values collected');
  return [];
}

if (timeSpans.length === 0) {
  console.warn('Cannot emit metric: no time spans recorded');
  return [];
}
```

### 2. Use Defensive Copying

Always copy arrays to avoid mutation issues:

```typescript
const metric: RuntimeMetric = {
  exerciseId,
  values: [...values],        // Copy values array
  timeSpans: [...timeSpans]   // Copy time spans array
};
```

### 3. Clear Time Spans After Emission

If tracking cumulative time spans, clear them after emission:

```typescript
// Emit the metric
actions.push(new EmitMetricAction(metric));

// Clear time spans for next round
timeSpansRef?.set([]);
```

### 4. Handle Missing References Gracefully

```typescript
const timeSpansRef = block.context.get<TimeSpan[]>(MemoryTypeEnum.TIMER_TIME_SPANS);
const timeSpans = timeSpansRef?.get() || [];

// Provide synthetic span if timer not present
if (timeSpans.length === 0) {
  const now = new Date();
  timeSpans.push({ start: now, stop: now });
}
```

### 5. Document Metric Emission

Add comments explaining when and why metrics are emitted:

```typescript
// Emit metric at the end of each round to capture set performance
const metric = this.createRoundMetric(block);
if (metric) {
  actions.push(new EmitMetricAction(metric));
}
```

## Testing Metric Emission

Test that your behavior correctly emits metrics:

```typescript
import { describe, test, expect } from 'vitest';
import { ExampleBehavior } from './ExampleBehavior';
import { EmitMetricAction } from '../actions/EmitMetricAction';

describe('ExampleBehavior Metric Emission', () => {
  test('should emit metric on completion', () => {
    const behavior = new ExampleBehavior();
    const mockRuntime = createMockRuntime();
    const mockBlock = createMockBlock();
    
    // Set up block context with exerciseId
    mockBlock.context.exerciseId = 'bench-press';
    
    // Execute behavior
    const actions = behavior.onNext(mockRuntime, mockBlock);
    
    // Find metric emission action
    const metricAction = actions.find(
      a => a instanceof EmitMetricAction
    ) as EmitMetricAction;
    
    expect(metricAction).toBeDefined();
    expect(metricAction.metric.exerciseId).toBe('bench-press');
    expect(metricAction.metric.values.length).toBeGreaterThan(0);
    expect(metricAction.metric.timeSpans.length).toBeGreaterThan(0);
  });
  
  test('should not emit metric without exerciseId', () => {
    const behavior = new ExampleBehavior();
    const mockRuntime = createMockRuntime();
    const mockBlock = createMockBlock();
    
    // Don't set exerciseId
    mockBlock.context.exerciseId = '';
    
    const actions = behavior.onNext(mockRuntime, mockBlock);
    
    const metricAction = actions.find(a => a instanceof EmitMetricAction);
    expect(metricAction).toBeUndefined();
  });
});
```

## Common Patterns

### Pattern 1: Emit on Completion

Emit metrics when a set, round, or workout segment completes:

```typescript
onComplete(runtime: IScriptRuntime, block: IRuntimeBlock): IRuntimeAction[] {
  const metric = this.createMetric(block);
  return metric ? [new EmitMetricAction(metric)] : [];
}
```

### Pattern 2: Emit on Interval

Emit metrics at regular intervals (e.g., every minute):

```typescript
private lastEmissionTime = 0;
private readonly emissionInterval = 60000; // 60 seconds

onTick(runtime: IScriptRuntime, block: IRuntimeBlock): IRuntimeAction[] {
  const now = Date.now();
  if (now - this.lastEmissionTime >= this.emissionInterval) {
    this.lastEmissionTime = now;
    const metric = this.createMetric(block);
    return metric ? [new EmitMetricAction(metric)] : [];
  }
  return [];
}
```

### Pattern 3: Accumulated Metrics

Accumulate data and emit periodically:

```typescript
private accumulatedValues: MetricValue[] = [];

onNext(runtime: IScriptRuntime, block: IRuntimeBlock): IRuntimeAction[] {
  // Accumulate values
  this.accumulatedValues.push(...this.collectValues(block));
  
  // Emit when threshold reached
  if (this.accumulatedValues.length >= 10) {
    const metric = this.createMetricFromAccumulated(block);
    this.accumulatedValues = [];
    return metric ? [new EmitMetricAction(metric)] : [];
  }
  
  return [];
}
```

## Troubleshooting

### Metrics Not Appearing in Collector

1. Check that `EmitMetricAction` is being returned from behavior method
2. Verify runtime has metrics collector: `runtime.metrics !== undefined`
3. Ensure action's `do()` method is being called by runtime

### Incomplete Metrics

1. Verify all required fields are populated: `exerciseId`, `values`, `timeSpans`
2. Check that time spans are being tracked correctly by timer behavior
3. Confirm metric values are being collected from the correct memory references

### Duplicate Metrics

1. Ensure metrics are only emitted once per completion event
2. Check that time spans are being cleared after emission
3. Verify behavior state is being reset appropriately
