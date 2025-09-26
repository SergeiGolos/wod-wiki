# RuntimeStack API Contract

## Interface Contract: IRuntimeStack

### Method: push(block: IRuntimeBlock): void

**Description**: Adds a runtime block to the top of the stack.

**Parameters**:
- `block: IRuntimeBlock` - The block to push onto the stack (must be pre-initialized)

**Behavior Contract**:
- MUST add block to stack immediately (no initialization calls)
- MUST maintain stack ordering (LIFO)
- MUST update current block to the newly pushed block
- Block initialization must happen in constructor before push

**Error Conditions**:
- Block is null/undefined: Throw TypeError
- Block without dispose() method: TypeScript compile error

**Side Effects**:
- Stack depth increases by 1
- Previous current block becomes parent
- Console logging of operation

### Method: pop(): IRuntimeBlock | undefined

**Description**: Removes and returns the top block from the stack.

**Returns**: `IRuntimeBlock | undefined`
- The removed block if stack was not empty (consumer must dispose)
- `undefined` if stack was empty

**Behavior Contract**:
- MUST remove top block from stack immediately (no cleanup calls)
- MUST return the removed block without calling dispose()
- MUST update current block to previous block
- Consumer MUST call `dispose()` on returned block when finished

**Error Conditions**:
- Empty stack: Return `undefined` (not an error)

**Side Effects**:
- Stack depth decreases by 1 (if not empty)
- Previous parent block becomes current
- Console logging of operation

### Method: current(): IRuntimeBlock | undefined

**Description**: Returns the top block on the stack without modifying the stack.

**Returns**: `IRuntimeBlock | undefined`
- The top block if stack is not empty
- `undefined` if stack is empty

**Behavior Contract**:
- MUST return top block without side effects
- MUST not modify stack state
- MUST be idempotent

### Method: graph(): IRuntimeBlock[]

**Description**: Returns an ordered array representation of the stack.

**Returns**: `IRuntimeBlock[]`
- Array with top block at index 0
- Remaining blocks in stack order (top to bottom)
- Empty array if stack is empty

**Behavior Contract**:
- MUST return new array (not reference to internal storage)
- MUST maintain top-first ordering
- MUST be idempotent
- MUST not modify stack state

**Performance Contract**:
- Time complexity: O(n) where n is stack depth
- Space complexity: O(n) for the returned array

## Interface Contract: IRuntimeBlock (Updated)

### Required Method: dispose(): void

**Description**: Called by consumer after the block is removed from the stack to clean up resources.

**Behavior Contract**:
- MUST perform cleanup operations and resource disposal
- MUST be safe to call multiple times (idempotent)
- SHOULD complete quickly (<10ms recommended)
- Consumer MUST call this method after popping block from stack

**Error Handling**:
- Method failures are consumer's responsibility to handle
- May throw exceptions that consumer must catch
- Should not leave resources in inconsistent state

### Constructor Requirements

**Description**: Block initialization must happen in constructor.

**Behavior Contract**:
- MUST perform all initialization in constructor
- MAY accept initialization context as constructor parameters
- MUST be fully initialized before being pushed to stack
- SHOULD fail fast if initialization cannot complete

## Contract Tests Required

### RuntimeStack Tests
1. **Push operation**: Verify block added to stack without lifecycle calls
2. **Pop operation**: Verify block removed from stack without dispose calls
3. **Graph ordering**: Verify top block at index 0
4. **Empty stack handling**: Verify pop returns undefined for empty stack
5. **Stack state consistency**: Verify stack operations maintain proper state

### IRuntimeBlock Tests
1. **Constructor initialization**: Verify blocks properly initialized at creation
2. **Dispose implementation**: Verify all blocks implement required dispose method
3. **Dispose idempotency**: Verify dispose can be called multiple times safely
4. **Resource cleanup**: Verify dispose properly cleans up resources

### Integration Tests  
1. **Full lifecycle**: Constructor → push → pop → dispose cycle
2. **Consumer patterns**: Verify proper dispose calling by consumers
3. **Error scenarios**: Constructor failures and dispose failures handled properly
4. **Multiple blocks**: Complex stack operations with proper disposal