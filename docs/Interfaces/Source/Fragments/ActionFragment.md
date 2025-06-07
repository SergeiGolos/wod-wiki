# ActionFragment Interface Documentation

## Description
Represents an action fragment (e.g., `[rest]`, `[transition]`) parsed from a workout script. Used to specify special actions or transitions in statements.

## Original Location
`src/core/fragments/ActionFragment.ts`

## Properties
- `action: string` — The action keyword or label
- `type: string = "action"`
- `fragmentType: FragmentType.Action`
- `meta?: CodeMetadata`

## Usage
Used in: [[JitStatement]], [[CodeStatement]] for action-based statements.

## Relationships
- Implements: [[CodeFragment]]
- Used by: [[FragmentCompilationManager]], [[IFragmentCompilationStrategy]]
