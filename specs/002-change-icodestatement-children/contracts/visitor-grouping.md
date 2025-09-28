# Visitor Contract: MdTimerInterpreter Grouping Logic

## Method Contract

### wodMarkdown() Modification
**Purpose**: Group consecutive compose lap fragments in children arrays
**Location**: `src/parser/timer.visitor.ts`

```typescript
wodMarkdown(ctx: any): ICodeStatement[] {
  // ... existing logic for parsing and parent-child relationships
  
  // NEW: Group children by lap fragment types
  for (let block of blocks) {
    if (block.children.length > 0) {
      block.children = this.groupChildrenByLapFragments(block.children, blocks);
    }
  }
  
  return blocks;
}
```

## Grouping Algorithm Contract

### groupChildrenByLapFragments() (New Method)
```typescript
private groupChildrenByLapFragments(
  childIds: number[], 
  allBlocks: ICodeStatement[]
): number[][] {
  // Input: Array of child statement IDs
  // Output: Grouped arrays based on lap fragment types
  // Contract: Consecutive compose fragments grouped, others individual
}
```

### Algorithm Steps
1. **Initialize**: Empty groups array and current group
2. **Iterate**: Process each child ID in sequential order
3. **Analyze**: Check child's lap fragment type
4. **Group Logic**:
   - If `compose` and previous was `compose`: Add to current group
   - If `compose` and previous was not `compose`: Start new group with this child
   - If not `compose`: Finish current group (if any), add single-element group
5. **Finalize**: Add any remaining group to groups array

### Lap Fragment Detection Contract
```typescript
private getChildLapFragmentType(
  childId: number, 
  allBlocks: ICodeStatement[]
): 'compose' | 'round' | 'repeat' {
  const child = allBlocks.find(block => block.id === childId);
  const lapFragments = child.fragments.filter(f => f.fragmentType === FragmentType.Lap);
  
  if (lapFragments.length === 0) return 'repeat';
  return lapFragments[0].lapType;
}
```

## Test Contracts

### Unit Test Requirements
```typescript
describe('MdTimerInterpreter grouping logic', () => {
  test('consecutive compose fragments grouped', () => {
    const input = createTestContext([
      { id: 1, lapType: 'round' },
      { id: 2, lapType: 'compose' },
      { id: 3, lapType: 'compose' },
      { id: 4, lapType: 'repeat' }
    ]);
    
    const result = interpreter.wodMarkdown(input);
    const parent = result.find(stmt => stmt.children.length > 0);
    
    expect(parent.children).toEqual([[1], [2, 3], [4]]);
  });

  test('all compose fragments in single group', () => {
    const input = createTestContext([
      { id: 1, lapType: 'compose' },
      { id: 2, lapType: 'compose' },
      { id: 3, lapType: 'compose' }
    ]);
    
    const result = interpreter.wodMarkdown(input);
    const parent = result.find(stmt => stmt.children.length > 0);
    
    expect(parent.children).toEqual([[1, 2, 3]]);
  });

  test('no compose fragments remain individual', () => {
    const input = createTestContext([
      { id: 1, lapType: 'round' },
      { id: 2, lapType: 'repeat' },
      { id: 3, lapType: 'round' }
    ]);
    
    const result = interpreter.wodMarkdown(input);
    const parent = result.find(stmt => stmt.children.length > 0);
    
    expect(parent.children).toEqual([[1], [2], [3]]);
  });
});
```

### Integration Test Contract
```typescript
describe('Parser integration with grouping', () => {
  test('end-to-end parsing with mixed lap fragments', () => {
    const workout = `
parent
  - child1 [3:00]
  child2 10x burpees
  + child3 moderate effort  
  + child4 high intensity
  child5 rest`;

    const result = parseWorkout(workout);
    const parent = result.find(stmt => stmt.fragments.some(f => f.action === 'parent'));
    
    expect(parent.children).toEqual([[1], [2], [3, 4], [5]]);
  });
});
```

## Performance Contract

### Complexity Requirements
- **Time Complexity**: O(n) where n is number of children
- **Space Complexity**: O(n) for groups array
- **No Regression**: Parsing performance should not degrade significantly

### Benchmarking
```typescript
test('grouping performance within acceptable bounds', () => {
  const largeInput = generateWorkoutWithChildren(1000);
  
  const startTime = performance.now();
  const result = parser.parse(largeInput);
  const endTime = performance.now();
  
  expect(endTime - startTime).toBeLessThan(100); // 100ms threshold
});
```

## Error Handling Contract

### Invalid Input Handling
1. **Empty Children Array**: Return empty array `[]`
2. **Missing Child Reference**: Log warning, skip invalid ID
3. **Circular References**: Detect and prevent infinite loops
4. **Invalid Lap Fragment**: Default to 'repeat' type

### Defensive Programming
```typescript
private groupChildrenByLapFragments(childIds: number[], allBlocks: ICodeStatement[]): number[][] {
  if (!childIds || childIds.length === 0) return [];
  if (!allBlocks || allBlocks.length === 0) return childIds.map(id => [id]);
  
  // ... grouping logic with null checks and error handling
}
```