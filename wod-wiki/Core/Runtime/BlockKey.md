Used to uniquely identify and reference blocks for metrics, results, and state tracking.

## Original Location
`src/core/BlockKey.ts`

## Properties
- `TraceId` :  Unique Value generated every time a block is created or cloned
- BlockId: Unique value of a Block that the key is genetereted for (this should be required by the consturctor)
- `SourceId` : List of [[../ICodeStatement]] ids that compose this block.
- `Index`: The unique entry into the blocks
- `Children`: List of Source Ids of the child element of the block.

## Methods 
- `Round`: tracks the current round of the block based on the index and the childen count.
- `NextChild()` : returns the index and id of the next child.
- `Add(count?:number = 1)` that adds to the index.
- `toString(): string` — Returns string representation of the key
