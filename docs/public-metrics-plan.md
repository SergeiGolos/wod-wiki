# Technical Design: Implementing the Fitness Projection System

## 1.0 Executive Summary

This document provides a detailed technical specification for implementing the three-layered fitness projection architecture. It serves as an engineering guide, overlaying the proposed architectural changes onto the existing WOD Wiki codebase. The plan details modifications to core runtime components, the introduction of new services for data lookup and analysis, and a concrete data flow from raw collection to analytical insight.

The core of this plan involves:
-   Enriching the `RuntimeMetric` data structure to include essential timing and contextual information.
-   Refactoring runtime strategies and behaviors to collaboratively assemble and emit these enriched metrics.
-   Developing a new, extensible projection layer to consume these metrics and produce a variety of analytical results.

Adherence to this specification will result in a clean separation of concerns between data collection and data analysis, enabling robust, scalable, and extensible fitness analytics.

## 2.0 Core Component Modification

This section details the required changes to existing runtime files and data structures.

### 2.1 Data Structure Evolution (`src/runtime/RuntimeMetric.ts`)

The existing data structures must be updated to support the new architecture, using the established `MetricValue` as the base unit of measurement.

*   **Action**: Modify the `RuntimeMetric` interface in `src/runtime/RuntimeMetric.ts` to include `exerciseId` and `timeSpans`. A new `TimeSpan` type will also be added.
*   **New Definition in `src/runtime/RuntimeMetric.ts`**:
    ```typescript
    // Existing type in this file
    export type MetricValue = {
      type: "repetitions" | "resistance" | "distance" | "timestamp" | "rounds" | "time" | "calories" | "action" | "effort";
      value: number | undefined;
      unit: string;
    };

    // New type to be added
    export interface TimeSpan {
      start: Date;
      stop: Date;
    }

    // Modified interface in this file
    export interface RuntimeMetric {
      /** The ID of the ExerciseDefinition this metric relates to. */
      exerciseId: string;
      /** An array of raw measurements using the existing MetricValue type. */
      values: MetricValue[];
      /** The time spans during which the values were recorded. */
      timeSpans: TimeSpan[];
    }
    ```

### 2.2 `ExerciseDefinitionService` Implementation

This new service will act as the centralized repository for exercise context.

*   **Action**: Create a new file `src/services/ExerciseDefinitionService.ts`.
*   **Implementation**:
    ```typescript
    import { Exercise } from '../exercise';
    // Assume a utility exists to load JSON files from a directory.
    import { loadJsonFiles } from '../utils/fileLoader';

    export class ExerciseDefinitionService {
      private static instance: ExerciseDefinitionService;
      private definitions: Map<string, Exercise> = new Map();

      private constructor(jsonDirectoryPath: string) {
        const exercises = loadJsonFiles<Exercise>(jsonDirectoryPath);
        // Assuming the exercise JSON files have an 'id' property
        exercises.forEach(ex => this.definitions.set(ex.id, ex));
      }

      public static getInstance(path?: string): ExerciseDefinitionService {
        if (!ExerciseDefinitionService.instance) {
          if (!path) throw new Error("Path must be provided on first instantiation.");
          ExerciseDefinitionService.instance = new ExerciseDefinitionService(path);
        }
        return ExerciseDefinitionService.instance;
      }

      public findById(exerciseId: string): Exercise | undefined {
        return this.definitions.get(exerciseId);
      }
    }
    ```

### 2.3 `IBlockContext` and Strategy Refactoring

The `IBlockContext` is the key to sharing the `exerciseId` among behaviors.

*   **Files to Modify**: `src/runtime/IBlockContext.ts`, `src/runtime/BlockContext.ts`, `src/runtime/strategies.ts`.
*   **Change 1: Update `IBlockContext.ts`**:
    *   Add `readonly exerciseId: string;` to the interface.
*   **Change 2: Update `BlockContext.ts`**:
    *   Add `public readonly exerciseId: string` to the constructor parameters.
*   **Change 3: Update `RoundsStrategy` in `src/runtime/strategies.ts`**:
    *   The `compile` method must be modified to determine the `exerciseId` (e.g., from a fragment property) and pass it to the `BlockContext`.
    *   **Before**: `const context = new BlockContext(runtime, blockId);`
    *   **After**:
        ```typescript
        // In RoundsStrategy.compile()
        const exerciseId = code[0].exerciseId; // Assuming exerciseId is on the statement
        const context = new BlockContext(runtime, blockId, exerciseId);
        ```

### 2.4 `IRuntimeBehavior` Refactoring (`RoundsBehavior` Example)

This is the most critical change, where raw data is assembled.

*   **File to Modify**: `src/runtime/behaviors/RoundsBehavior.ts`.
*   **New Logic**: The `onNext` method will be refactored to assemble and emit a complete `RuntimeMetric`.
    ```typescript
    // Inside RoundsBehavior class
    
    onNext(runtime: IScriptRuntime, block: IRuntimeBlock): IRuntimeAction[] {
      this.currentRound++;
      
      // ... existing logic to update memory and emit rounds:changed event ...

      // New logic to emit a complete metric at the end of each round
      const actions: IRuntimeAction[] = [];
      const effortValues: MetricValue[] = this.collectEffortMetrics(); // Hypothetical method
      
      if (effortValues.length > 0) {
        const exerciseId = block.context.exerciseId;
        const timeSpansRef = block.context.get<TimeSpan[]>(MemoryTypeEnum.TIME_SPANS);
        
        const metric: RuntimeMetric = {
          exerciseId: exerciseId,
          values: effortValues,
          timeSpans: timeSpansRef ? timeSpansRef.get() || [] : []
        };
        
        // Reset the timer spans for the next round if applicable
        timeSpansRef?.set([]); 

        actions.push(new EmitMetricAction(metric));
      }

      if (this.isComplete()) {
        // ... existing logic to emit rounds:complete event ...
      }

      return actions;
    }
    ```

### 2.5 Introduction of `EmitMetricAction`

A new declarative action is required to handle metric emission.

*   **Action**: Create a new file `src/runtime/actions/EmitMetricAction.ts`.
*   **Implementation**:
    ```typescript
    import { IRuntimeAction } from '../IRuntimeAction';
    import { IScriptRuntime } from '../IScriptRuntime';
    import { RuntimeMetric } from '../RuntimeMetric';

    export class EmitMetricAction implements IRuntimeAction {
      public readonly type = 'emit-metric';

      constructor(public readonly metric: RuntimeMetric) {}

      do(runtime: IScriptRuntime): void {
        // Assumes runtime has a metric collection subsystem
        runtime.metrics.collect(this.metric);
      }
    }
    ```
    *This implies the `IScriptRuntime` interface will need a `metrics` property pointing to a new `MetricCollector` service.*

## 3.0 New Component Development: The Projection Layer

This section details the creation of the new services responsible for analysis.

### 3.1 `AnalysisService` and `IProjectionEngine`

*   **Action**: Create `src/analytics/IProjectionEngine.ts` and `src/analytics/AnalysisService.ts`.
*   **`IProjectionEngine.ts`**:
    ```typescript
    export interface IProjectionEngine {
      readonly name: string;
      calculate(metrics: RuntimeMetric[], definition: Exercise): ProjectionResult[];
    }
    ```
*   **`AnalysisService.ts`**:
    ```typescript
    export class AnalysisService {
      private engines: IProjectionEngine[] = [];
      private exerciseService = ExerciseDefinitionService.getInstance();

      public registerEngine(engine: IProjectionEngine): void {
        this.engines.push(engine);
      }

      public runAllProjections(metrics: RuntimeMetric[]): ProjectionResult[] {
        const results: ProjectionResult[] = [];
        const definition = this.exerciseService.findById(metrics[0]?.exerciseId);

        if (!definition) return [];

        for (const engine of this.engines) {
          results.push(...engine.calculate(metrics, definition));
        }
        return results;
      }
    }
    ```

### 3.2 Example Engine: `VolumeProjectionEngine`

*   **Action**: Create `src/analytics/engines/VolumeProjectionEngine.ts`.
*   **Implementation**:
    ```typescript
    export class VolumeProjectionEngine implements IProjectionEngine {
      public readonly name = "VolumeProjectionEngine";

      calculate(metrics: RuntimeMetric[], definition: Exercise): ProjectionResult[] {
        let totalVolume = 0;
        const allSpans = metrics.flatMap(m => m.timeSpans);
        if (allSpans.length === 0) return [];

        for (const metric of metrics) {
          const reps = metric.values.find(v => v.type === 'reps')?.value || 0;
          const weight = metric.values.find(v => v.type === 'weight')?.value || 0;
          totalVolume += reps * weight;
        }

        const startTime = allSpans[0].start;
        const endTime = allSpans[allSpans.length - 1].stop;

        return [{
          name: "Total Volume",
          value: totalVolume,
          unit: "kg", // Or based on metric unit
          timeSpan: { start: startTime, stop: endTime }
        }];
      }
    }
    ```

## 4.0 Data Flow and Integration Points

The end-to-end data flow will be as follows:

1.  **Configuration**: An `EffortStrategy` or `RoundsStrategy` compiles a workout statement, extracts the `exerciseId`, and creates a `RuntimeBlock` with a `BlockContext` containing this ID.
2.  **Execution**: As the block executes, `TimerBehavior` records `TimeSpan`s into context memory. A `RoundsBehavior` tracks reps.
3.  **Collection**: Upon completion of a set, the `RoundsBehavior`'s `onNext` method is triggered. It reads the `exerciseId` from its context, reads the `TimeSpan` data from memory, and returns an `EmitMetricAction` containing a complete `RuntimeMetric` object.
4.  **Emission**: The `IScriptRuntime` executes the `EmitMetricAction`, which passes the `RuntimeMetric` to a central `MetricCollector` service.
5.  **Analysis**: After the workout, the array of collected `RuntimeMetric`s is passed to the `AnalysisService`.
6.  **Projection**: The `AnalysisService` retrieves the correct `ExerciseDefinition` and invokes all registered projection engines (`VolumeProjectionEngine`, etc.).
7.  **Result**: The service aggregates the `ProjectionResult` objects from all engines and returns them to the caller (e.g., a UI layer or API endpoint).

This detailed plan provides a concrete path forward for implementing a sophisticated, multi-layered analytics system within the existing WOD Wiki runtime architecture.