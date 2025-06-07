# ResistanceFragment Interface Documentation

## Description
Represents a resistance/weight fragment (e.g., `50kg`, `135lb`) parsed from a workout script. Used to specify resistance or weight in statements.

## Original Location
`src/core/fragments/ResistanceFragment.ts`

## Properties
- `value: string` — Resistance value (e.g., `50`)
- `units: string` — Resistance units (e.g., `kg`, `lb`)
- `type: string = "resistance"`
- `fragmentType: FragmentType.Resistance`
- `meta?: CodeMetadata`

## Usage
Used in: [[JitStatement]], [[CodeStatement]] for resistance-based statements.

## Relationships
- Implements: [[CodeFragment]]
- Used by: [[FragmentCompilationManager]], [[IFragmentCompilationStrategy]]
