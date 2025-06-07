# RoundsFragment Interface Documentation

## Description
Represents a rounds fragment (e.g., `(3)`) parsed from a workout script. Used to specify how many rounds a group of statements should be repeated.

## Original Location
`src/core/fragments/RoundsFragment.ts`

## Properties
- `count: number` — Number of rounds
- `type: string = "rounds"`
- `fragmentType: FragmentType.Rounds`
- `meta?: CodeMetadata`

## Usage
Used in: [[JitStatement]], [[CodeStatement]] for round-based statements.

## Relationships
- Implements: [[CodeFragment]]
- Used by: [[FragmentCompilationManager]], [[IFragmentCompilationStrategy]]
