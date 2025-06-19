Holds the current active context of the current runtime.
## Properties

- Blocks : `IRuntimeBlock[]` Current block walking up the stack to the root node.
## Methods

- Keys(): `BlockKey[]` the keys of the current block walking up the stack to the root node.
- Current() : `IRuntimeBlock`  the top most node on the stack.
- `Push(IRuntimeBlock) : void` given a runtime block, the block is pushd onto the stack and the old `Current()` block is set as a parent of the newly pushed current block  
- `Pop(): IRuntimeBlock` pop the current object on the stack and and return it.
