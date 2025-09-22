# Fragments and Metrics System

This document explains the relationship between WodScript fragments and the metrics they generate, including composition rules and inheritance patterns.

## Overview

The WodScript system transforms parsed fragments into runtime metrics that drive workout execution and measurement. Each fragment type contributes specific metric values that can be composed and inherited throughout the workout hierarchy.

## Fragment-to-Metric Mapping

### RepFragment → repetitions metric

**Source**: [src/fragments/RepFragment.ts](../../src/fragments/RepFragment.ts)

```typescript
// Fragment structure
class RepFragment {
  readonly value?: number;      // Numeric rep count
  readonly type = "rep";        // Fragment type identifier
  readonly fragmentType = FragmentType.Rep;
}

// Generated metric
{
  type: 'repetitions',
  value: 21,                    // Actual rep count
  unit: ''                      // Empty unit for reps
}
```

**Examples**:
```
"21 Thrusters" → RepFragment(21) → {type: 'repetitions', value: 21, unit: ''}
"5 Burpees"    → RepFragment(5)  → {type: 'repetitions', value: 5, unit: ''}
```

### TimerFragment → time metric

**Source**: [src/fragments/TimerFragment.ts](../../src/fragments/TimerFragment.ts)

```typescript
// Fragment structure  
class TimerFragment {
  readonly value: number;       // Total milliseconds
  readonly days: number;        // Parsed days component
  readonly hours: number;       // Parsed hours component  
  readonly minutes: number;     // Parsed minutes component
  readonly seconds: number;     // Parsed seconds component
  readonly original: number;    // Original milliseconds
  readonly type = "duration";   // Fragment type identifier
}

// Generated metric
{
  type: 'time',
  value: 1200000,              // 20 minutes in milliseconds
  unit: 'ms'                   // Millisecond unit
}
```

**Time parsing logic**:
```typescript
// ":30" → 30 seconds → 30000ms
// "1:00" → 1 minute → 60000ms  
// "20:00" → 20 minutes → 1200000ms
// "1:30:00" → 1 hour 30 minutes → 5400000ms
```

**Examples**:
```
"20:00 AMRAP" → TimerFragment("20:00") → {type: 'time', value: 1200000, unit: 'ms'}
":30 Plank"   → TimerFragment(":30")   → {type: 'time', value: 30000, unit: 'ms'}
```

### ResistanceFragment → resistance metric

**Source**: [src/fragments/ResistanceFragment.ts](../../src/fragments/ResistanceFragment.ts)

```typescript
// Fragment structure
class ResistanceFragment {
  readonly load: string;        // Numeric load value  
  readonly units: string;       // Weight unit (lb, kg, bw)
  readonly type = "resistance"; // Fragment type identifier
}

// Generated metric
{
  type: 'resistance',
  value: 225,                   // Numeric load
  unit: 'lb'                    // Weight unit
}
```

**Examples**:
```
"Deadlifts 225lb" → ResistanceFragment("225", "lb") → {type: 'resistance', value: 225, unit: 'lb'}
"@95kg Squats"    → ResistanceFragment("95", "kg")  → {type: 'resistance', value: 95, unit: 'kg'}
"1.5bw Clean"     → ResistanceFragment("1.5", "bw") → {type: 'resistance', value: 1.5, unit: 'bw'}
```

### DistanceFragment → distance metric

**Source**: [src/fragments/DistanceFragment.ts](../../src/fragments/DistanceFragment.ts)

```typescript
// Fragment structure
class DistanceFragment {
  readonly load: string;        // Numeric distance value
  readonly units: string;       // Distance unit (m, ft, km, mile)
  readonly type = "distance";   // Fragment type identifier
}

// Generated metric
{
  type: 'distance', 
  value: 400,                   // Numeric distance
  unit: 'm'                     // Distance unit
}
```

**Examples**:
```
"400m Run"   → DistanceFragment("400", "m")   → {type: 'distance', value: 400, unit: 'm'}
"1km Row"    → DistanceFragment("1", "km")    → {type: 'distance', value: 1, unit: 'km'}
"mile Jog"   → DistanceFragment("1", "mile")  → {type: 'distance', value: 1, unit: 'mile'}
```

### RoundsFragment → rounds metric + sequence metrics

**Source**: [src/fragments/RoundsFragment.ts](../../src/fragments/RoundsFragment.ts)

```typescript
// Fragment structure
class RoundsFragment {
  readonly value: number;       // Number of rounds
  readonly count: number;       // Round count
  readonly type = "rounds";     // Fragment type identifier
}

// Generated metrics for (21-15-9)
[
  {type: 'rounds', value: 3, unit: ''},      // Number of rounds
  {type: 'repetitions', value: 21, unit: ''}, // First round reps
  {type: 'repetitions', value: 15, unit: ''}, // Second round reps  
  {type: 'repetitions', value: 9, unit: ''}   // Third round reps
]
```

**Examples**:
```
"(5) Pullups"     → RoundsFragment(5) → {type: 'rounds', value: 5, unit: ''}

"(21-15-9) Fran"  → RoundsFragment(3) + RepFragment(21) + RepFragment(15) + RepFragment(9)
                  → [{type: 'rounds', value: 3, unit: ''}, 
                     {type: 'repetitions', value: 21, unit: ''},
                     {type: 'repetitions', value: 15, unit: ''},
                     {type: 'repetitions', value: 9, unit: ''}]
```

### EffortFragment → effort identifier

**Source**: [src/fragments/EffortFragment.ts](../../src/fragments/EffortFragment.ts)

```typescript
// Fragment structure
class EffortFragment {
  readonly value: string;       // Exercise name/description
  readonly effort: string;      // Exercise identifier
  readonly type = "effort";     // Fragment type identifier
}

// Used for workout identification, not metrics
// Stored as 'effort' property on RuntimeMetric
```

**Examples**:
```
"Deadlifts"       → EffortFragment("Deadlifts")       → effort: "Deadlifts"
"Clean & Jerk"    → EffortFragment("Clean & Jerk")    → effort: "Clean & Jerk"  
"Wall Ball Shots" → EffortFragment("Wall Ball Shots") → effort: "Wall Ball Shots"
```

### LapFragment → execution flow

**Source**: [src/fragments/LapFragment.ts](../../src/fragments/LapFragment.ts)

```typescript
// Fragment structure  
class LapFragment {
  readonly trend: string;       // "+" or "-"
  readonly type = "lap";        // Fragment type identifier
}

// Controls execution flow, not direct metrics
// Affects parent-child relationships and timing
```

### ActionFragment → special behavior

**Source**: [src/fragments/ActionFragment.ts](../../src/fragments/ActionFragment.ts)

```typescript
// Fragment structure
class ActionFragment {
  readonly value: string;       // Action text
  readonly action: string;      // Action identifier
  readonly type = "action";     // Fragment type identifier
}

// Triggers special runtime behavior
// Examples: Rest periods, transitions, setup actions
```

## Metric Composition

### Single Statement Composition

A single workout statement can contain multiple fragments that combine into a composite metric:

```typescript
// Input: "5 Deadlifts 225lb"  
// Fragments: RepFragment(5) + EffortFragment("Deadlifts") + ResistanceFragment("225", "lb")
// Composite Metric:
{
  sourceId: 'statement-1',
  effort: 'Deadlifts', 
  values: [
    {type: 'repetitions', value: 5, unit: ''},
    {type: 'resistance', value: 225, unit: 'lb'}
  ]
}
```

### Complex Rep Scheme Composition  

Rep schemes generate multiple repetition metrics:

```typescript
// Input: "(21-15-9) Thrusters 95lb"
// Fragments: RoundsFragment(3) + RepFragment(21,15,9) + EffortFragment("Thrusters") + ResistanceFragment("95", "lb")  
// Composite Metric:
{
  sourceId: 'statement-1',
  effort: 'Thrusters',
  values: [
    {type: 'rounds', value: 3, unit: ''},
    {type: 'repetitions', value: 21, unit: ''},  
    {type: 'repetitions', value: 15, unit: ''},
    {type: 'repetitions', value: 9, unit: ''},
    {type: 'resistance', value: 95, unit: 'lb'}
  ]
}
```

## Metric Inheritance

### Inheritance Strategies

**Source**: [src/runtime/MetricInheritance.ts](../../src/runtime/MetricInheritance.ts)

1. **OverrideMetricInheritance**: Child metrics replace parent metrics of the same type
2. **IgnoreMetricInheritance**: Child statements ignore specified parent metric types
3. **InheritMetricInheritance**: Child statements inherit parent metrics when not specified

### Parent-Child Relationships

```typescript
// Parent statement: "(3) 20:00 AMRAP"
// Parent metrics: {type: 'rounds', value: 3}, {type: 'time', value: 1200000}

// Child statement: "5 Pullups"  
// Child metrics: {type: 'repetitions', value: 5}
// Inherited metrics: {type: 'rounds', value: 3}, {type: 'time', value: 1200000}

// Final child metric composition:
{
  sourceId: 'child-1',
  effort: 'Pullups',
  values: [
    {type: 'rounds', value: 3, unit: ''},        // Inherited from parent
    {type: 'time', value: 1200000, unit: 'ms'},  // Inherited from parent  
    {type: 'repetitions', value: 5, unit: ''}    // Child's own metric
  ]
}
```

### Complex Inheritance Example

```typescript
// Workout structure:
// (5)              ← Parent: rounds=5
//   400m Run       ← Child 1: inherits rounds=5, adds distance=400m
//   21 KB Swings 53lb ← Child 2: inherits rounds=5, adds reps=21, resistance=53lb
//   12 Pullups     ← Child 3: inherits rounds=5, adds reps=12

// Child 1 final metric:
{
  sourceId: 'child-1', 
  effort: 'Run',
  values: [
    {type: 'rounds', value: 5, unit: ''},        // Inherited
    {type: 'distance', value: 400, unit: 'm'}    // Own metric
  ]
}

// Child 2 final metric:  
{
  sourceId: 'child-2',
  effort: 'KB Swings', 
  values: [
    {type: 'rounds', value: 5, unit: ''},        // Inherited
    {type: 'repetitions', value: 21, unit: ''},  // Own metric
    {type: 'resistance', value: 53, unit: 'lb'}  // Own metric
  ]
}
```

## Compilation Process

### Fragment Compilation Manager

**Source**: [src/runtime/FragmentCompilationManager.ts](../../src/runtime/FragmentCompilationManager.ts)

The FragmentCompilationManager coordinates the conversion from fragments to metrics:

1. **Parse**: Text → Tokens → AST → Fragments
2. **Compile**: Fragments → Individual Metrics  
3. **Compose**: Combine metrics from same statement
4. **Inherit**: Apply parent metrics to children
5. **Execute**: Use final metrics for runtime behavior

### Compiler Chain

Each fragment type has a dedicated compiler:

```typescript
// Fragment compilers convert fragments to metrics
const compilers = [
  new ActionFragmentCompiler(),      // ActionFragment → special behavior
  new DistanceFragmentCompiler(),    // DistanceFragment → distance metric
  new EffortFragmentCompiler(),      // EffortFragment → effort identifier  
  new IncrementFragmentCompiler(),   // IncrementFragment → increment behavior
  new LapFragmentCompiler(),         // LapFragment → execution flow
  new RepFragmentCompiler(),         // RepFragment → repetitions metric
  new ResistanceFragmentCompiler(),  // ResistanceFragment → resistance metric
  new RoundsFragmentCompiler(),      // RoundsFragment → rounds + rep metrics
  new TextFragmentCompiler(),        // TextFragment → text content
  new TimerFragmentCompiler()        // TimerFragment → time metric
];
```

## Testing and Validation

### Fragment Compilation Tests

**Source**: [src/runtime/FragmentCompilationManager.test.ts](../../src/runtime/FragmentCompilationManager.test.ts)

Real examples showing fragment-to-metric conversion:

```typescript
it('should compile "20:00 AMRAP"', () => {
  const statements = parseWodLine('20:00 AMRAP');
  const metric = manager.compileStatementFragments(statements[0], context);
  expect(metric.effort).toBe('AMRAP');
  expect(metric.values).toEqual([{type: 'time', value: 1200000, unit: 'ms'}]);
});

it('should compile "(21-15-9) Thrusters 95lb"', () => {
  const statements = parseWodLine('(21-15-9) Thrusters 95lb');
  const metric = manager.compileStatementFragments(statements[0], context);
  expect(metric.effort).toBe('Thrusters');
  expect(metric.values).toEqual([
    {type: 'rounds', value: 3, unit: ''},
    {type: 'repetitions', value: 21, unit: ''},
    {type: 'repetitions', value: 15, unit: ''},
    {type: 'repetitions', value: 9, unit: ''},
    {type: 'resistance', value: 95, unit: 'lb'}
  ]);
});
```

### Metric Inheritance Tests

**Source**: [src/runtime/MetricInheritance.test.ts](../../src/runtime/MetricInheritance.test.ts)

Tests validating inheritance behavior across different strategies.

## See Also

- [Language Guide](./Guide.md) - Complete syntax reference
- [Quick Reference](./QuickReference.md) - Syntax cheat sheet  
- [Runtime Documentation](../runtime/Runtime.md) - Execution model
- [Metrics System](../metrics/Metrics.md) - Metric collection details
- [System Overview](../Overview.md) - High-level architecture