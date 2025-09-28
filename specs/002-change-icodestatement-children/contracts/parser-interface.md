# Parser Contract: ICodeStatement Interface

## Interface Definition

### ICodeStatement (Modified)
```typescript
export interface ICodeStatement {
  id: number;
  parent?: number;
  children: number[][]; // CHANGED from number[]
  fragments: ICodeFragment[];
  isLeaf?: boolean;
  meta: CodeMetadata;
}
```

## Contract Requirements

### Input Contract
- **Parser Input**: Workout syntax with lap fragments (`+`, `-`, or no prefix)
- **Context**: Parse tree structure with parent-child relationships
- **Preconditions**: Valid workout syntax, established parent-child relationships

### Output Contract  
- **Return**: ICodeStatement array with grouped children
- **Postconditions**: 
  - All consecutive compose fragments grouped together
  - Non-compose fragments in individual arrays
  - Sequential order preserved
  - Valid parent-child references

### Grouping Behavior Contract

#### Consecutive Compose Grouping (FR-002)
```typescript
// Input lap fragments: [round, repeat, compose, compose, repeat]
// Expected children grouping: [[id1], [id2], [id3, id4], [id5]]

test('consecutive compose fragments grouped together', () => {
  const input = `
- statement1
statement2  
+ statement3
+ statement4
statement5`;
  
  const result = parser.parse(input);
  const parent = result.find(stmt => stmt.children.length > 0);
  
  expect(parent.children).toEqual([[1], [2], [3, 4], [5]]);
});
```

#### Individual Fragment Wrapping (FR-003)
```typescript
test('round and repeat fragments as individual arrays', () => {
  const input = `
- statement1
statement2
- statement3`;
  
  const result = parser.parse(input);
  const parent = result.find(stmt => stmt.children.length > 0);
  
  expect(parent.children).toEqual([[1], [2], [3]]);
});
```

#### Order Preservation (FR-005)
```typescript
test('sequential order of child groups preserved', () => {
  const input = `
statement1
+ statement2  
+ statement3
statement4
+ statement5`;
  
  const result = parser.parse(input);
  const parent = result.find(stmt => stmt.children.length > 0);
  
  expect(parent.children).toEqual([[1], [2, 3], [4], [5]]);
});
```

## Error Conditions

### Invalid States
1. **Empty Groups**: Groups MUST contain at least one child ID
2. **Duplicate Children**: Child IDs MUST be unique across all groups
3. **Invalid References**: All child IDs MUST reference valid statements
4. **Orphaned Children**: All child statements MUST have valid parent references

### Error Handling
- **Type Safety**: TypeScript compilation enforces `number[][]` usage
- **Runtime Validation**: Parser validates group structure during creation  
- **Test Coverage**: Comprehensive tests for edge cases and error scenarios

## API Compatibility

### Consumer Updates Required
All code accessing `.children` property must handle nested arrays:

1. **Iterating all children**:
   ```typescript
   // OLD: children.forEach(id => ...)
   // NEW: children.flat().forEach(id => ...)
   ```

2. **Processing groups**:
   ```typescript
   // NEW: children.forEach(group => group.forEach(id => ...))
   ```

3. **Checking if has children**:
   ```typescript  
   // OLD: children.length > 0
   // NEW: children.length > 0 (same)
   ```

4. **Getting first child**:
   ```typescript
   // OLD: children[0] 
   // NEW: children[0]?.[0]
   ```

### Migration Safety
- TypeScript compilation will catch incompatible usages
- Tests must validate updated consumer code
- Gradual migration with comprehensive test coverage