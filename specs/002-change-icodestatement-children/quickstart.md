# Quickstart: Testing Children Groups Implementation

## Overview
This quickstart validates the children groups functionality by testing the core grouping behavior with minimal setup.

## Prerequisites
- Node.js and npm installed
- WOD Wiki project set up locally
- Vitest testing framework available

## Quick Validation Steps

### Step 1: Verify Current Baseline
```bash
# Ensure existing tests pass before changes
npm run test:unit
```

Expected: All existing tests should pass (baseline: 45 passed, 1 failed, 4 module errors)

### Step 2: Create Test Workout Syntax
Create a test file `test-grouping.wod` with mixed lap fragments:
```
parent workout
  - round child 1 [3:00]
  regular child 2 10x burpees  
  + compose child 3 moderate effort
  + compose child 4 high intensity
  regular child 5 rest [1:00]
  + final compose child 6 cool down
```

### Step 3: Run Parsing Test
```typescript
// Quick test in browser console or test file
import { MdTimerInterpreter } from './src/parser/timer.visitor';

const parser = new MdTimerInterpreter();
const result = parser.wodMarkdown(testInput);

// Find parent statement
const parent = result.find(stmt => stmt.children?.length > 0);
console.log('Children groups:', parent.children);

// Expected output: [[1], [2], [3, 4], [5], [6]]
```

### Step 4: Verify Grouping Logic
Expected grouping for the test workout:
- `child 1` (round `-`) → Individual group `[1]` 
- `child 2` (no prefix) → Individual group `[2]`
- `child 3` and `child 4` (consecutive `+`) → Grouped `[3, 4]`
- `child 5` (no prefix) → Individual group `[5]`  
- `child 6` (compose `+` but not consecutive) → Individual group `[6]`

**Final Result**: `children: [[1], [2], [3, 4], [5], [6]]`

### Step 5: Test Interface Usage
```typescript
// Test common access patterns work with new structure
const parent = result[0]; // Assume parent is first

// Access all children (flattened)
const allChildIds = parent.children.flat(); // [1, 2, 3, 4, 5, 6]

// Access by groups
parent.children.forEach((group, index) => {
  console.log(`Group ${index}:`, group);
});

// Access first child
const firstChild = parent.children[0]?.[0]; // 1

// Check if has children
const hasChildren = parent.children.length > 0; // true
```

## Success Criteria

### Functional Validation
✅ **Consecutive compose grouping**: `+ child3, + child4` results in `[3, 4]`  
✅ **Individual wrapping**: `- child1` and `child2` result in `[1]` and `[2]`  
✅ **Order preservation**: Groups appear in source order  
✅ **Type safety**: TypeScript compilation succeeds with `number[][]`

### Integration Validation  
✅ **Parser integration**: End-to-end parsing produces expected groups
✅ **Existing functionality**: No regression in current parsing behavior
✅ **Performance**: No significant parsing performance degradation

## Troubleshooting

### Common Issues

**Issue**: `children` still shows `number[]` instead of `number[][]`
- **Cause**: Interface not updated or cached types
- **Solution**: Check `CodeStatement.ts` interface, restart TypeScript server

**Issue**: Consecutive compose fragments not grouping
- **Cause**: Lap fragment detection logic not working
- **Solution**: Debug lap fragment parsing in visitor, check fragment types

**Issue**: Order not preserved in groups  
- **Cause**: Grouping algorithm not maintaining sequence
- **Solution**: Verify iteration order in grouping logic matches source order

**Issue**: TypeScript compilation errors
- **Cause**: Consumers still expecting `number[]`  
- **Solution**: Update all `.children` access points to handle `number[][]`

### Debug Helpers

```typescript
// Debug lap fragment detection
function debugLapFragments(statement: ICodeStatement) {
  const lapFragments = statement.fragments.filter(f => f.fragmentType === FragmentType.Lap);
  console.log(`Statement ${statement.id}:`, lapFragments.map(f => f.lapType));
}

// Debug grouping input/output
function debugGrouping(childIds: number[], groups: number[][]) {
  console.log('Input children:', childIds);
  console.log('Output groups:', groups);
  console.log('Flattened check:', groups.flat());
}
```

## Quick Smoke Test

Run this complete test to validate implementation:

```typescript
describe('Children Groups Smoke Test', () => {
  it('should group consecutive compose fragments correctly', () => {
    const workout = `
parent
  - child1
  child2
  + child3  
  + child4
  child5
  + child6`;

    const result = parseWorkout(workout);
    const parent = result.find(stmt => stmt.children?.length > 0);
    
    expect(parent.children).toEqual([[1], [2], [3, 4], [5], [6]]);
    expect(parent.children.flat()).toEqual([1, 2, 3, 4, 5, 6]);
    expect(parent.children.length).toBe(5); // 5 groups
  });
});
```

**Expected Result**: Test passes, demonstrating correct grouping behavior and interface compatibility.

## Next Steps

After successful quickstart validation:
1. Run full test suite: `npm run test:unit`
2. Test in Storybook: `npm run storybook`  
3. Check TypeScript compilation: `npx tsc --noEmit`
4. Review parser stories for expected behavior demonstration

**Success Indicator**: All validation steps pass without errors, confirming the children groups functionality works as specified.