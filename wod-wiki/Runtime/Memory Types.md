# Runtime Memory Types

This runtime uses four canonical memory entry types. Blocks and behaviors should only allocate these types and must not store arrays inside a single memory entry. Instead, create one entry per logical item.

## Canonical types

- span-builder
  - Purpose: Build and track the current public span for a block.
  - Visibility: public
  - Allocation: One per memory-aware block on push.

- handler
  - Purpose: Event handler registration for actions/events.
  - Visibility: private (owned by the block)
  - Allocation: One per handler; never an array.

- state
  - Purpose: Arbitrary block or behavior state (JSON-like object or primitives).
  - Visibility: private by default unless explicitly intended to be visible.
  - Allocation: One entry per state topic (e.g., "loop-state", "current-round").

- metric
  - Purpose: Exposed metric values used for inheritance and selection.
  - Visibility: public
  - Allocation: One per metric value; never an array. Prefer grouping by sourceId via multiple entries.

## Rules and patterns

- No arrays in memory entries
  - Anti-pattern: A single memory entry that holds an array of handlers or metrics.
  - Correct: Allocate a separate 'handler' or 'metric' entry per item.

- Querying memory
  - Handlers: Query type = 'handler' for this owner (or visible ancestors in the runtime where applicable).
  - Metrics: Query type = 'metric' (use visibility rules to inherit from ancestors).
  - Spans: Each block owns one 'span-builder' that drives its public result span.
  - State: Use targeted keys/types, e.g., 'loop-state', 'duration', 'current-reps-count'.

- Visibility
  - public entries are discoverable by descendants (e.g., metrics and spans).
  - private entries are internal to the owning block (e.g., handler, most state).

## Migration notes

- Previous array-based entries like 'handlers' or 'metric-entry' were removed.
- Runtime now allocates per-entry 'handler' and 'metric' instead.
- Tests and demos read 'metric' entries; 'span-builder' replaces older 'spans' label.

## Success criteria

- Blocks publish spans and metrics as public entries.
- Behaviors write events through per-entry 'handler' registrations.
- No arrays are stored in memory entries; allocations are normalized and debuggable.
