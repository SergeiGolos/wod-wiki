# A Proposal for a Holistic Fitness Projection System

## Executive Summary and Introduction

The WOD Wiki runtime engine currently possesses a foundational system for capturing performance data through the `RuntimeMetric` interface. This system effectively tracks discrete, atomic data points. While this raw data is essential, it does not in itself provide a complete picture of an athlete's performance. A holistic understanding of fitness requires a second layer of context to interpret this data, and a third, extensible analysis layer to project it into a variety of meaningful insights.

This report presents a final, refined three-layered architecture for fitness analytics:

1.  **Data Collection (`RuntimeMetric`)**: A system for collecting granular, time-stamped performance data.
2.  **Contextual Framework (`ExerciseDefinition`)**: A centralized lookup service providing static, descriptive data for all known exercises.
3.  **Analytical Projections (`ProjectionResult`)**: A suite of specialized engines that process raw data and context to produce a list of generic, self-describing analytical results.

This proposal outlines a flexible and scalable framework that builds upon the existing `RuntimeMetric` system to create a powerful and future-proof analytical engine.

## Layer 1: The Data Collection Unit (`RuntimeMetric`)

The foundation of the analytics system is the `RuntimeMetric`, which captures the atomic facts of a workout performance. This layer is responsible for recording *what* was done and *when*.

*   **`MetricValue`**: Represents a single measurement, such as `{ type: "repetitions", value: 10, unit: "reps" }`.
*   **`TimeSpan`**: Represents a time segment: `{ start: Date, stop: Date }`.
*   **`RuntimeMetric` Structure**: An aggregation of metric values, their source exercise, and the time spans during which they were recorded.

    ```typescript
    export interface RuntimeMetric {
      /** The ID of the ExerciseDefinition this metric relates to. */
      exerciseId: string;
      /** Array of metric values (reps, distance, etc.). */
      values: MetricValue[];
      /** Array of time spans during which the values were recorded. */
      timeSpans: TimeSpan[];
    }
    ```

This structure ensures that every collected metric is a self-contained, meaningful unit of work, providing the necessary inputs for the analysis in Layer 3.

## Layer 2: The Contextual Framework (`ExerciseDefinition`)

To interpret the raw data from Layer 1, the system requires a **centralized lookup service** for exercise information. This service provides the essential context that raw numbers alone lack.

*   **Schema**: The definition for each exercise conforms to a standard JSON schema, including properties like `id`, `name`, `force`, `mechanic`, `equipment`, `primaryMuscles`, and `category`.
*   **Function**: This layer acts as a queryable repository. The analysis engine will use the `exerciseId` from a `RuntimeMetric` to fetch the corresponding `ExerciseDefinition` from this service.

This architecture decouples the analysis engine from the storage of exercise definitions, allowing the exercise library to grow independently.

## Layer 3: The Projection Engine and `ProjectionResult`

The final layer is a suite of specialized, analytical engines that produce insights. Instead of a single, monolithic projection, this layer is designed to be extensible. A single set of `RuntimeMetric` data can be processed by multiple different engines to generate a rich array of analytical results.

*   **Projection Engines**: Each engine is a specialized calculator (e.g., `VolumeProjectionEngine`, `PowerProjectionEngine`, `DensityProjectionEngine`). They all share a common interface:

    `calculate(metrics: RuntimeMetric[], definition: ExerciseDefinition): ProjectionResult[]`

*   **`ProjectionResult`**: The standardized, generic output of any projection engine. This design ensures that new analyses can be added in the future without altering the data structure.

    ```typescript
    /**
     * Represents a single, calculated analytical result from a projection engine.
     */
    export interface ProjectionResult {
        /** The name of the projection, e.g., "Total Volume" or "Average Power". */
        name: string;
        /** The calculated numerical value. */
        value: number;
        /** The unit of measurement, e.g., "kg", "watts", "m/s". */
        unit: string;
        /** The time period this projection applies to. */
        timeSpan: TimeSpan;
        /** For traceability, the IDs of the source metrics used in the calculation. */
        sourceMetricIds: string[];
    }
    ```

For example, feeding a `RuntimeMetric` for a set of squats into the system would yield an array of `ProjectionResult` objects, such as:
`[
  { name: "Total Volume", value: 500, unit: "kg", ... },
  { name: "Average Power", value: 250, unit: "watts", ... },
  { name: "Work Density", value: 16.67, unit: "kg/s", ... }
]`

## Conclusion and Strategic Recommendations

The path to providing users with a truly holistic and extensible view of their fitness lies in this three-layered architecture of data collection, contextualization, and specialized projection.

**Strategic Recommendations:**

1.  **Enrich `RuntimeMetric` Collection**: Refactor core behaviors to ensure that for any given set, a single `RuntimeMetric` is created containing all relevant `MetricValue` objects, the associated `TimeSpan` data, and the `exerciseId` required for contextual lookup.

2.  **Implement the `ExerciseDefinition` Service**: Build a centralized, queryable repository for `ExerciseDefinition` objects.

3.  **Develop a Suite of Projection Engines**: Instead of a single analysis function, develop a collection of specialized engine classes (e.g., `VolumeEngine`, `PowerEngine`) that each consume `RuntimeMetric` data and produce an array of `ProjectionResult` objects. This makes the analysis layer modular and extensible.

4.  **Focus on Generic `ProjectionResult` for UI**: User-facing dashboards and reports should be built to dynamically render a list of `ProjectionResult` objects. This allows the UI to automatically display new analytics as soon as a new projection engine is added to the backend, without requiring UI changes.