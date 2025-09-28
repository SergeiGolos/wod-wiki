# Data Model: Children Groups for Workout Statement Hierarchy

## Core Entities

### ICodeStatement (Modified)
**Purpose**: Represents a parsed workout statement with grouped child references
**Location**: `src/CodeStatement.ts`

**Fields**:
- `id: number` - Unique identifier for the statement
- `parent?: number` - Optional parent statement ID
- `children: number[][]` - **MODIFIED**: Grouped child statement references
- `fragments: ICodeFragment[]` - Associated code fragments
- `isLeaf?: boolean` - Whether this is a leaf node in hierarchy
- `meta: CodeMetadata` - Parsing metadata (position, line, etc.)

**Key Changes**:
- `children` type changed from `number[]` to `number[][]`
- Each array in `children` represents a logical group
- Consecutive compose fragments grouped together
- Individual fragments remain as single-element arrays

### LapFragment (Existing, Reference)
**Purpose**: Represents lap type indicators in workout syntax
**Fields**:
- `fragmentType: FragmentType.Lap` - Fragment type identifier
- `lapType: 'compose' | 'round' | 'repeat'` - Type of lap fragment
- `symbol: string` - Source symbol ("+", "-", or "")
- `meta: CodeMetadata` - Parsing position information

## Relationships

### Parent-Child Hierarchy
```
Parent Statement (children: number[][])
├── Group 1: [childId1] (round/repeat fragments)
├── Group 2: [childId2] (round/repeat fragments)  
├── Group 3: [childId3, childId4] (consecutive compose fragments)
└── Group 4: [childId5] (round/repeat fragments)
```

### Fragment-to-Group Mapping
- **Round fragments** (`"-"`, `lapType: 'round'`) → Individual group `[childId]`
- **Repeat fragments** (no prefix, `lapType: 'repeat'`) → Individual group `[childId]`
- **Compose fragments** (`"+"`, `lapType: 'compose'`) → Consecutive grouping `[childId1, childId2, ...]`

## Data Validation Rules

### Grouping Rules (from FR-002, FR-003)
1. **Consecutive Compose Grouping**: All consecutive compose lap fragments MUST be grouped into a single array
2. **Individual Wrapping**: Round and repeat fragments MUST be placed as single-element arrays
3. **Order Preservation**: Sequential order of child groups MUST match source order (FR-005)
4. **Parent-Child Integrity**: All child IDs in groups MUST reference valid statements with matching parent ID (FR-004)

### Type Constraints
1. `children` MUST be an array of number arrays (`number[][]`)
2. Each group array MUST contain at least one child ID (`number[]` with length ≥ 1)
3. Child IDs MUST be unique across all groups within a parent
4. Child IDs MUST be positive integers matching statement IDs

## State Transitions

### Parsing Flow
1. **Initial State**: Empty statement with `children: []`
2. **Child Discovery**: Parser identifies child statements and their lap fragments
3. **Relationship Building**: Parent-child relationships established with flat array
4. **Grouping Phase**: Consecutive compose fragments grouped, others wrapped individually
5. **Final State**: Grouped children structure `number[][]`

### Grouping Algorithm
```typescript
Input: childStatements with lapFragments
Process: 
  1. Iterate through children in sequential order
  2. For each child:
     - If lapFragment is 'compose' and previous was 'compose': Add to current group
     - If lapFragment is 'compose' and previous was not 'compose': Start new group
     - If lapFragment is not 'compose': Create single-element group
Output: children: number[][]
```

## Migration Impact

### Interface Consumers
All code accessing `statement.children` must be updated to handle `number[][]`:

**Before**:
```typescript
statement.children.forEach(childId => processChild(childId))
```

**After**:
```typescript
statement.children.forEach(group => 
  group.forEach(childId => processChild(childId))
);
```

### Common Access Patterns
1. **Flattened access**: `statement.children.flat()` for all child IDs
2. **Group iteration**: `statement.children.forEach(group => ...)` for group processing
3. **First child**: `statement.children[0]?.[0]` for first child ID
4. **All children count**: `statement.children.flat().length` for total count

## Testing Implications

### Test Data Examples
```typescript
// Mixed fragments: "- child1, child2, + child3, + child4, child5"
expectedChildren: [[1], [2], [3, 4], [5]]

// All compose: "+ child1, + child2, + child3"  
expectedChildren: [[1, 2, 3]]

// All individual: "- child1, child2, - child3"
expectedChildren: [[1], [2], [3]]
```

### Validation Points
1. Group structure matches lap fragment patterns
2. Sequential order preserved in groups
3. No duplicate child IDs across groups
4. All child IDs reference valid statements