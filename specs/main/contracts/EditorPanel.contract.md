# Contract: EditorPanel Component

**Component**: EditorPanel  
**Type**: React Component  
**Path**: `src/runtime-test-bench/components/EditorPanel.tsx`

---

## Contract Specification

### Purpose
Wraps WodWiki Monaco editor with runtime test bench styling, line highlighting, and error display.

### Dependencies
- `WodWiki` from `src/editor/WodWiki.tsx`
- `ParseError` from data model
- React 18+

### Props Interface

```typescript
interface EditorPanelProps {
  value: string;
  onChange: (script: string) => void;
  highlightedLine?: number;
  errors?: ParseError[];
  status: 'idle' | 'parsing' | 'valid' | 'error';
  suggestions?: string[];
  onSuggestionSelect?: (suggestion: string) => void;
  readonly?: boolean;
  className?: string;
  testId?: string;
}
```

---

## Test Contract

### Test 1: Renders with empty value
**Given**: EditorPanel with empty string value  
**When**: Component rendered  
**Then**:
- WodWiki editor appears
- No errors displayed
- Status badge shows 'idle'

```typescript
test('renders with empty value', () => {
  render(
    <EditorPanel 
      value="" 
      onChange={() => {}}
      status="idle"
    />
  );
  
  expect(screen.getByRole('textbox')).toBeInTheDocument();
  expect(screen.queryByText(/error/i)).not.toBeInTheDocument();
});
```

### Test 2: Calls onChange when text edited
**Given**: EditorPanel mounted  
**When**: User types "workout"  
**Then**:
- onChange callback invoked with new value

```typescript
test('calls onChange when text edited', () => {
  const handleChange = vi.fn();
  render(
    <EditorPanel 
      value="" 
      onChange={handleChange}
      status="idle"
    />
  );
  
  const editor = screen.getByRole('textbox');
  fireEvent.change(editor, { target: { value: 'workout' } });
  
  expect(handleChange).toHaveBeenCalledWith('workout');
});
```

### Test 3: Highlights specific line number
**Given**: EditorPanel with script and highlightedLine=5  
**When**: Component rendered  
**Then**:
- Line 5 has highlight styling
- Other lines do not

```typescript
test('highlights specific line number', () => {
  const script = `workout "Test" {
  warmup {
    run 1mi
  }
  main {
    pullups 10
  }
}`;
  
  const { container } = render(
    <EditorPanel 
      value={script}
      onChange={() => {}}
      status="idle"
      highlightedLine={5}
    />
  );
  
  // Check line 5 has highlight class
  const line5 = container.querySelector('[data-line="5"]');
  expect(line5).toHaveClass('bg-primary/20'); // or similar highlight class
});
```

### Test 4: Displays parse errors
**Given**: EditorPanel with 2 parse errors  
**When**: Component rendered  
**Then**:
- Error badge shows "✗ 2 Errors"
- Status is 'error'

```typescript
test('displays parse errors', () => {
  const errors = [
    { line: 3, column: 5, message: 'Unexpected token', severity: 'error' as const },
    { line: 7, column: 10, message: 'Missing closing brace', severity: 'error' as const }
  ];
  
  render(
    <EditorPanel 
      value="invalid script"
      onChange={() => {}}
      status="error"
      errors={errors}
    />
  );
  
  expect(screen.getByText(/2 errors/i)).toBeInTheDocument();
});
```

### Test 5: Shows suggestions popup
**Given**: EditorPanel with suggestions array  
**When**: Component rendered  
**Then**:
- Suggestions popup visible
- Lists all suggestions

```typescript
test('shows suggestions popup', () => {
  const suggestions = ['pullups', 'pushups_diamond', 'pushups_wide'];
  
  render(
    <EditorPanel 
      value="pu"
      onChange={() => {}}
      status="idle"
      suggestions={suggestions}
    />
  );
  
  expect(screen.getByText('pullups')).toBeInTheDocument();
  expect(screen.getByText('pushups_diamond')).toBeInTheDocument();
  expect(screen.getByText('pushups_wide')).toBeInTheDocument();
});
```

### Test 6: Calls onSuggestionSelect
**Given**: EditorPanel with suggestions  
**When**: User clicks 'pullups' suggestion  
**Then**:
- onSuggestionSelect called with 'pullups'

```typescript
test('calls onSuggestionSelect', () => {
  const handleSelect = vi.fn();
  const suggestions = ['pullups', 'pushups'];
  
  render(
    <EditorPanel 
      value="pu"
      onChange={() => {}}
      status="idle"
      suggestions={suggestions}
      onSuggestionSelect={handleSelect}
    />
  );
  
  fireEvent.click(screen.getByText('pullups'));
  
  expect(handleSelect).toHaveBeenCalledWith('pullups');
});
```

### Test 7: Read-only mode disables editing
**Given**: EditorPanel with readonly=true  
**When**: User attempts to type  
**Then**:
- onChange not called
- Editor appears disabled

```typescript
test('read-only mode disables editing', () => {
  const handleChange = vi.fn();
  
  render(
    <EditorPanel 
      value="workout {}"
      onChange={handleChange}
      status="idle"
      readonly={true}
    />
  );
  
  const editor = screen.getByRole('textbox');
  expect(editor).toHaveAttribute('readonly');
});
```

### Test 8: Applies custom className
**Given**: EditorPanel with className="custom-class"  
**When**: Component rendered  
**Then**:
- Root element has custom-class

```typescript
test('applies custom className', () => {
  const { container } = render(
    <EditorPanel 
      value=""
      onChange={() => {}}
      status="idle"
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
- EditorPanel component doesn't exist yet
- No rendering logic
- No event handlers

**First passing test**: Test 1 (renders with empty value)  
**Last passing test**: Test 8 (custom className)

---

## Success Criteria

- All 8 contract tests pass
- No console errors
- TypeScript strict mode passes
- Component memoized with React.memo
- Integrates with existing WodWiki component

---

**Status**: ❌ Not Implemented (tests will fail)  
**Next**: Implement EditorPanel component
