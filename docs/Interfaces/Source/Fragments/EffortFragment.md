# EffortFragment Interface Documentation

## Description
Represents an effort/exercise fragment (e.g., `pushups`, `row`) parsed from a workout script. Used to specify the type of exercise or movement.

## Original Location
`src/core/fragments/EffortFragment.ts`

## Properties
- `effort: string` — Name of the exercise or effort
- `type: string = "effort"`
- `fragmentType: FragmentType.Effort`
- `meta?: CodeMetadata`

## Usage
Used in: [[JitStatement]], [[CodeStatement]] for effort-based statements.

## Relationships
- Implements: [[CodeFragment]]
- Used by: [[FragmentCompilationManager]], [[IFragmentCompilationStrategy]]
