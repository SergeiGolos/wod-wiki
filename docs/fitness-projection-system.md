# Fitness Projection System

## Overview

The Fitness Projection System is a three-layered architecture for collecting, contextualizing, and analyzing workout metrics. It provides extensible analytics capabilities while maintaining a clean separation of concerns between data collection and analysis.

## Architecture

### Layer 1: Data Collection (`RuntimeMetric`)

The foundation of the system is the enriched `RuntimeMetric` data structure:

```typescript
export interface RuntimeMetric {
  /** The ID of the ExerciseDefinition this metric relates to. */
  exerciseId: string;
  /** Array of metric values (reps, distance, etc.) */
  values: MetricValue[];
  /** The time spans during which the values were recorded. */
  timeSpans: TimeSpan[];
}

export interface TimeSpan {
  start: Date;
  stop: Date;
}

export type MetricValue = {
  type: "repetitions" | "resistance" | "distance" | "timestamp" | "rounds" | "time" | "calories" | "action" | "effort";
  value: number | undefined;
  unit: string;
};
```

#### Metric Collection Flow

1. **Context Creation**: Strategies create `BlockContext` with an `exerciseId`
2. **Execution**: Behaviors track values and time spans during workout execution
3. **Emission**: Behaviors emit complete `RuntimeMetric` objects via `EmitMetricAction`
4. **Storage**: The `MetricCollector` service stores metrics for later analysis

### Layer 2: Contextual Framework (`ExerciseDefinitionService`)

The `ExerciseDefinitionService` provides a centralized repository for exercise metadata:

```typescript
import { ExerciseDefinitionService } from '@/services';

// Initialize with exercise definitions
const service = ExerciseDefinitionService.getInstance(exercises);

// Look up exercise context
const exercise = service.findById('bench-press');
```

### Layer 3: Analytical Projections

The projection layer processes raw metrics and context to produce insights:

```typescript
import { AnalysisService, VolumeProjectionEngine } from '@/analytics';

// Set up the analysis service
const analysisService = new AnalysisService();
analysisService.setExerciseService(exerciseService);

// Register projection engines
analysisService.registerEngine(new VolumeProjectionEngine());

// Run projections on collected metrics
const results = analysisService.runAllProjections(runtime.metrics.getMetrics());
```

## Usage Examples

### Example 1: Basic Setup

```typescript
import { ScriptRuntime } from '@/runtime';
import { AnalysisService, VolumeProjectionEngine } from '@/analytics';
import { ExerciseDefinitionService } from '@/services';

// Initialize exercise definitions
const exercises = [...]; // Load from JSON
const exerciseService = ExerciseDefinitionService.getInstance(exercises);

// Create runtime with metrics collection
const runtime = new ScriptRuntime(script, compiler);

// Set up analysis
const analysisService = new AnalysisService();
analysisService.setExerciseService(exerciseService);
analysisService.registerEngine(new VolumeProjectionEngine());

// After workout execution
const results = analysisService.runAllProjections(
  runtime.metrics.getMetrics()
);
```

### Example 2: Custom Projection Engine

```typescript
import { IProjectionEngine, ProjectionResult } from '@/analytics';
import { RuntimeMetric } from '@/runtime/RuntimeMetric';
import { Exercise } from '@/exercise';

export class PowerProjectionEngine implements IProjectionEngine {
  readonly name = "PowerProjectionEngine";
  
  calculate(metrics: RuntimeMetric[], definition: Exercise): ProjectionResult[] {
    // Calculate power metrics
    let totalPower = 0;
    
    for (const metric of metrics) {
      const force = metric.values.find(v => v.type === 'resistance')?.value || 0;
      const velocity = this.calculateVelocity(metric);
      totalPower += force * velocity;
    }
    
    return [{
      name: "Average Power",
      value: totalPower / metrics.length,
      unit: "watts",
      timeSpan: { /* ... */ },
    }];
  }
  
  private calculateVelocity(metric: RuntimeMetric): number {
    // Implementation...
  }
}

// Register the custom engine
analysisService.registerEngine(new PowerProjectionEngine());
```

## API Reference

### MetricCollector

```typescript
interface IMetricCollector {
  collect(metric: RuntimeMetric): void;
  getMetrics(): RuntimeMetric[];
  clear(): void;
}
```

### ExerciseDefinitionService

```typescript
class ExerciseDefinitionService {
  static getInstance(exercises?: Exercise[]): ExerciseDefinitionService;
  static reset(): void;
  findById(exerciseId: string): Exercise | undefined;
  getAllExercises(): Exercise[];
  addExercise(exercise: Exercise): void;
}
```

### AnalysisService

```typescript
class AnalysisService {
  registerEngine(engine: IProjectionEngine): void;
  setExerciseService(service: ExerciseDefinitionService): void;
  runAllProjections(metrics: RuntimeMetric[]): ProjectionResult[];
  getEngines(): IProjectionEngine[];
  clearEngines(): void;
}
```

### IProjectionEngine

```typescript
interface IProjectionEngine {
  readonly name: string;
  calculate(metrics: RuntimeMetric[], definition: Exercise): ProjectionResult[];
}
```

## Built-in Projection Engines

### VolumeProjectionEngine

Calculates total training volume (repetitions × resistance):

```typescript
import { VolumeProjectionEngine } from '@/analytics';

const engine = new VolumeProjectionEngine();
```

**Output:**
- `name`: "Total Volume"
- `value`: Sum of all reps × weight
- `unit`: "kg" (or source unit)
- `metadata`: Exercise name, total sets

## Integration with Runtime

### Strategies

All strategies (`EffortStrategy`, `TimerStrategy`, `RoundsStrategy`) now pass `exerciseId` to `BlockContext`:

```typescript
// In strategy compile method
const exerciseId = (code[0] as any)?.exerciseId || '';
const context = new BlockContext(runtime, blockId, exerciseId);
```

### Behaviors

Behaviors can emit metrics using the `EmitMetricAction`:

```typescript
import { EmitMetricAction } from '@/runtime/actions/EmitMetricAction';

// In behavior's onNext method
const metric: RuntimeMetric = {
  exerciseId: block.context.exerciseId,
  values: effortValues,
  timeSpans: timeSpansRef?.get() || [],
};

return [new EmitMetricAction(metric)];
```

### Runtime Access

The `IScriptRuntime` interface now includes a metrics collector:

```typescript
interface IScriptRuntime {
  // ... existing properties
  readonly metrics?: IMetricCollector;
}
```

## Testing

Comprehensive tests are provided for all components:

- `src/runtime/MetricCollector.test.ts`
- `src/services/ExerciseDefinitionService.test.ts`
- `src/analytics/AnalysisService.test.ts`
- `src/analytics/engines/VolumeProjectionEngine.test.ts`

Run tests with:
```bash
npm run test:unit
```

## Future Extensions

The projection system is designed to be extensible. Potential future engines include:

- **PowerProjectionEngine**: Calculate average/peak power output
- **IntensityProjectionEngine**: Analyze workout intensity patterns
- **FatigueProjectionEngine**: Track fatigue accumulation
- **VelocityProjectionEngine**: Analyze movement velocity
- **EnduranceProjectionEngine**: Calculate endurance metrics

## Related Documentation

- [Technical Design: Implementing the Fitness Projection System](./public-metrics-plan.md)
- [Workout Assessment Metrics Proposal](./workout-assessment-metrics-proposal.md)
