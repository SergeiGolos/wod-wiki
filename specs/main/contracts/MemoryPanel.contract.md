# MemoryPanel Contract Tests

**Component**: `src/runtime-test-bench/components/MemoryPanel.tsx`  
**Status**: ❌ Not Implemented  
**Test File**: `tests/contract/MemoryPanel.contract.test.ts`

---

## Overview

MemoryPanel displays runtime memory entries in a searchable, filterable table with grouping options and value inspection. It shows memory allocations with owner information, types, and formatted values.

---

## Test Cases

### Test 1: Renders empty state
**Given**: MemoryPanel with empty entries array  
**When**: Component rendered  
**Then**:
- Shows "No memory entries" message
- No entries displayed

```typescript
test('renders empty state', () => {
  render(<MemoryPanel entries={[]} groupBy="none" />);

  expect(screen.getByText(/no memory entries/i)).toBeInTheDocument();
});
```

### Test 2: Displays single memory entry
**Given**: MemoryPanel with 1 metric entry  
**When**: Component rendered  
**Then**:
- Shows entry with label, type, and formatted value
- Owner information displayed

```typescript
test('displays single memory entry', () => {
  const entries: MemoryEntry[] = [{
    id: 'metric-1',
    ownerId: 'workout-1',
    ownerLabel: 'Workout',
    type: 'metric',
    value: 150,
    valueFormatted: '150 reps',
    label: 'Total Reps',
    isValid: true,
    isHighlighted: false
  }];

  render(<MemoryPanel entries={entries} groupBy="none" />);

  expect(screen.getByText('Total Reps')).toBeInTheDocument();
  expect(screen.getByText('150 reps')).toBeInTheDocument();
  expect(screen.getByText('Workout')).toBeInTheDocument();
});
```

### Test 3: Filters entries by text
**Given**: MemoryPanel with filterText="pull"  
**When**: Component rendered  
**Then**:
- Only shows entries containing "pull" in label or value
- Other entries hidden

```typescript
test('filters entries by text', () => {
  const entries: MemoryEntry[] = [
    {
      id: '1',
      ownerId: 'workout-1',
      type: 'metric',
      value: 10,
      valueFormatted: '10',
      label: 'Pull-ups',
      isValid: true,
      isHighlighted: false
    },
    {
      id: '2',
      ownerId: 'workout-1',
      type: 'metric',
      value: 20,
      valueFormatted: '20',
      label: 'Push-ups',
      isValid: true,
      isHighlighted: false
    }
  ];

  render(<MemoryPanel entries={entries} groupBy="none" filterText="pull" />);

  expect(screen.getByText('Pull-ups')).toBeInTheDocument();
  expect(screen.queryByText('Push-ups')).not.toBeInTheDocument();
});
```

### Test 4: Groups entries by owner
**Given**: MemoryPanel with groupBy="owner" and multiple owners  
**When**: Component rendered  
**Then**:
- Entries grouped under owner headings
- Group labels show owner names

```typescript
test('groups entries by owner', () => {
  const entries: MemoryEntry[] = [
    {
      id: '1',
      ownerId: 'workout-1',
      ownerLabel: 'Workout',
      type: 'metric',
      value: 10,
      valueFormatted: '10',
      label: 'Total Reps',
      isValid: true,
      isHighlighted: false
    },
    {
      id: '2',
      ownerId: 'rounds-1',
      ownerLabel: 'Rounds x 3',
      type: 'loop-state',
      value: 2,
      valueFormatted: '2',
      label: 'Current Round',
      isValid: true,
      isHighlighted: false
    }
  ];

  render(<MemoryPanel entries={entries} groupBy="owner" />);

  expect(screen.getByText('Workout')).toBeInTheDocument();
  expect(screen.getByText('Rounds x 3')).toBeInTheDocument();
  expect(screen.getByText('Total Reps')).toBeInTheDocument();
  expect(screen.getByText('Current Round')).toBeInTheDocument();
});
```

### Test 5: Groups entries by type
**Given**: MemoryPanel with groupBy="type" and multiple types  
**When**: Component rendered  
**Then**:
- Entries grouped under type headings
- Group labels show type names

```typescript
test('groups entries by type', () => {
  const entries: MemoryEntry[] = [
    {
      id: '1',
      ownerId: 'workout-1',
      type: 'metric',
      value: 10,
      valueFormatted: '10',
      label: 'Total Reps',
      isValid: true,
      isHighlighted: false
    },
    {
      id: '2',
      ownerId: 'workout-1',
      type: 'timer-state',
      value: 300,
      valueFormatted: '5:00',
      label: 'Timer',
      isValid: true,
      isHighlighted: false
    }
  ];

  render(<MemoryPanel entries={entries} groupBy="type" />);

  expect(screen.getByText('Metrics')).toBeInTheDocument();
  expect(screen.getByText('Timer State')).toBeInTheDocument();
});
```

### Test 6: Highlights entries
**Given**: MemoryPanel with highlightedMemoryId="metric-1"  
**When**: Component rendered  
**Then**:
- Entry with id "metric-1" has highlight styling
- Other entries not highlighted

```typescript
test('highlights entries', () => {
  const entries: MemoryEntry[] = [
    {
      id: 'metric-1',
      ownerId: 'workout-1',
      type: 'metric',
      value: 10,
      valueFormatted: '10',
      label: 'Total Reps',
      isValid: true,
      isHighlighted: false
    },
    {
      id: 'metric-2',
      ownerId: 'workout-1',
      type: 'metric',
      value: 20,
      valueFormatted: '20',
      label: 'Push-ups',
      isValid: true,
      isHighlighted: false
    }
  ];

  render(<MemoryPanel entries={entries} groupBy="none" highlightedMemoryId="metric-1" />);

  const highlightedEntry = screen.getByText('Total Reps');
  expect(highlightedEntry.closest('[data-entry-id="metric-1"]')).toHaveClass('bg-primary/20');
});
```

### Test 7: Calls onEntryHover on hover
**Given**: MemoryPanel with onEntryHover handler  
**When**: User hovers over entry  
**Then**:
- onEntryHover called with entry id and owner key

```typescript
test('calls onEntryHover on hover', () => {
  const handleHover = vi.fn();
  const entries: MemoryEntry[] = [
    {
      id: 'metric-1',
      ownerId: 'workout-1',
      type: 'metric',
      value: 10,
      valueFormatted: '10',
      label: 'Total Reps',
      isValid: true,
      isHighlighted: false
    }
  ];

  render(<MemoryPanel entries={entries} groupBy="none" onEntryHover={handleHover} />);

  fireEvent.mouseEnter(screen.getByText('Total Reps'));

  expect(handleHover).toHaveBeenCalledWith('metric-1', 'workout-1');
});
```

### Test 8: Calls onEntryClick on click
**Given**: MemoryPanel with onEntryClick handler  
**When**: User clicks entry  
**Then**:
- onEntryClick called with entry id

```typescript
test('calls onEntryClick on click', () => {
  const handleClick = vi.fn();
  const entries: MemoryEntry[] = [
    {
      id: 'metric-1',
      ownerId: 'workout-1',
      type: 'metric',
      value: 10,
      valueFormatted: '10',
      label: 'Total Reps',
      isValid: true,
      isHighlighted: false
    }
  ];

  render(<MemoryPanel entries={entries} groupBy="none" onEntryClick={handleClick} />);

  fireEvent.click(screen.getByText('Total Reps'));

  expect(handleClick).toHaveBeenCalledWith('metric-1');
});
```

### Test 9: Shows value popover on expand
**Given**: MemoryPanel with expandValues=true and complex value  
**When**: Component rendered  
**Then**:
- Complex values show in expandable popover
- Simple values show inline

```typescript
test('shows value popover on expand', () => {
  const entries: MemoryEntry[] = [
    {
      id: 'metric-1',
      ownerId: 'workout-1',
      type: 'metric',
      value: { nested: { data: 'complex' } },
      valueFormatted: '{...}',
      label: 'Complex Metric',
      isValid: true,
      isHighlighted: false
    }
  ];

  render(<MemoryPanel entries={entries} groupBy="none" expandValues={true} />);

  expect(screen.getByText('nested')).toBeInTheDocument();
  expect(screen.getByText('data')).toBeInTheDocument();
  expect(screen.getByText('complex')).toBeInTheDocument();
});
```

### Test 10: Applies custom className
**Given**: MemoryPanel with className="custom-class"  
**When**: Component rendered  
**Then**:
- Root element has custom-class

```typescript
test('applies custom className', () => {
  const { container } = render(
    <MemoryPanel
      entries={[]}
      groupBy="none"
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
- MemoryPanel component doesn't exist yet
- No filtering or grouping logic
- No table rendering
- No hover/click handlers
- No highlighting logic

**First passing test**: Test 1 (renders empty state)  
**Last passing test**: Test 10 (custom className)

---

## Success Criteria

- All 10 contract tests pass
- No console errors
- TypeScript strict mode passes
- Component memoized with React.memo
- Filtering and grouping work correctly
- Table renders with proper columns and data

---

**Status**: ❌ Not Implemented (tests will fail)  
**Next**: Implement MemoryPanel component</content>
<parameter name="filePath">X:\wod-wiki\specs\main\contracts\MemoryPanel.contract.md