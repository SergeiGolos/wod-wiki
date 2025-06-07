# CodeFragment Interface Documentation

## Description
Base interface for all code fragments parsed from workout scripts. Fragments represent the smallest meaningful units (e.g., time, reps, effort, distance) and are used to build up statements and metrics in the parsing and runtime pipeline.

## Original Location
`src/core/CodeFragment.ts`

## Properties
- `type: string` — Legacy string identifier for the fragment type
- `fragmentType: FragmentType` — Enum value for the fragment type (preferred)
- `meta?: CodeMetadata` — Optional metadata (source position, etc.)

## FragmentType Enum
- `Timer`, `Rep`, `Effort`, `Distance`, `Rounds`, `Action`, `Increment`, `Lap`, `Text`, `Resistance`

## Usage
All fragment classes (e.g., `TimerFragment`, `RepFragment`) implement this interface.

## Relationships
- Implemented by: [[TimerFragment]], [[RepFragment]], [[EffortFragment]], [[DistanceFragment]], [[RoundsFragment]], [[ActionFragment]], [[IncrementFragment]], [[LapFragment]], [[TextFragment]], [[ResistanceFragment]]
- Used in: [[JitStatement]], [[CodeStatement]]
- Consumed by: [[FragmentCompilationManager]], [[IFragmentCompilationStrategy]]
