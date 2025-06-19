Used to uniquely identify and reference blocks for metrics, results, and state tracking.

## Original Location
`src/core/BlockKey.ts`

## Properties
- `TraceId` :  Unique Value generated every time a block is created.
- `SourceId` : List of [[../ICodeStatement]] ids that compose this block.
- `Index`: The unique entry into the blocks
- `Round`: tracks the current round of the block

## Methods 
- `toString(): string` — Returns string representation of the key
