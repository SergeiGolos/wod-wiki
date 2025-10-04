# Test Failure Analysis

## Overview

Currently, there are **8 failing unit tests** out of 98 total tests. The failures are concentrated in two main test files:

1. `src/parser/timer.visitor.integration.test.ts` - 4 failing tests
2. `src/parser/timer.visitor.interface.test.ts` - 4 failing tests

All failures are related to **parent-child relationships and statement grouping functionality** in the parser visitor implementation.

## Root Cause Analysis

### Primary Issue: Statement ID Mismatch

The core problem is a **mismatch between expected and actual statement IDs** in the tests.

**Expected by tests**: Sequential IDs like `1, 2, 3, 4, 5, 6`
**Actual implementation**: Character offset IDs like `10, 31, 54, 74`

This is evident in the test failure:

```javascript
// Expected by test
expect(parentStatement!.children).toEqual([[1, 2, 3, 4]]);

// Actual result from implementation
// Received: [[10, 31, 54, 74]]
```

### Secondary Issue: Parent Statement Detection

Some tests fail to find parent statements altogether:

```javascript
// Test failure: expected undefined to be defined
expect(parentStatement).toBeDefined();
```

This suggests the parent-child relationship detection logic may have issues.

## Detailed Test Failure Breakdown

### 1. Integration Test Failures (`timer.visitor.integration.test.ts`)

#### Test: "should parse and group complex workout with mixed lap fragments"
- **Input**: Complex workout with mixed lap fragments (`-`, `+`, regular)
- **Expected**: Parent statement found with children `[[1], [2], [3, 4], [5], [6]]`
- **Actual**: Parent statement is `undefined`
- **Root Cause**: Parent statement detection logic failing

#### Test: "should handle workout with only compose fragments"
- **Input**: Workout with only `+` (compose) fragments
- **Expected**: Children grouped as `[[1, 2, 3, 4]]`
- **Actual**: Children are `[[10, 31, 54, 74]]`
- **Root Cause**: ID mismatch - using character offsets instead of sequential IDs

#### Test: "should handle workout with no compose fragments"
- **Input**: Workout with no `+` fragments (only `-` and regular)
- **Expected**: Parent statement found with individual groups `[[1], [2], [3]]`
- **Actual**: Parent statement is `undefined`
- **Root Cause**: Parent statement detection logic failing

#### Test: "should maintain parent-child relationships while grouping"
- **Input**: Nested structure with parent > round > compose fragments
- **Expected**: Parent children `[[1], [2]]`, round children `[[3, 4]]`
- **Actual**: Parent children `[[9], [23, 46], [67]]`
- **Root Cause**: ID mismatch and possibly incorrect grouping logic

### 2. Interface Test Failures (`timer.visitor.interface.test.ts`)

All 4 interface tests show the same pattern:
- **Expected**: Sequential IDs like `[[1], [2], [3, 4], [5]]`
- **Actual**: Character offset IDs like `[[17], [35], [55, 75], [95]]`

## Implementation Analysis

### Current ID Assignment Logic

In `timer.visitor.ts:52`:
```javascript
block.id = block.meta.startOffset;
```

The implementation uses `startOffset` (character position in the input text) as the statement ID, while the tests expect sequential integer IDs starting from 1.

### Current Grouping Logic

The `groupChildrenByLapFragments` method (lines 259-295) exists and appears correct:
- Groups consecutive `compose` fragments together
- Keeps other fragments as individual groups
- Uses efficient Map-based O(1) lookups

### Current Parent-Child Logic

The parent-child relationship logic (lines 44-75) builds relationships based on indentation/stack depth, which should work correctly.

## Key Files Involved

1. **`src/parser/timer.visitor.ts`** - Main visitor implementation
   - Contains `groupChildrenByLapFragments()` method ✅
   - Contains parent-child relationship logic ✅
   - Uses `startOffset` for ID assignment ❌ (mismatch with tests)

2. **`src/parser/timer.visitor.integration.test.ts`** - Integration tests
   - 4 failing tests
   - Expects sequential IDs (1, 2, 3...)

3. **`src/parser/timer.visitor.interface.test.ts`** - Interface contract tests
   - 4 failing tests
   - Expects sequential IDs (1, 2, 3...)

4. **`src/CodeStatement.ts`** - Statement interface
   - Defines `children: number[][]` ✅ (correct interface for grouped children)

## Potential Solutions

### Option 1: Modify Implementation to Match Tests (Recommended)
Change the ID assignment logic to use sequential integers instead of character offsets:

```javascript
// Instead of: block.id = block.meta.startOffset;
// Use: block.id = sequentialId++;
```

### Option 2: Update Tests to Match Implementation
Modify all test expectations to use character offset IDs instead of sequential IDs.

### Option 3: Hybrid Approach
Provide both sequential IDs and character offsets, with tests using the sequential IDs.

## Implementation Recommendations

1. **Fix ID Assignment**: The most straightforward fix is to modify the visitor to assign sequential IDs starting from 1, matching the test expectations.

2. **Verify Parent Detection**: Debug why some parent statements are not being found in certain test cases.

3. **Validate Grouping Logic**: The grouping implementation appears correct but should be tested with the fixed IDs.

## Next Steps

1. Modify `timer.visitor.ts` to use sequential IDs
2. Re-run tests to verify the fix
3. Debug any remaining parent statement detection issues
4. Ensure all 8 tests pass with the corrected implementation

## Code Examples

### Current (Problematic) ID Assignment
```javascript
block.id = block.meta.startOffset; // Results in IDs like 10, 31, 54, 74
```

### Recommended Fix
```javascript
let nextId = 1;
// In the loop:
block.id = nextId++; // Results in IDs like 1, 2, 3, 4
```

### Current Grouping Logic (Correct)
```javascript
groupChildrenByLapFragments(childIds: number[], allBlocks: ICodeStatement[]): number[][] {
  // Groups consecutive compose fragments: [3, 4] -> [[3, 4]]
  // Keeps others individual: [1], [2], [5] -> [[1], [2], [5]]
}
```