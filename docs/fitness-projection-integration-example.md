# Fitness Projection System - Integration Example

This document provides a complete example of integrating the fitness projection system into a workout application.

## Complete Integration Example

```typescript
import { ScriptRuntime } from '@/runtime/ScriptRuntime';
import { JitCompiler } from '@/runtime/JitCompiler';
import { WodScript } from '@/WodScript';
import { AnalysisService, VolumeProjectionEngine } from '@/analytics';
import { ExerciseDefinitionService } from '@/services';
import { Exercise, Level, Category } from '@/exercise';

// Step 1: Initialize Exercise Definitions
const exercises: Exercise[] = [
  {
    name: 'Bench Press',
    primaryMuscles: ['chest', 'triceps'],
    secondaryMuscles: ['shoulders'],
    level: Level.intermediate,
    category: Category.strength,
    equipment: 'barbell',
    instructions: [
      'Lie on a flat bench with feet on the floor',
      'Grip the bar slightly wider than shoulder width',
      'Lower the bar to your chest',
      'Press the bar back up to starting position'
    ]
  },
  {
    name: 'Squat',
    primaryMuscles: ['quadriceps', 'glutes'],
    secondaryMuscles: ['hamstrings', 'calves'],
    level: Level.intermediate,
    category: Category.strength,
    equipment: 'barbell',
    instructions: [
      'Stand with bar on upper back',
      'Descend by bending hips and knees',
      'Maintain straight back',
      'Return to starting position'
    ]
  }
];

// Initialize the exercise service (singleton)
const exerciseService = ExerciseDefinitionService.getInstance(exercises);

// Step 2: Set Up Analysis Service
const analysisService = new AnalysisService();
analysisService.setExerciseService(exerciseService);

// Register built-in projection engines
analysisService.registerEngine(new VolumeProjectionEngine());

// Register custom projection engines if needed
// analysisService.registerEngine(new PowerProjectionEngine());
// analysisService.registerEngine(new IntensityProjectionEngine());

// Step 3: Execute Workout
const script = new WodScript(workoutCode);
const compiler = new JitCompiler(strategies);
const runtime = new ScriptRuntime(script, compiler);

// The runtime now has metrics collection enabled automatically
console.log('Metrics collector available:', runtime.metrics !== undefined);

// Execute the workout
// (In a real application, this would involve user interaction)
runtime.stack.push(/* initial block */);
// ... workout execution ...

// Step 4: Collect and Analyze Metrics
const collectedMetrics = runtime.metrics.getMetrics();
console.log(`Collected ${collectedMetrics.length} metrics`);

// Run all registered projection engines
const projectionResults = analysisService.runAllProjections(collectedMetrics);

// Step 5: Display Results
console.log('\n=== Workout Analysis ===\n');
projectionResults.forEach(result => {
  console.log(`${result.name}: ${result.value} ${result.unit}`);
  if (result.metadata) {
    console.log(`  Exercise: ${result.metadata.exerciseName}`);
    console.log(`  Sets: ${result.metadata.totalSets}`);
  }
  const duration = result.timeSpan.stop.getTime() - result.timeSpan.start.getTime();
  console.log(`  Duration: ${duration / 1000}s`);
  console.log('');
});

// Step 6: Clear metrics for next workout
runtime.metrics.clear();
```

## Example Output

```
Metrics collector available: true
Collected 6 metrics

=== Workout Analysis ===

Total Volume: 3600 kg
  Exercise: Bench Press
  Sets: 3
  Duration: 180s

Total Volume: 5400 kg
  Exercise: Squat
  Sets: 3
  Duration: 210s
```

## React Component Example

Here's how to integrate the system into a React component:

```typescript
import React, { useState, useEffect } from 'react';
import { AnalysisService, VolumeProjectionEngine, ProjectionResult } from '@/analytics';
import { ExerciseDefinitionService } from '@/services';
import { IScriptRuntime } from '@/runtime/IScriptRuntime';

interface WorkoutAnalysisProps {
  runtime: IScriptRuntime;
  exercises: Exercise[];
}

export const WorkoutAnalysis: React.FC<WorkoutAnalysisProps> = ({
  runtime,
  exercises
}) => {
  const [results, setResults] = useState<ProjectionResult[]>([]);
  const [analysisService] = useState(() => {
    const service = new AnalysisService();
    const exerciseService = ExerciseDefinitionService.getInstance(exercises);
    service.setExerciseService(exerciseService);
    service.registerEngine(new VolumeProjectionEngine());
    return service;
  });

  const analyzeWorkout = () => {
    if (!runtime.metrics) return;
    
    const metrics = runtime.metrics.getMetrics();
    const projections = analysisService.runAllProjections(metrics);
    setResults(projections);
  };

  return (
    <div className="workout-analysis">
      <button onClick={analyzeWorkout}>
        Analyze Workout
      </button>
      
      {results.length > 0 && (
        <div className="results">
          <h2>Workout Analysis</h2>
          {results.map((result, idx) => (
            <div key={idx} className="result-card">
              <h3>{result.name}</h3>
              <p className="value">
                {result.value.toFixed(2)} {result.unit}
              </p>
              {result.metadata && (
                <div className="metadata">
                  <p>Exercise: {result.metadata.exerciseName}</p>
                  <p>Sets: {result.metadata.totalSets}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
```

## Custom Projection Engine Example

Creating a custom projection engine for intensity analysis:

```typescript
import { IProjectionEngine, ProjectionResult } from '@/analytics';
import { RuntimeMetric } from '@/runtime/RuntimeMetric';
import { Exercise } from '@/exercise';

export class IntensityProjectionEngine implements IProjectionEngine {
  readonly name = "IntensityProjectionEngine";
  
  calculate(metrics: RuntimeMetric[], definition: Exercise): ProjectionResult[] {
    if (metrics.length === 0) return [];
    
    // Calculate average intensity as % of theoretical max
    let totalIntensity = 0;
    let validMetrics = 0;
    
    for (const metric of metrics) {
      const resistance = metric.values.find(v => v.type === 'resistance')?.value;
      if (typeof resistance !== 'number') continue;
      
      // Theoretical max for the exercise (could be personalized)
      const theoreticalMax = this.getTheoreticalMax(definition.name);
      const intensity = (resistance / theoreticalMax) * 100;
      
      totalIntensity += intensity;
      validMetrics++;
    }
    
    if (validMetrics === 0) return [];
    
    const avgIntensity = totalIntensity / validMetrics;
    const allSpans = metrics.flatMap(m => m.timeSpans);
    const sortedSpans = allSpans.sort((a, b) => a.start.getTime() - b.start.getTime());
    
    return [{
      name: "Average Intensity",
      value: avgIntensity,
      unit: "%1RM",
      timeSpan: {
        start: sortedSpans[0].start,
        stop: sortedSpans[sortedSpans.length - 1].stop
      },
      metadata: {
        exerciseName: definition.name,
        category: definition.category,
        level: definition.level
      }
    }];
  }
  
  private getTheoreticalMax(exerciseName: string): number {
    // In a real implementation, this would look up personalized data
    const defaults: Record<string, number> = {
      'Bench Press': 120,
      'Squat': 180,
      'Deadlift': 200,
    };
    return defaults[exerciseName] || 100;
  }
}

// Register the custom engine
analysisService.registerEngine(new IntensityProjectionEngine());
```

## Testing Integration

Example test for a complete integration:

```typescript
import { describe, test, expect, beforeEach } from 'vitest';
import { ScriptRuntime } from '@/runtime/ScriptRuntime';
import { AnalysisService, VolumeProjectionEngine } from '@/analytics';
import { ExerciseDefinitionService } from '@/services';

describe('Fitness Projection Integration', () => {
  let runtime: ScriptRuntime;
  let analysisService: AnalysisService;
  
  beforeEach(() => {
    // Set up exercise service
    ExerciseDefinitionService.reset();
    const exercises = [
      {
        name: 'Bench Press',
        primaryMuscles: [],
        secondaryMuscles: [],
        level: 'intermediate',
        category: 'strength',
        instructions: []
      }
    ];
    const exerciseService = ExerciseDefinitionService.getInstance(exercises);
    
    // Set up analysis service
    analysisService = new AnalysisService();
    analysisService.setExerciseService(exerciseService);
    analysisService.registerEngine(new VolumeProjectionEngine());
    
    // Set up runtime
    const script = new WodScript(/* ... */);
    const compiler = new JitCompiler(/* ... */);
    runtime = new ScriptRuntime(script, compiler);
  });
  
  test('should collect and analyze metrics', () => {
    // Simulate metric collection
    const metric = {
      exerciseId: 'Bench Press',
      values: [
        { type: 'repetitions', value: 10, unit: 'reps' },
        { type: 'resistance', value: 100, unit: 'kg' }
      ],
      timeSpans: [{ start: new Date(), stop: new Date() }]
    };
    
    runtime.metrics?.collect(metric);
    
    // Analyze
    const results = analysisService.runAllProjections(
      runtime.metrics?.getMetrics() || []
    );
    
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('Total Volume');
    expect(results[0].value).toBe(1000);
  });
});
```

## Best Practices

1. **Initialize Services Early**: Set up `ExerciseDefinitionService` and `AnalysisService` at application startup
2. **Register Engines Once**: Register projection engines once during initialization, not per workout
3. **Clear Metrics Between Workouts**: Always call `runtime.metrics.clear()` when starting a new workout
4. **Handle Missing Data**: Projection engines should gracefully handle missing or incomplete data
5. **Use TypeScript**: Leverage TypeScript's type system for compile-time safety
6. **Test Integration**: Write integration tests that exercise the complete flow
7. **Cache Results**: Consider caching projection results for large datasets
8. **Async Analysis**: For long-running analyses, consider making projections async

## Troubleshooting

### Metrics Not Collected
- Ensure `runtime.metrics` is available (it should be initialized automatically)
- Check that behaviors are emitting metrics via `EmitMetricAction`
- Verify that `exerciseId` is set on the `BlockContext`

### No Projection Results
- Confirm exercise definitions are loaded into `ExerciseDefinitionService`
- Check that `exerciseId` in metrics matches definition names
- Verify projection engines are registered with `AnalysisService`

### Incorrect Results
- Validate metric values are in expected units
- Check that time spans are being recorded correctly
- Ensure projection engine logic matches your requirements
