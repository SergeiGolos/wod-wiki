---
title: "Metric Inheritance Usage Examples"
date: 2025-06-29
tags: [examples, metric-inheritance, implementation]
parent: ./metric-inheritance-implementation-status.md
---

# Metric Inheritance Usage Examples

## Overview
This document provides practical examples of how the metric inheritance system works in the WOD Wiki runtime.

## Example 1: Simple 3-Round Workout

### Workout Structure
```
3 Rounds
  10 Push-ups
  15 Squats @ 100lbs
```

### Compilation Flow

#### 1. Fragment Compilation (Before Inheritance)
```typescript
// Base metrics from fragment compilation
const baseMetrics = [
  {
    sourceId: "pushups",
    effort: "Push-ups", 
    values: [{ type: "repetitions", value: 10, unit: "reps" }]
  },
  {
    sourceId: "squats",
    effort: "Squats",
    values: [
      { type: "repetitions", value: 15, unit: "reps" },
      { type: "resistance", value: 100, unit: "lbs" }
    ]
  }
];
```

#### 2. Parent Block Inheritance
```typescript
// RoundsBlock provides inheritance
class RoundsBlock implements IRuntimeBlock {
  constructor(private rounds: number = 3) {}
  
  inherit(): IMetricInheritance {
    return new RoundsMetricInheritance(this.rounds);
  }
}

// Inheritance applied
const composer = new MetricComposer(baseMetrics);
const inheritanceStack = [new RoundsMetricInheritance(3)];
const finalMetrics = composer.compose(inheritanceStack);
```

#### 3. Final Composed Metrics
```typescript
// Result after inheritance
const finalMetrics = [
  {
    sourceId: "pushups",
    effort: "Push-ups",
    values: [{ type: "repetitions", value: 30, unit: "reps" }] // 10 * 3 rounds
  },
  {
    sourceId: "squats", 
    effort: "Squats",
    values: [
      { type: "repetitions", value: 45, unit: "reps" }, // 15 * 3 rounds
      { type: "resistance", value: 100, unit: "lbs" }   // unchanged
    ]
  }
];
```

## Example 2: Progressive Loading Workout

### Workout Structure
```
4 Rounds (Progressive +10lbs each round)
  5 Deadlifts @ 135lbs (base weight)
```

### Implementation
```typescript
class ProgressiveRoundsBlock implements IRuntimeBlock {
  constructor(
    private rounds: number = 4,
    private increment: number = 10,
    private currentRound: number = 1
  ) {}
  
  inherit(): IMetricInheritance {
    // Chain multiple inheritance rules
    return new ChainedInheritance([
      new RoundsMetricInheritance(this.rounds),
      new ProgressiveResistanceInheritance(this.increment, this.currentRound)
    ]);
  }
}
```

### Chained Inheritance Implementation
```typescript
class ChainedInheritance implements IMetricInheritance {
  constructor(private inheritances: IMetricInheritance[]) {}
  
  compose(metric: RuntimeMetric): void {
    // Apply each inheritance rule in sequence
    for (const inheritance of this.inheritances) {
      inheritance.compose(metric);
    }
  }
}
```

### Results by Round
```typescript
// Round 1: Base + 0 increment
{ type: "repetitions", value: 5, unit: "reps" }
{ type: "resistance", value: 135, unit: "lbs" }

// Round 2: Base + 10lbs increment  
{ type: "repetitions", value: 5, unit: "reps" }
{ type: "resistance", value: 145, unit: "lbs" }

// Round 3: Base + 20lbs increment
{ type: "repetitions", value: 5, unit: "reps" }
{ type: "resistance", value: 155, unit: "lbs" }

// Round 4: Base + 30lbs increment
{ type: "repetitions", value: 5, unit: "reps" }
{ type: "resistance", value: 165, unit: "lbs" }

// Total after all rounds
{ type: "repetitions", value: 20, unit: "reps" }
{ type: "resistance", value: 600, unit: "lbs" } // Total weight moved
```

## Example 3: Nested Block Structure

### Workout Structure
```
3 Rounds
  2 Sets
    8 Pull-ups
    12 Dips
  Rest 2:00
```

### Inheritance Chain
```typescript
// Parent: RoundsBlock (3 rounds)
// Child: SetsBlock (2 sets)  
// Grandchild: ExerciseBlocks (Pull-ups, Dips)

const inheritanceStack = [
  new RoundsMetricInheritance(3),  // From RoundsBlock
  new SetsMetricInheritance(2)     // From SetsBlock
];

// Pull-ups: 8 reps * 2 sets * 3 rounds = 48 total reps
// Dips: 12 reps * 2 sets * 3 rounds = 72 total reps
```

## Example 4: Time-Based Inheritance

### Workout Structure
```
AMRAP 15:00 (As Many Rounds As Possible)
  5 Burpees
  10 Air Squats
  15 Sit-ups
```

### Time-Based Inheritance
```typescript
class AMRAPBlock implements IRuntimeBlock {
  constructor(
    private duration: number = 15 * 60 * 1000, // 15 minutes in ms
    private estimatedRoundTime: number = 3 * 60 * 1000 // 3 minutes per round
  ) {}
  
  inherit(): IMetricInheritance {
    const estimatedRounds = Math.floor(this.duration / this.estimatedRoundTime);
    return new EstimatedRoundsInheritance(estimatedRounds);
  }
}

class EstimatedRoundsInheritance implements IMetricInheritance {
  constructor(private estimatedRounds: number) {}
  
  compose(metric: RuntimeMetric): void {
    for (const value of metric.values) {
      if (value.type === "repetitions") {
        value.value *= this.estimatedRounds;
        // Add metadata about estimation
        metric.sourceId += "_estimated";
      }
    }
  }
}
```

## Example 5: Custom Scaling Inheritance

### Workout Structure
```
Scaled Workout (70% intensity)
  10 Push-ups (scaled to knee push-ups)
  20 Squats @ 50lbs (scaled from 75lbs)
```

### Scaling Implementation
```typescript
class ScaledWorkoutInheritance implements IMetricInheritance {
  constructor(private scaleFactor: number = 0.7) {}
  
  compose(metric: RuntimeMetric): void {
    for (const value of metric.values) {
      if (value.type === "resistance") {
        value.value *= this.scaleFactor;
        value.unit += "_scaled";
      }
      // Repetitions might stay the same for scaled movements
    }
    
    // Add scaling info to effort name
    if (metric.effort && !metric.effort.includes("(scaled)")) {
      metric.effort += " (scaled)";
    }
  }
}
```

## Testing Inheritance Patterns

### Unit Test Example
```typescript
test("should apply complex inheritance chain", () => {
  const baseMetrics = [{
    sourceId: "exercise",
    effort: "Squats",
    values: [
      { type: "repetitions", value: 10, unit: "reps" },
      { type: "resistance", value: 100, unit: "lbs" }
    ]
  }];
  
  const composer = new MetricComposer(baseMetrics);
  const inheritanceStack = [
    new RoundsMetricInheritance(3),
    new ProgressiveResistanceInheritance(5, 2),
    new ScaledWorkoutInheritance(0.8)
  ];
  
  const result = composer.compose(inheritanceStack);
  
  // 10 reps * 3 rounds = 30 reps
  expect(result[0].values[0].value).toBe(30);
  
  // 100lbs + (5 * (2-1)) = 105lbs, then * 0.8 = 84lbs
  expect(result[0].values[1].value).toBe(84);
  expect(result[0].values[1].unit).toBe("lbs_scaled");
  expect(result[0].effort).toBe("Squats (scaled)");
});
```

## Benefits of This Approach

1. **Composable**: Multiple inheritance rules can be combined
2. **Testable**: Each rule can be tested independently  
3. **Flexible**: New patterns can be added without changing existing code
4. **Immutable**: Original metrics are preserved
5. **Traceable**: Each transformation is explicit and debuggable

## Related Documents

- [Implementation Status](./metric-inheritance-implementation-status.md)
- [JIT Compiler Design](../Core/Compiler/JitCompiler.md)
