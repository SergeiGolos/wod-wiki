# LapFragment Interface Documentation

## Description
Represents a lap fragment parsed from a workout script. Used to specify lap-based elements in statements (e.g., for interval or lap counting workouts).

## Original Location
`src/core/fragments/LapFragment.ts`

## Properties
- `type: string = "lap"`
- `fragmentType: FragmentType.Lap`
- `meta?: CodeMetadata`

## Usage
Used in: [[JitStatement]], [[CodeStatement]] for lap-based statements.

## Relationships
- Implements: [[CodeFragment]]
- Used by: [[FragmentCompilationManager]], [[IFragmentCompilationStrategy]]
