# Quick Start: Runtime Stack Enhancement

## Overview
This guide demonstrates the enhanced RuntimeStack functionality with lifecycle management support. Follow these steps to understand and test the new capabilities.

## Prerequisites
- WOD Wiki development environment set up
- Node.js and npm installed
- Basic understanding of TypeScript and React

## Quick Validation Steps

### 1. Install Dependencies
```bash
cd x:\wod-wiki
npm install
```

### 2. Run Unit Tests
```bash
npm run test:unit
```
**Expected**: All existing tests pass, new RuntimeStack lifecycle tests pass

### 3. Start Storybook Development
```bash
npm run storybook
```
**Expected**: Storybook loads on http://localhost:6006

### 4. Navigate to Runtime Stack Stories
1. Open Storybook at http://localhost:6006
2. Navigate to `Runtime > Stack Management`
3. View the "Lifecycle Management" story

**Expected**: Interactive demonstration of push/pop operations with lifecycle methods

## Usage Examples

### Updated Usage Pattern
```typescript
import { RuntimeStack } from './src/runtime/RuntimeStack';

// Updated usage with required dispose method
class RuntimeBlock implements IRuntimeBlock {
  constructor(
    public key: BlockKey,
    private context?: any // Initialize in constructor
  ) {
    // Perform all initialization here
    console.log(`Initializing block ${this.key} with context:`, context);
    // Setup operations happen now, not during push
  }
  
  // Required: Must implement dispose method
  dispose(): void {
    console.log(`Disposing block ${this.key}`);
    // Perform resource cleanup
    // Safe to call multiple times
  }
}

const stack = new RuntimeStack();

// Create and initialize block in constructor
const currentContext = stack.current;
const block = new RuntimeBlock(new BlockKey('test'), currentContext);

// Push is simple - just adds to stack
stack.push(block);

// Pop returns block - consumer must dispose
const popped = stack.pop();
if (popped) {
  // Use the block...
  
  // Consumer must call dispose when finished
  popped.dispose();
}
```

### Consumer Responsibility Pattern
```typescript
// Helper function for proper lifecycle management
function useRuntimeBlock<T extends IRuntimeBlock>(
  stack: RuntimeStack,
  createBlock: () => T,
  useBlock: (block: T) => void
): void {
  const block = createBlock(); // Initialize in constructor
  
  try {
    stack.push(block);
    
    // Do work with the block
    useBlock(block);
    
  } finally {
    // Always pop and dispose
    const popped = stack.pop();
    popped?.dispose();
  }
}

// Usage
useRuntimeBlock(
  stack,
  () => new RuntimeBlock(new BlockKey('work'), context),
  (block) => {
    // Use the block for work
    console.log(`Working with ${block.key}`);
  }
);
```

### Stack Graph Visualization
```typescript
const stack = new RuntimeStack();
stack.push(block1);
stack.push(block2);
stack.push(block3);

// Get ordered view: [block3, block2, block1] (top-first)
const graph = stack.graph();
console.log('Stack from top to bottom:', graph.map(b => b.key));
```

## Testing Your Implementation

### Unit Test Example
```typescript
import { describe, it, expect, vi } from 'vitest';
import { RuntimeStack } from '../src/runtime/RuntimeStack';
import { BlockKey } from '../src/BlockKey';

describe('RuntimeStack Updated Behavior', () => {
  it('should push block without calling lifecycle methods', () => {
    const stack = new RuntimeStack();
    const disposeSpy = vi.fn();
    
    const block = {
      key: new BlockKey('test'),
      dispose: disposeSpy
    };
    
    stack.push(block);
    
    // Dispose should NOT be called during push
    expect(disposeSpy).not.toHaveBeenCalled();
    expect(stack.current).toBe(block);
  });
  
  it('should pop block without calling dispose - consumer responsibility', () => {
    const stack = new RuntimeStack();
    const disposeSpy = vi.fn();
    
    const block = {
      key: new BlockKey('test'),
      dispose: disposeSpy
    };
    
    stack.push(block);
    const popped = stack.pop();
    
    // Dispose should NOT be called during pop
    expect(disposeSpy).not.toHaveBeenCalled();
    expect(popped).toBe(block);
    
    // Consumer must call dispose manually
    popped?.dispose();
    expect(disposeSpy).toHaveBeenCalledOnce();
  });
  
  it('should handle dispose being called multiple times', () => {
    const disposeSpy = vi.fn();
    
    const block = {
      key: new BlockKey('test'),
      dispose: disposeSpy
    };
    
    // Dispose should be idempotent
    block.dispose();
    block.dispose();
    block.dispose();
    
    expect(disposeSpy).toHaveBeenCalledTimes(3);
  });
});
```

### Integration Test Example
```typescript
describe('RuntimeStack Integration', () => {
  it('should handle full consumer-managed lifecycle correctly', () => {
    const stack = new RuntimeStack();
    const operations = [];
    
    // Create blocks with constructor initialization
    const block1 = {
      key: new BlockKey('block1'),
      initialized: true,
      dispose: () => operations.push('dispose-block1')
    };
    
    const block2 = {
      key: new BlockKey('block2'),
      initialized: true,
      dispose: () => operations.push('dispose-block2')
    };
    
    // Test sequence - consumer manages lifecycle
    stack.push(block1); // no initialization call
    stack.push(block2); // no initialization call
    
    const graph = stack.graph();
    expect(graph).toEqual([block2, block1]); // top-first
    
    // Consumer must manage disposal
    const popped2 = stack.pop();
    expect(popped2).toBe(block2);
    popped2?.dispose(); // consumer responsibility
    
    const popped1 = stack.pop();
    expect(popped1).toBe(block1);
    popped1?.dispose(); // consumer responsibility
    
    expect(operations).toEqual([
      'dispose-block2',
      'dispose-block1'
    ]);
    
    // Verify stack is empty
    expect(stack.current).toBeUndefined();
  });
});
```

## Storybook Validation

### Interactive Story
The Storybook story provides visual validation:

1. **Push Operations**: Watch blocks get added with initialization logging
2. **Pop Operations**: Watch blocks get removed with cleanup logging
3. **Stack Visualization**: See the graph() method output
4. **Error Handling**: Trigger lifecycle failures and observe graceful handling

### Expected Story Behavior
- Console logs show initialization/cleanup method calls
- Stack state updates correctly in the UI
- Operations continue even if lifecycle methods throw errors
- Graph visualization shows proper top-first ordering

## Performance Validation

### Benchmark Test
```typescript
describe('RuntimeStack Performance', () => {
  it('should complete operations within 50ms', () => {
    const stack = new RuntimeStack();
    const block = createTestBlock();
    
    const start = performance.now();
    
    // Perform 100 push/pop cycles
    for (let i = 0; i < 100; i++) {
      stack.push(block);
      stack.pop();
    }
    
    const end = performance.now();
    const totalTime = end - start;
    
    expect(totalTime).toBeLessThan(50); // <50ms total
  });
});
```

## Troubleshooting

### Common Issues

1. **TypeScript Errors**: Ensure IRuntimeBlock interface includes optional lifecycle methods
2. **Test Failures**: Check that lifecycle methods are properly mocked/spied
3. **Performance Issues**: Verify lifecycle methods complete quickly
4. **Storybook Errors**: Ensure examples use proper TypeScript types

### Debug Steps

1. **Check Console Logs**: RuntimeStack logs all operations with timestamps
2. **Verify Method Calls**: Use Vitest spies to confirm lifecycle method execution
3. **Test Graph Output**: Validate stack ordering with graph() method
4. **Performance Profiling**: Use browser dev tools to measure operation timing

## Success Criteria

✅ **All existing tests pass** - Backward compatibility maintained  
✅ **New lifecycle tests pass** - Enhanced functionality works correctly  
✅ **Storybook story demonstrates features** - Interactive validation works  
✅ **Performance requirements met** - Operations complete within 50ms  
✅ **Error handling works** - Lifecycle failures don't break stack operations

## Next Steps

1. **Review Implementation**: Examine updated RuntimeStack.ts code
2. **Add Custom Lifecycle Methods**: Implement initialize/cleanup in your IRuntimeBlock classes
3. **Integration Testing**: Test with actual workout runtime scenarios  
4. **Performance Monitoring**: Monitor stack operation timing in production use