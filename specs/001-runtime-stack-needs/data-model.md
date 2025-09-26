# Data Model: Runtime Stack Enhancement

## Core Entities

### RuntimeStack
**Purpose**: Manages an ordered collection of runtime blocks with lifecycle management support.

**Fields**:
- `_blocks: IRuntimeBlock[]` - Internal array storage (existing)
- No additional state fields required

**Relationships**:
- Contains 0..n IRuntimeBlock instances
- Maintains stack ordering (LIFO - Last In, First Out)

**State Transitions**:
```
Empty Stack → Has Blocks (push operation)
Has Blocks → Empty Stack (pop all blocks)
Has Blocks → Has Blocks (push/pop operations)
```

**Validation Rules**:
- Stack operations must maintain LIFO ordering
- Initialization must occur before block is added to stack
- Cleanup must occur after block is removed from stack
- Graph method must return blocks in top-first order

### IRuntimeBlock (Updated Interface)
**Purpose**: Represents an executable runtime block with explicit lifecycle management.

**Required Fields**:
- `key: BlockKey` - Unique identifier for the block
- All existing IRuntimeBlock interface members
- `dispose(): void` - Required cleanup method

**Relationships**:
- Belongs to 0..1 RuntimeStack at any time
- Initialization context provided at construction time

**Lifecycle States**:
```
Created (with initialization) → Active on Stack → Removed → Disposed (by consumer)
```

**Validation Rules**:
- All blocks must implement dispose() method
- Initialization happens in constructor, not during stack operations
- Consumer must call dispose() after popping blocks from stack
- Stack operations are simplified without lifecycle method calls

## Method Signatures

### RuntimeStack Public Interface

#### Existing Methods (unchanged)
```typescript
push(block: IRuntimeBlock): void
pop(): IRuntimeBlock | undefined
get current(): IRuntimeBlock | undefined
get blocks(): readonly IRuntimeBlock[]
get blocksTopFirst(): readonly IRuntimeBlock[]
get blocksBottomFirst(): readonly IRuntimeBlock[]
get keys(): BlockKey[]
setBlocks(blocks: IRuntimeBlock[]): void
getParentBlocks(): IRuntimeBlock[]
```

#### New Methods
```typescript
graph(): IRuntimeBlock[]
```

### IRuntimeBlock Enhanced Interface

#### Optional Lifecycle Methods
```typescript
interface IRuntimeBlock {
  // ... existing interface members ...
  
  // Optional lifecycle methods (new)
  initialize?(current?: IRuntimeBlock): void;
  cleanup?(): void;
}
```

## Data Flow

### Push Operation Flow
```
1. Receive IRuntimeBlock to push (already initialized via constructor)
2. Add block to internal _blocks array
3. Log operation (existing behavior)
4. Block becomes new stack top
```

### Pop Operation Flow
```
1. Check if stack is empty
2. If empty: Return undefined
3. Remove top block from _blocks array
4. Log operation (existing behavior)
5. Return the removed block (consumer must call dispose())
```

### Consumer Disposal Flow
```
1. Pop block from stack: const block = stack.pop()
2. Use the block as needed
3. Call block.dispose() when finished
4. Handle any disposal errors appropriately
```

### Graph Operation Flow
```
1. Return copy of blocks in top-first order
2. Reuse existing blocks getter implementation
3. Top block at index 0, subsequent blocks follow
```

## Error Handling

### Error Scenarios
- **Construction Failure**: Handle at block creation time, before push
- **Disposal Failure**: Consumer responsibility to handle dispose() errors
- **Empty Stack Pop**: Return undefined (existing behavior)
- **Invalid Block**: Runtime error (existing behavior)

### Error Recovery
- Stack operations are simplified with fewer failure points
- Deterministic behavior maintained for workout execution
- Clear error boundaries between stack and lifecycle management

## Performance Characteristics

### Time Complexity
- **Push Operation**: O(1) + lifecycle method time
- **Pop Operation**: O(1) + lifecycle method time  
- **Current Access**: O(1) (unchanged)
- **Graph Generation**: O(n) where n is stack depth

### Space Complexity
- **Memory Usage**: O(n) where n is number of blocks (unchanged)
- **No Additional Storage**: Lifecycle methods don't require extra state

### Performance Constraints
- Individual stack operations: <50ms including lifecycle methods
- Stack depth: Typically 5-20 levels for workout scenarios
- Memory footprint: No significant increase over current implementation

## Breaking Changes and Migration

### Existing Code Impact
- **Breaking Changes Required**: IRuntimeBlock interface updated with required dispose() method
- **Major Version Bump**: SemVer major version increment required
- **Consumer Code Updates**: All IRuntimeBlock implementations must add dispose() method

### Migration Requirements
- **Update IRuntimeBlock Implementations**: Add dispose() method to all existing blocks
- **Update Consumer Code**: Call dispose() after popping blocks from stack
- **Constructor Updates**: Move any initialization logic to constructors
- **Testing**: Update all tests to handle new interface and disposal patterns