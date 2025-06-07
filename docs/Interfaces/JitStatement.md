# JitStatement Class Documentation

## Description
Represents a parsed and precompiled statement node in the Wod.Wiki pipeline. Contains fragments, children, and metadata for a single logical statement in a workout script. Used as the primary input to the JIT compilation and runtime systems.

## Original Location
`src/core/JitStatement.ts`

## Properties
- `fragments: CodeFragment[]` — Array of fragments (e.g., reps, effort, timer, etc.)
- `children: JitStatement[]` — Child statements (for groups, rounds, etc.)
- `meta?: CodeMetadata` — Optional metadata
- `id: string` — Unique identifier for the statement

## Methods
- `durations(): TimerFragment[]` — Returns all timer fragments
- `efforts(): EffortFragment[]` — Returns all effort fragments
- `repetitions(): RepFragment[]` — Returns all rep fragments
- `rounds(): RoundsFragment[]` — Returns all rounds fragments

## Usage
Used as the main node type in the parser output, JIT compilation, and runtime block creation.

## Relationships
- Contains: [[CodeFragment]]
- Used by: [[RuntimeJit]], [[FragmentCompilationManager]], [[IRuntimeBlockStrategy]]
- Parent/child: Supports hierarchical statement trees
