# Statement Block Data Structures

This document describes the data structures used to represent the parsed workout definition, forming a tree of statements (`StatementNode`) composed of various parts (`StatementFragment`). These structures are primarily defined in `src/core/timer.types.ts`.

## Overview

The parser transforms the raw workout text into a tree of `StatementNode` objects. Each node represents a line or logical block in the workout definition and contains metadata and an array of `StatementFragment`s that represent the specific elements (like time, reps, exercise names) within that statement.

## `StatementNode` Interface

Represents a node in the parsed statement tree.

```typescript
export interface StatementNode {
    id: number;                 // Unique identifier for this node
    parent?: number;            // ID of the parent node (optional)
    next?: number;              // ID of the next sibling/sequential node (optional)
    rounds?: number;            // Number of rounds for repeating blocks (optional)
    children: number[];         // Array of child node IDs
    meta: SourceCodeMetadata;   // Metadata about the source code location
    fragments: StatementFragment[]; // Array of fragments composing this statement
}
```

- **`id`**: A unique number assigned during parsing.
- **`parent`**: Links to the node above it in the hierarchy (e.g., an exercise within a round).
- **`next`**: Links to the statement that logically follows this one at the same level.
- **`rounds`**: Specifies repetition count for structural nodes (e.g., `(5)` rounds).
- **`children`**: Links to nodes nested within this one (e.g., exercises within a round block).
- **`meta`**: Contains `SourceCodeMetadata` (line, offsets, columns) linking the node back to the original text.
- **`fragments`**: The ordered sequence of parsed elements that make up this statement line.

## `StatementFragment` Interface

Base interface for all parsed elements within a `StatementNode`.

```typescript
export interface StatementFragment {
    type: string;                   // Identifier for the fragment type (e.g., "timer", "rep")
    meta?: SourceCodeMetadata;      // Optional source code metadata for the fragment
    toPart: () => string;           // Function to get the string representation of the fragment
    // Specific fragment types will have additional properties
}
```

## Common Fragment Types

These are examples of types derived from `StatementFragment`, each representing a specific syntactic element:

- **`TextFragment`**: (`type: "text"`) Represents plain text or exercise names (e.g., `"Push-ups"`). Contains a `value: string` property.
- **`DurationFragment`**: (`type: "timer"` or `"increment"`) Represents time values (e.g., `:30`, `1:00`). Contains `value: number` (in milliseconds) and potentially sub-type specific details.
- **`RepFragment`**: (`type: "rep"`) Represents repetition counts (e.g., `21`, `15`). Contains `value: number`.
- **`DistanceFragment`**: (`type: "distance"`) Represents distances (e.g., `400m`, `5km`). Contains `value: number` and `unit: string`.
- **`ResistanceFragment`**: (`type: "resistance"`) Represents weights (e.g., `95lb`, `43kg`). Contains `value: number` and `unit: string`.
- **`RoundsFragment`**: (`type: "rounds"`) Represents round definitions (e.g., `(21-15-9)`, `(5)`). Contains structure detailing the rounds.
- **`LapFragment`**: (`type: "lap"`) Represents a marker to record a lap time.
- **`EffortFragment`**: (`type: "effort"`) Represents a sub-section of work, potentially containing nested fragments or linking to child `StatementNode`s.

(Note: The exact properties for each fragment type would be found in their specific class/interface definitions, typically inheriting from `StatementFragment`.)

These structures form the bridge between the user's input text and the runtime engine's execution logic.
