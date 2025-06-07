# DistanceFragment Interface Documentation

## Description
Represents a distance fragment (e.g., `400m`, `1 mile`) parsed from a workout script. Used to specify distance-based elements in statements.

## Original Location
`src/core/fragments/DistanceFragment.ts`

## Properties
- `value: string` — Distance value (e.g., `400`)
- `units: string` — Distance units (e.g., `m`, `mile`)
- `type: string = "distance"`
- `fragmentType: FragmentType.Distance`
- `meta?: CodeMetadata`

## Usage
Used in: [[JitStatement]], [[CodeStatement]] for distance-based statements.

## Relationships
- Implements: [[CodeFragment]]
- Used by: [[FragmentCompilationManager]], [[IFragmentCompilationStrategy]]
