# RuntimeStackPanel Contract Tests

**Component**: `src/runtime-test-bench/components/RuntimeStackPanel.tsx`  
**Status**: ❌ Not Implemented  
**Test File**: `tests/contract/RuntimeStackPanel.contract.test.ts`

---

## Overview

RuntimeStackPanel displays the runtime execution stack as a hierarchical tree with color coding, icons, and hover interactions. It shows the current execution state with active/complete blocks and supports cross-panel highlighting.

---

## Test Cases

### Test 1: Renders empty state
**Given**: RuntimeStackPanel with empty blocks array  
**When**: Component rendered  
**Then**:
- Shows "No runtime stack" message
- No blocks displayed

```typescript
test('renders empty state', () => {
  render(<RuntimeStackPanel blocks={[]} />);

  expect(screen.getByText(/no runtime stack/i)).toBeInTheDocument();
});
```

### Test 2: Displays single block
**Given**: RuntimeStackPanel with 1 workout block  
**When**: Component rendered  
**Then**:
- Shows workout block with label "Workout"
- Block has correct color and icon
- Block shows as active

```typescript
test('displays single block', () => {
  const blocks: RuntimeStackBlock[] = [{
    key: 'workout-1',
    blockType: 'workout',
    label: 'Workout',
    color: '#3b82f6',
    isActive: true,
    isComplete: false,
    status: 'active',
    children: [],
    depth: 0,
    sourceIds: [1]
  }];

  render(<RuntimeStackPanel blocks={blocks} />);

  expect(screen.getByText('Workout')).toBeInTheDocument();
  expect(screen.getByText('Workout')).toHaveClass('bg-blue-500'); // or similar
});
```

### Test 3: Shows hierarchical structure
**Given**: RuntimeStackPanel with nested blocks (workout → rounds → exercise)  
**When**: Component rendered  
**Then**:
- Shows tree structure with proper indentation
- Parent-child relationships visible
- Different depths have different indentation

```typescript
test('shows hierarchical structure', () => {
  const blocks: RuntimeStackBlock[] = [
    {
      key: 'workout-1',
      blockType: 'workout',
      label: 'Workout',
      color: '#3b82f6',
      isActive: true,
      isComplete: false,
      status: 'active',
      children: ['rounds-1'],
      depth: 0,
      sourceIds: [1]
    },
    {
      key: 'rounds-1',
      blockType: 'rounds',
      label: 'Rounds x 3',
      color: '#10b981',
      isActive: false,
      isComplete: false,
      status: 'pending',
      children: ['exercise-1'],
      depth: 1,
      sourceIds: [2]
    },
    {
      key: 'exercise-1',
      blockType: 'exercise',
      label: 'Pull-ups x 10',
      color: '#f59e0b',
      isActive: false,
      isComplete: false,
      status: 'pending',
      children: [],
      depth: 2,
      sourceIds: [3]
    }
  ];

  render(<RuntimeStackPanel blocks={blocks} />);

  expect(screen.getByText('Workout')).toBeInTheDocument();
  expect(screen.getByText('Rounds x 3')).toBeInTheDocument();
  expect(screen.getByText('Pull-ups x 10')).toBeInTheDocument();
});
```

### Test 4: Highlights active block
**Given**: RuntimeStackPanel with activeBlockIndex=1  
**When**: Component rendered  
**Then**:
- Block at index 1 has active styling
- Other blocks not highlighted

```typescript
test('highlights active block', () => {
  const blocks: RuntimeStackBlock[] = [
    { key: '1', blockType: 'workout', label: 'Workout', color: '#3b82f6', isActive: false, isComplete: false, status: 'pending', children: [], depth: 0, sourceIds: [1] },
    { key: '2', blockType: 'rounds', label: 'Rounds', color: '#10b981', isActive: true, isComplete: false, status: 'active', children: [], depth: 1, sourceIds: [2] }
  ];

  render(<RuntimeStackPanel blocks={blocks} activeBlockIndex={1} />);

  const activeBlock = screen.getByText('Rounds');
  expect(activeBlock).toHaveClass('ring-2'); // or similar active styling
});
```

### Test 5: Shows highlighted block
**Given**: RuntimeStackPanel with highlightedBlockKey="rounds-1"  
**When**: Component rendered  
**Then**:
- Block with key "rounds-1" has highlight styling
- Other blocks not highlighted

```typescript
test('shows highlighted block', () => {
  const blocks: RuntimeStackBlock[] = [
    { key: 'workout-1', blockType: 'workout', label: 'Workout', color: '#3b82f6', isActive: false, isComplete: false, status: 'pending', children: [], depth: 0, sourceIds: [1] },
    { key: 'rounds-1', blockType: 'rounds', label: 'Rounds', color: '#10b981', isActive: false, isComplete: false, status: 'pending', children: [], depth: 1, sourceIds: [2] }
  ];

  render(<RuntimeStackPanel blocks={blocks} highlightedBlockKey="rounds-1" />);

  const highlightedBlock = screen.getByText('Rounds');
  expect(highlightedBlock).toHaveClass('bg-primary/20'); // or similar highlight
});
```

### Test 6: Calls onBlockHover on hover
**Given**: RuntimeStackPanel with onBlockHover handler  
**When**: User hovers over block  
**Then**:
- onBlockHover called with block key and line number

```typescript
test('calls onBlockHover on hover', () => {
  const handleHover = vi.fn();
  const blocks: RuntimeStackBlock[] = [
    { key: 'workout-1', blockType: 'workout', label: 'Workout', color: '#3b82f6', isActive: false, isComplete: false, status: 'pending', children: [], depth: 0, sourceIds: [1], lineNumber: 5 }
  ];

  render(<RuntimeStackPanel blocks={blocks} onBlockHover={handleHover} />);

  fireEvent.mouseEnter(screen.getByText('Workout'));

  expect(handleHover).toHaveBeenCalledWith('workout-1', 5);
});
```

### Test 7: Calls onBlockClick on click
**Given**: RuntimeStackPanel with onBlockClick handler  
**When**: User clicks block  
**Then**:
- onBlockClick called with block key

```typescript
test('calls onBlockClick on click', () => {
  const handleClick = vi.fn();
  const blocks: RuntimeStackBlock[] = [
    { key: 'workout-1', blockType: 'workout', label: 'Workout', color: '#3b82f6', isActive: false, isComplete: false, status: 'pending', children: [], depth: 0, sourceIds: [1] }
  ];

  render(<RuntimeStackPanel blocks={blocks} onBlockClick={handleClick} />);

  fireEvent.click(screen.getByText('Workout'));

  expect(handleClick).toHaveBeenCalledWith('workout-1');
});
```

### Test 8: Shows metrics when enabled
**Given**: RuntimeStackPanel with showMetrics=true and block with metrics  
**When**: Component rendered  
**Then**:
- Metrics displayed next to block label

```typescript
test('shows metrics when enabled', () => {
  const blocks: RuntimeStackBlock[] = [
    {
      key: 'workout-1',
      blockType: 'workout',
      label: 'Workout',
      color: '#3b82f6',
      isActive: false,
      isComplete: false,
      status: 'pending',
      children: [],
      depth: 0,
      sourceIds: [1],
      metrics: {
        duration: { value: 300, unit: 'seconds', formatted: '5:00' },
        calories: { value: 250, unit: 'kcal', formatted: '250 kcal' }
      }
    }
  ];

  render(<RuntimeStackPanel blocks={blocks} showMetrics={true} />);

  expect(screen.getByText('5:00')).toBeInTheDocument();
  expect(screen.getByText('250 kcal')).toBeInTheDocument();
});
```

### Test 9: Applies custom className
**Given**: RuntimeStackPanel with className="custom-class"  
**When**: Component rendered  
**Then**:
- Root element has custom-class

```typescript
test('applies custom className', () => {
  const { container } = render(
    <RuntimeStackPanel
      blocks={[]}
      className="custom-class"
    />
  );

  const root = container.firstChild;
  expect(root).toHaveClass('custom-class');
});
```

---

## Expected Failures

All tests above should **FAIL** before implementation because:
- RuntimeStackPanel component doesn't exist yet
- No rendering logic for hierarchical display
- No hover/click handlers
- No highlighting logic

**First passing test**: Test 1 (renders empty state)  
**Last passing test**: Test 9 (custom className)

---

## Success Criteria

- All 9 contract tests pass
- No console errors
- TypeScript strict mode passes
- Component memoized with React.memo
- Tree structure renders correctly with proper indentation
- Color coding and icons display correctly

---

**Status**: ❌ Not Implemented (tests will fail)  
**Next**: Implement RuntimeStackPanel component</content>
<parameter name="filePath">X:\wod-wiki\specs\main\contracts\RuntimeStackPanel.contract.md