
Represents a compiled metric for a workout segment, including effort, value, and source information. Used to aggregate and report performance data during and after execution.

## Original Location
`src/core/RuntimeMetric.ts`

## Properties
- `sourceId: string` — Identifier for the source statement/block
- `effort: string` — Name of the effort/exercise (if any)
- `values: MetricValue[]` — Array of metric values (reps, distance, etc.)

## Usage
Produced by: [[FragmentCompilationManager]], [[../Compiler/IFragmentCompiler]]
Consumed by: [[../ICodeBlock]], [[ResultSpan]], metrics reporting

## Relationships
- Used by: [[ResultSpan]], [[../ICodeBlock]]
- Contains: [[MetricValue]]
