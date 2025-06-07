# IncrementFragment Interface Documentation

## Description
Represents an increment/decrement fragment (e.g., `^`, `-`) parsed from a workout script. Used to specify increment or decrement actions in statements.

## Original Location
`src/core/fragments/IncrementFragment.ts`

## Properties
- `image: string` — The increment symbol (e.g., `^`)
- `increment: number` — The increment value (`1` for `^`, `-1` for `-`)
- `type: string = "increment"`
- `fragmentType: FragmentType.Increment`
- `meta?: CodeMetadata`

## Usage
Used in: [[JitStatement]], [[CodeStatement]] for increment/decrement actions.

## Relationships
- Implements: [[CodeFragment]]
- Used by: [[FragmentCompilationManager]], [[IFragmentCompilationStrategy]]
