# Phase 3.4 Implementation Guide

**Start Date:** October 16, 2025  
**Estimated Completion:** October 17-18, 2025  
**Total Tasks:** 40  
**Estimated Hours:** 18-20  

---

## Quick Start

### Before You Begin

1. Review `PHASE-3.4-TASKS.md` - Full task breakdown
2. Verify Phase 3.3 complete: `npm run test:unit` should pass
3. Verify Storybook running: `npm run storybook`
4. Check current component stubs are in place

### Recommended Execution Order

```
Priority: CRITICAL PATH FIRST
├─ T041: EditorPanel Core (45m) - MUST COMPLETE FIRST
├─ T046: RuntimeStackPanel Core (45m) - MUST COMPLETE FIRST  
├─ T051: MemoryPanel Core (45m) - MUST COMPLETE FIRST
├─ T056: CompilationPanel Core (30m) - MUST COMPLETE FIRST
├─ T066: Highlighting State (45m) - MUST COMPLETE FIRST
├─ T067: Snapshot State (45m) - MUST COMPLETE FIRST
├─ T069: RuntimeAdapter (30m) - MUST COMPLETE FIRST
├─ T070: E2E Workflow (15m) - VERIFY ALL CONNECTED
├─ T071: Integration Tests (45m) - VERIFY ALL WORKING
└─ T074: Performance (30m) - VERIFY ACCEPTABLE

Then parallelize features:
├─ T042-T045: EditorPanel features (parallel)
├─ T047-T050: RuntimeStackPanel features (parallel)
├─ T052-T055: MemoryPanel features (parallel)
├─ T057-T058: CompilationPanel features (parallel)
├─ T059-T062: Toolbar (parallel)
├─ T063-T065: StatusFooter (parallel)
├─ T068: Event Queue (can start early)
├─ T072: Contract Tests (run as implementations complete)
├─ T073: Storybook (run after implementations)
└─ T075: Documentation (final pass)
```

---

## Key Implementation Details

### EditorPanel (T041-T045)

**Current State:**
- Stub exists: `src/runtime-test-bench/components/EditorPanel.tsx`
- Props interface: `EditorPanelProps` (needs fixing)
- Styling: Available via `panelBase`, `panelHeader`, etc.

**Implementation Notes:**
- WodWiki component at `src/editor/WodWiki.tsx` - reuse this
- Handle both string and parsed script objects
- Error formatting with line numbers
- Keyboard event interception for shortcuts
- Line highlighting via `monacoRef.current.deltaDecorations()`

**Key Files to Reference:**
- `src/editor/WodWiki.tsx` - Editor component
- `src/parser/timer.parser.ts` - Parse errors available
- `tests/editor/ExerciseSearchEngine.test.ts` - Autocomplete pattern

---

### RuntimeStackPanel (T046-T050)

**Current State:**
- Stub exists: `src/runtime-test-bench/components/RuntimeStackPanel.tsx`
- Props interface: `RuntimeStackPanelProps` (needs fixing)

**Implementation Notes:**
- Stack from runtime: `runtime.stack.graph()` returns top-first array
- Block icons: Timer, Rounds, Effort, Lazy, Effort etc.
- Hover state via `onBlockHover(blockKey)`
- Event display from event queue (T068)
- Context menu via HTML `<menu>` element

**Key Files to Reference:**
- `src/runtime/RuntimeStack.ts` - Stack interface
- `src/runtime/RuntimeBlock.ts` - Block structure
- `stories/runtime/DanJon.stories.tsx` - Example execution

---

### MemoryPanel (T051-T055)

**Current State:**
- Stub exists: `src/runtime-test-bench/components/MemoryPanel.tsx`
- Props interface: `MemoryPanelProps` (needs fixing)

**Implementation Notes:**
- Memory entries from: `runtime.memory.search(criteria)`
- Value formatting by type (TimeSpan[], boolean, number, etc.)
- Array truncation for performance (max 50 items, then pagination)
- Grouping by: 'type' | 'owner' | 'visibility'
- Time span visualization for timer memory
- Reference graph: track which blocks own which memory

**Key Files to Reference:**
- `src/runtime/RuntimeMemory.ts` - Memory interface
- `src/runtime/IMemoryReference.ts` - Type definitions
- `stories/clock/utils/TimerTestHarness.tsx` - Memory visualization example

---

### CompilationPanel (T056-T058)

**Current State:**
- Stub exists: `src/runtime-test-bench/components/CompilationPanel.tsx`
- Props interface: `CompilationPanelProps` (needs fixing)

**Implementation Notes:**
- Logs available from: `runtime.memory.errors` array
- Parser errors from: compilation phase
- Syntax highlight: warnings=yellow, errors=red, info=blue
- Tab filtering: output/errors/warnings/statistics
- Click error to jump to editor (coordinate with EditorPanel)

**Key Files to Reference:**
- `src/runtime/IRuntimeBehavior.ts` - Error interface
- `src/runtime/JitCompiler.ts` - Compilation log
- `tests/unit/runtime/jit-compiler-precedence.test.ts` - Compiler output

---

### Toolbar (T059-T062) & StatusFooter (T063-T065)

**Current State:**
- Stubs exist but minimal
- Props interfaces available

**Implementation Notes:**
- Toolbar: navigation (Editor/Runtime/Debug tabs)
- Action buttons: Compile, Run, Stop, Reset, Step
- Status badge: idle/parsing/running/paused/error
- Footer: time elapsed, step count, memory usage, error count
- All state from RuntimeTestBench parent

---

### Cross-Panel Integration (T066-T070)

**Critical:** Do NOT start until T041, T046, T051, T056 complete

**Implementation Sequence:**
1. T066: `useHighlighting` hook - centralized state
2. T067: `useRuntimeSnapshot` hook - history + time travel
3. T068: Event queue in `RuntimeAdapter`
4. T069: Connect RuntimeAdapter to ScriptRuntime
5. T070: End-to-end workflow test

**Key Interaction Pattern:**
```tsx
// EditorPanel hover on line 5
onLineHover(5);
// → useHighlighting: setLineHighlight(5, 'editor')
// → RuntimeTestBench.tsx detects highlight change
// → EditorPanel receives: highlightedLine=5
// → MemoryPanel receives: nothing (editor owns line, not memory)
// → RuntimeStackPanel receives: nothing

// RuntimeStackPanel hover on block-123
onBlockHover('block-123');
// → useHighlighting: setBlockHighlight('block-123', 'stack')
// → RuntimeTestBench detects change
// → EditorPanel receives: highlightedLine=undefined
// → RuntimeStackPanel receives: highlightedBlockKey='block-123'
// → MemoryPanel receives: highlightedOwnerKey='block-123' (related memory)
```

---

## Testing Strategy for Phase 3.4

### T071: Integration Tests

Create `tests/integration/RuntimeTestBench.integration.test.ts`:

```typescript
describe('RuntimeTestBench Integration', () => {
  // Workflow test
  it('edit → compile → run complete workflow', async () => {
    const { getByTestId, user } = render(<RuntimeTestBench />);
    
    // Edit code
    const editor = getByTestId('editor-panel');
    await user.type(editor, 'warmup 5min');
    
    // Compile
    const compileBtn = getByTestId('compile-button');
    await user.click(compileBtn);
    
    // Run
    const runBtn = getByTestId('run-button');
    await user.click(runBtn);
    
    // Verify stack updated
    const stack = getByTestId('runtime-stack-panel');
    expect(stack).toHaveTextContent('warmup');
  });

  // Highlighting test
  it('highlighting syncs across panels', async () => {
    // Hover on line in EditorPanel
    // Verify memory panel highlights related entries
    // Verify stack panel highlights owner block
  });

  // Error handling test
  it('gracefully handles parse errors', async () => {
    // Invalid code
    // Verify error displays in CompilationPanel
    // Verify error links to EditorPanel line
    // Verify execution blocked
  });
});
```

### T072: Contract Tests Update

Update existing contract tests to work with real implementations:

```typescript
// Update T008-T015 contract tests
describe('EditorPanel Contract', () => {
  it('should accept code changes', () => {
    const { rerender } = render(
      <EditorPanel value="test" onChange={vi.fn()} />
    );
    expect(onChange).toHaveBeenCalledWith('test');
  });

  it('should highlight specified line', () => {
    const { getByTestId } = render(
      <EditorPanel value="test" highlightedLine={5} />
    );
    // Verify Monaco highlights line 5
  });
});
```

### T074: Performance Tests

Create `tests/performance/RuntimeTestBench.perf.test.ts`:

```typescript
describe('RuntimeTestBench Performance', () => {
  it('renders in < 500ms', () => {
    const start = performance.now();
    render(<RuntimeTestBench />);
    const time = performance.now() - start;
    expect(time).toBeLessThan(500);
  });

  it('handles code change in < 100ms', () => {
    const { rerender } = render(
      <RuntimeTestBench initialCode="" />
    );
    const start = performance.now();
    rerender(<RuntimeTestBench initialCode="warmup 5min" />);
    const time = performance.now() - start;
    expect(time).toBeLessThan(100);
  });

  it('executes step in < 50ms', () => {
    // Measure runtime.nextBlock() execution
  });
});
```

---

## Common Implementation Patterns

### Pattern 1: Reactive Prop Updates

```typescript
const EditorPanel: React.FC<EditorPanelProps> = ({
  highlightedLine
}) => {
  const monacoRef = useRef(null);

  useEffect(() => {
    if (highlightedLine !== undefined && monacoRef.current) {
      // Apply highlighting
      monacoRef.current.deltaDecorations([], [{
        range: new Range(highlightedLine, 1, highlightedLine, 1),
        options: { 
          inlineClassName: 'bg-yellow-300 opacity-50'
        }
      }]);
    }
  }, [highlightedLine]);

  return (
    <WodWiki ref={monacoRef} value={...} onChange={...} />
  );
};
```

### Pattern 2: Cross-Panel Callback

```typescript
// RuntimeTestBench.tsx
const handleLineHover = (line: number) => {
  setLineHighlight(line, 'editor');
};

<EditorPanel onLineHover={handleLineHover} />

// EditorPanel.tsx (inside)
const handleEditorHover = (line: number) => {
  onLineHover?.(line);
};
```

### Pattern 3: Shared State via Context (Optional)

```typescript
const RuntimeTestBenchContext = React.createContext<RuntimeTestBenchState>(null);

// Wrap all panels
<RuntimeTestBenchContext.Provider value={state}>
  <EditorPanel />
  <RuntimeStackPanel />
  <MemoryPanel />
</RuntimeTestBenchContext.Provider>

// In panels
const state = useContext(RuntimeTestBenchContext);
```

---

## Debugging Tips

### Visual Debugging
```bash
npm run storybook
# Visit http://localhost:6007
# Navigate to Runtime Test Bench stories
# Use React DevTools to inspect component tree
```

### Performance Debugging
```typescript
// Add to RuntimeTestBench.tsx
const start = performance.now();
// ... operation
const duration = performance.now() - start;
console.log(`Operation took ${duration}ms`);
```

### Memory Debugging
```typescript
// Check memory usage
console.log('Memory:', runtime.memory.search({ id: null }));

// Monitor for leaks
const renderCount = React.useRef(0);
useEffect(() => {
  renderCount.current++;
  console.log(`EditorPanel renders: ${renderCount.current}`);
}, []);
```

### State Debugging
```typescript
// Log highlighting changes
useEffect(() => {
  console.log('Highlighting:', highlightState);
}, [highlightState]);

// Log prop changes
useEffect(() => {
  console.log('EditorPanel props changed:', {
    highlightedLine,
    status,
    errors: errors.length
  });
}, [highlightedLine, status, errors]);
```

---

## Validation Commands

Run these frequently during implementation:

```bash
# Unit tests (should still pass)
npm run test:unit

# Type checking (should be 369 errors - no new ones)
npx tsc --noEmit

# Storybook (should show all stories)
npm run storybook

# Build validation (should succeed)
npm run build-storybook

# Specific test file
npx vitest run tests/integration/RuntimeTestBench.integration.test.ts

# Watch mode for fast iteration
npx vitest --watch
```

---

## Estimated Time Breakdown

```
Critical Path (1-2 hours):
├─ T041 EditorPanel Core: 45m
├─ T046 RuntimeStackPanel Core: 45m
├─ T051 MemoryPanel Core: 45m
├─ T056 CompilationPanel Core: 30m
└─ T066-T069 Integration: 2h

Parallel Features (3-4 hours):
├─ T042-T045 EditorPanel Features: 2h
├─ T047-T050 RuntimeStackPanel Features: 2h
├─ T052-T055 MemoryPanel Features: 2h
├─ T057-T058 CompilationPanel Features: 1h
├─ T059-T062 Toolbar: 1.5h
└─ T063-T065 StatusFooter: 1h

Testing & Polish (1-2 hours):
├─ T070-T072 Workflows & Tests: 1.5h
├─ T073 Storybook: 30m
├─ T074 Performance: 30m
└─ T075 Documentation: 30m

Total: 18-20 hours
```

---

## Success Criteria Checklist

Before marking complete:

### Functional
- [ ] Edit code in EditorPanel → updates display
- [ ] Click Compile → shows in CompilationPanel
- [ ] Click Run → stack progresses
- [ ] Hover on stack → memory highlights
- [ ] Memory entry → find owner in stack
- [ ] All shortcuts work (Ctrl+Space, Ctrl+Enter, F5, etc.)
- [ ] Mobile layout responsive
- [ ] Error handling graceful

### Quality
- [ ] `npm run test:unit` passes
- [ ] No new TypeScript errors
- [ ] No console errors/warnings
- [ ] Memory stable (no leaks)
- [ ] No jank (60fps maintained)
- [ ] Accessibility passes (contrast, focus, etc.)

### Performance
- [ ] Initial render < 500ms
- [ ] Code change < 100ms
- [ ] Step execution < 50ms
- [ ] Memory < 100MB
- [ ] Keyboard response < 16ms

### Documentation
- [ ] README updated
- [ ] 20+ Storybook stories
- [ ] JSDoc comments on functions
- [ ] Troubleshooting guide
- [ ] API documentation

---

This implementation guide should keep you on track. Good luck!
