# RepFragment Interface Documentation

## Description
Represents a repetition count fragment (e.g., `10 reps`) parsed from a workout script. Used to specify how many times an action should be performed.

## Original Location
`src/core/fragments/RepFragment.ts`

## Properties
- `reps?: number` — Number of repetitions
- `type: string = "rep"`
- `fragmentType: FragmentType.Rep`
- `meta?: CodeMetadata`

## Usage
Used in: [[JitStatement]], [[CodeStatement]] for repetition-based statements.

## Relationships
- Implements: [[CodeFragment]]
- Used by: [[FragmentCompilationManager]], [[IFragmentCompilationStrategy]]
