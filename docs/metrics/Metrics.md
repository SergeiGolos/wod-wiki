# Metrics Collection

Metric types, composition, inheritance, and result spans.

## Types
- Effort, Reps, Resistance, Distance

## Composition & Inheritance
- Parent blocks can influence child metrics via IMetricInheritance
- MetricComposer composes and resolves metric values

## Result Spans
- ResultSpanBuilder constructs spans from runtime events

## References
- src/runtime/MetricComposer.ts
- src/runtime/MetricInheritance.ts
- src/runtime/ResultSpanBuilder.ts
- tests: src/runtime/MetricComposer.test.ts, src/runtime/MetricInheritance.test.ts
