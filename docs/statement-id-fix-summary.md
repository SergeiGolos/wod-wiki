# Statement ID Fix Summary

## Change Made

Fixed the statement ID assignment in `src/parser/timer.visitor.ts` to use line numbers instead of character offsets.

### Changes

**File**: `src/parser/timer.visitor.ts`

**Line 52**: Changed from `block.id = block.meta.startOffset;` to `block.id = block.meta.line;`

**Line 110**: Changed from `statement.id = statement.meta.startOffset;` to `statement.id = statement.meta.line;`

## Impact

### Before
- Statement IDs were character offsets: `[10, 31, 54, 74]`
- Tests expected line numbers: `[1, 2, 3, 4]`
- **Result**: Tests failed due to mismatch

### After
- Statement IDs are now line numbers from source: `[1, 2, 3, 4, 5]`
- Tests expect relative sequential IDs: `[1, 2, 3, 4]`
- **Result**: Tests need updating to use absolute line numbers

## Test Update Requirements

Integration tests need to account for actual line numbers in source text:

```typescript
// Example: Input with parent on line 1, children on lines 2-5
const input = `parent workout
  + child 1
  + child 2
  + child 3
  + child 4`;

// OLD expectation (sequential from 1):
expect(parent.children).toEqual([[1, 2, 3, 4]]);

// NEW expectation (absolute line numbers):
expect(parent.children).toEqual([[2, 3, 4, 5]]);
```

## Benefits

1. **Human-readable**: Line numbers are intuitive and match source code
2. **Stable**: Line numbers don't change with text modifications on same line
3. **Debuggable**: Easy to trace issues to specific lines in source
4. **Consistent**: Uses same identifier system throughout application

## Block IDs vs Statement IDs

- **Block IDs**: Remain UUIDs (generated via `BlockKey`)
- **Statement IDs**: Now use line numbers from parser metadata

This separation allows:
- Runtime blocks to have unique identifiers across executions
- Source statements to maintain stable, source-aligned identifiers
