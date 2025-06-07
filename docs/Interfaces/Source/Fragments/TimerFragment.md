# TimerFragment Interface Documentation

## Description
Represents a time/duration fragment parsed from a workout script (e.g., `30s`, `1:00`, `2m`). Used to specify time-based elements in statements.

## Original Location
`src/core/fragments/TimerFragment.ts`

## Properties
- `days: number` — Days component
- `hours: number` — Hours component
- `minutes: number` — Minutes component
- `seconds: number` — Seconds component
- `original: number` — Total duration in milliseconds
- `type: string = "duration"` — Legacy type
- `fragmentType: FragmentType.Timer`
- `meta?: CodeMetadata`

## Usage
Used in: [[JitStatement]], [[CodeStatement]] for time-based statements.

## Relationships
- Implements: [[CodeFragment]]
- Used by: [[FragmentCompilationManager]], [[IFragmentCompilationStrategy]]
