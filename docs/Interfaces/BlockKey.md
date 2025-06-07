# BlockKey Class Documentation

## Description
Represents a hierarchical identifier for runtime blocks in the execution tree. Used to uniquely identify and reference blocks for metrics, results, and state tracking.

## Original Location
`src/core/BlockKey.ts`

## Properties
- `fragments: BlockKeyFragment[]` — Array of block key fragments
- `toString(): string` — Returns string representation of the key

## Usage
Used throughout the runtime and metrics system to track block lineage and relationships.

## Relationships
- Built from: [[BlockKeyFragment]]
- Used by: [[IRuntimeBlock]], [[ResultSpan]], [[RuntimeMetric]]
