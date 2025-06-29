The `BlockKey` is the primary identifier for a block's context, containing all the necessary information to uniquely identify a block and its position within the execution flow. It is used to reference blocks for metrics, results, and state tracking.

## Original Location
`src/core/BlockKey.ts`

## Properties
- `TraceId`: A unique value generated every time a block is created or cloned. This allows for tracking the lineage of a block, even if it's a copy of another block.
- `BlockId`: A unique value for a block that the key is generated for. This should be required by the constructor.
- `SourceId`: A list of `ICodeStatement` IDs that compose this block. This provides a link back to the original source code that defined the block.
- `Index`: The unique entry into the blocks, representing the current position within the block's execution.
- `Children`: A list of source IDs of the child elements of the block. This is used to manage the execution of child blocks.

## Methods 
- `Round`: tracks the current round of the block based on the index and the childen count.
- `NextChild()` : returns the index and id of the next child.
- `Add(count?:number = 1)` that adds to the index.
- `toString(): string` — Returns string representation of the key
