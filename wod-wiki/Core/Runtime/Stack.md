The `RuntimeStack` holds the current active context of the runtime. It maintains a stack of `IRuntimeBlock` instances, which represent the current execution path. The stack is the primary mechanism for managing the block hierarchy and the overall execution flow.
## Properties

- `Blocks`: An array of `IRuntimeBlock` instances representing the current execution stack, from the root node to the current block.

## Methods

- `Keys()`: Returns an array of `BlockKey`s for each block in the stack. This provides a complete snapshot of the current execution context.
- `Current()`: Returns the `IRuntimeBlock` at the top of the stack, which is the currently executing block.
- `Push(IRuntimeBlock)`: Pushes a new `IRuntimeBlock` onto the stack. The new block becomes the `Current` block, and its `parent` property is set to the previous `Current` block.
- `Pop()`: Removes and returns the `Current` block from the stack. The previous block on the stack becomes the new `Current` block.
