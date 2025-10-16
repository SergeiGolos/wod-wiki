# Phase 3.5: Parser Integration & Runtime Execution

**Phase Status:** IN PROGRESS  
**Est. Duration:** 4-6 hours  
**Complexity:** MEDIUM  
**Target Completion:** October 16, 2025, 11:00 PM  

---

## Overview

Phase 3.5 connects the Runtime Test Bench UI to the **parser** and **runtime execution** systems, enabling the complete edit → compile → run workflow.

### Goals

1. ✅ **Parse Workout Scripts** - Convert editor text to CodeStatements
2. ✅ **Display Parse Errors** - Show syntax/validation errors inline
3. ✅ **Compile to Runtime Blocks** - Use JitCompiler to create IRuntimeBlocks
4. ✅ **Execute Workouts** - Run compiled workouts through ScriptRuntime
5. ✅ **Real-time UI Updates** - Update panels during execution

---

## Task Breakdown

### Section A: Parser Integration (T076-T080) - 2 hours

#### T076: Parse Code to WodScript (30 min)
**Files:** `src/runtime-test-bench/RuntimeTestBench.tsx`

**Requirements:**
- [ ] Import `MdTimerRuntime` from `src/parser/md-timer.ts`
- [ ] Create parser instance on mount
- [ ] Parse code on `handleCodeChange`
- [ ] Update `parseResults` state with statements, errors
- [ ] Debounce parsing (500ms) to avoid excessive re-parsing

**Acceptance Criteria:**
- Code changes trigger parse after 500ms delay
- ParseResults contains statements array
- Parse errors captured and stored
- No memory leaks from parser instances

**Implementation:**
```typescript
import { MdTimerRuntime } from '../parser/md-timer';

const [parseResults, setParseResults] = useState<ParseResults>({
  statements: [],
  errors: [],
  warnings: [],
  status: 'idle'
});

const parser = useMemo(() => new MdTimerRuntime(), []);

// Debounced parse function
const debouncedParse = useMemo(
  () => debounce((code: string) => {
    setParseResults(prev => ({ ...prev, status: 'parsing' }));
    
    try {
      const script = parser.read(code);
      setParseResults({
        statements: script.statements,
        errors: script.errors || [],
        warnings: [],
        status: script.errors?.length ? 'error' : 'success',
        metadata: {
          parseTime: Date.now(),
          statementCount: script.statements.length,
          tokenCount: 0 // TODO: Track tokens
        }
      });
    } catch (error) {
      setParseResults(prev => ({
        ...prev,
        status: 'error',
        errors: [{ line: 0, column: 0, message: error.message, severity: 'error' }]
      }));
    }
  }, 500),
  [parser]
);
```

---

#### T077: Display Parse Errors in EditorPanel (20 min)
**Files:** `src/runtime-test-bench/RuntimeTestBench.tsx`

**Requirements:**
- [ ] Pass `parseResults.errors` to EditorPanel
- [ ] Update EditorPanel status based on parse status
- [ ] Convert parse errors to EditorPanel error format
- [ ] Display error count in status badge

**Acceptance Criteria:**
- Errors display inline at correct lines
- Status badge shows "Valid" or "Error"
- Error count badge shows number of errors
- Clicking error jumps to line

**Implementation:**
```typescript
const editorErrors = parseResults.errors.map(err => ({
  line: err.token?.startLine || 0,
  column: err.token?.startColumn || 0,
  message: err.message,
  severity: 'error' as const,
  suggestion: generateErrorSuggestion(err)
}));

<EditorPanel
  value={code}
  onChange={handleCodeChange}
  highlightedLine={highlightState.line}
  errors={editorErrors}
  status={parseResults.status === 'success' ? 'valid' : 
          parseResults.status === 'parsing' ? 'parsing' : 
          parseResults.status === 'error' ? 'error' : 'idle'}
  readonly={false}
/>
```

---

#### T078: Display Parsed Statements in CompilationPanel (25 min)
**Files:** `src/runtime-test-bench/RuntimeTestBench.tsx`, `src/runtime-test-bench/components/CompilationPanel.tsx`

**Requirements:**
- [ ] Pass `parseResults.statements` to CompilationPanel
- [ ] Display statement list with line numbers
- [ ] Show fragment breakdown per statement
- [ ] Add "Statements" tab to CompilationPanel
- [ ] Highlight statement on hover

**Acceptance Criteria:**
- Statements tab shows all parsed statements
- Each statement shows fragments with icons
- Hovering statement highlights editor line
- Fragment types color-coded

---

#### T079: Compile WodScript to Runtime Blocks (40 min)
**Files:** `src/runtime-test-bench/RuntimeTestBench.tsx`

**Requirements:**
- [ ] Import `JitCompiler`, `WodScript` from runtime
- [ ] Create JitCompiler instance with strategies
- [ ] Create WodScript from parseResults
- [ ] Create ScriptRuntime with compiled script
- [ ] Handle compilation errors gracefully

**Acceptance Criteria:**
- WodScript created from statements
- ScriptRuntime created with compiled blocks
- Compilation errors logged to CompilationPanel
- Runtime instance stored in state

**Implementation:**
```typescript
import { JitCompiler } from '../runtime/JitCompiler';
import { WodScript } from '../WodScript';
import { EffortStrategy, TimerStrategy, RoundsStrategy } from '../runtime/strategies';

const compiler = useMemo(() => {
  return new JitCompiler([
    new TimerStrategy(),
    new RoundsStrategy(),
    new EffortStrategy()
  ]);
}, []);

const handleCompile = () => {
  setStatus('idle');
  setCompilationLog(prev => [...prev, {
    id: Date.now().toString(),
    timestamp: Date.now(),
    message: 'Starting compilation...',
    level: 'info'
  }]);

  try {
    const script = new WodScript(code, parseResults.statements, parseResults.errors);
    const newRuntime = new ScriptRuntime(script, compiler);
    
    setRuntime(newRuntime);
    updateSnapshot();
    
    setCompilationLog(prev => [...prev, {
      id: Date.now().toString(),
      timestamp: Date.now(),
      message: `Compilation successful. ${parseResults.statements.length} statements compiled.`,
      level: 'success'
    }]);
  } catch (error) {
    setCompilationLog(prev => [...prev, {
      id: Date.now().toString(),
      timestamp: Date.now(),
      message: `Compilation failed: ${error.message}`,
      level: 'error'
    }]);
  }
};
```

---

#### T080: Wire Compile Button (5 min)
**Files:** `src/runtime-test-bench/RuntimeTestBench.tsx`

**Requirements:**
- [ ] Enable Compile button when parse successful
- [ ] Disable Compile button during parsing
- [ ] Update button state based on parseResults.status
- [ ] Show compilation progress in status footer

**Acceptance Criteria:**
- Compile button enabled when code valid
- Compile button disabled when errors present
- Compile button disabled during parsing
- Button click triggers handleCompile

---

### Section B: Runtime Execution (T081-T085) - 2 hours

#### T081: Execute Workout on Run Button (45 min)
**Files:** `src/runtime-test-bench/RuntimeTestBench.tsx`

**Requirements:**
- [ ] Implement handleExecute to start runtime
- [ ] Call runtime.next() to advance execution
- [ ] Update snapshot on each step
- [ ] Handle runtime events (timer:tick, block:complete)
- [ ] Stop execution on completion or error

**Acceptance Criteria:**
- Run button starts execution
- Runtime advances through blocks
- Snapshot updates reflect current state
- Execution stops at end of workout

**Implementation:**
```typescript
const handleExecute = () => {
  if (!runtime) {
    console.error('No runtime available. Compile first.');
    return;
  }

  setStatus('running');
  updateSnapshot();

  // Start execution loop
  const executeStep = () => {
    if (!runtime || status !== 'running') return;

    try {
      const nextEvent = runtime.next();
      
      if (nextEvent?.name === 'workout:complete') {
        setStatus('completed');
        updateSnapshot();
        return;
      }

      updateSnapshot();
      
      // Schedule next step
      setTimeout(executeStep, 100); // 10 steps/second
    } catch (error) {
      setStatus('error');
      console.error('Runtime execution error:', error);
    }
  };

  executeStep();
};
```

---

#### T082: Pause/Resume Execution (20 min)
**Files:** `src/runtime-test-bench/RuntimeTestBench.tsx`

**Requirements:**
- [ ] Implement handlePause to stop execution loop
- [ ] Preserve runtime state when paused
- [ ] Resume from paused state
- [ ] Update status footer with pause indicator

**Acceptance Criteria:**
- Pause button stops execution
- Runtime state preserved
- Resume continues from pause point
- Status shows "Paused"

---

#### T083: Step-by-Step Execution (25 min)
**Files:** `src/runtime-test-bench/RuntimeTestBench.tsx`

**Requirements:**
- [ ] Implement handleStep to advance one event
- [ ] Enable step mode in ControlsPanel
- [ ] Update snapshot after each step
- [ ] Show next event preview

**Acceptance Criteria:**
- Step button advances one event
- Step mode toggle works
- Snapshot updates after step
- Next event displayed

---

#### T084: Stop and Reset Execution (20 min)
**Files:** `src/runtime-test-bench/RuntimeTestBench.tsx`

**Requirements:**
- [ ] Implement handleStop to halt execution
- [ ] Implement handleReset to clear runtime
- [ ] Reset snapshot to initial state
- [ ] Clear runtime blocks and memory

**Acceptance Criteria:**
- Stop button halts execution
- Reset button clears runtime
- Snapshot resets to empty
- Can compile and run again after reset

---

#### T085: Real-time Panel Updates (30 min)
**Files:** `src/runtime-test-bench/RuntimeTestBench.tsx`

**Requirements:**
- [ ] Update RuntimeStackPanel with active blocks
- [ ] Update MemoryPanel with memory entries
- [ ] Update StatusFooter with elapsed time
- [ ] Highlight active block in stack
- [ ] Show memory allocations

**Acceptance Criteria:**
- Stack panel shows active execution
- Memory panel shows allocations
- Status footer shows time
- Active block highlighted
- UI updates smoothly (no flickering)

---

### Section C: Integration Testing (T086-T090) - 1 hour

#### T086: Create E2E Integration Test (30 min)
**Files:** `tests/integration/RuntimeTestBench.integration.test.tsx`

**Requirements:**
- [ ] Test edit → compile → run workflow
- [ ] Test pause/resume functionality
- [ ] Test step-by-step execution
- [ ] Test error handling
- [ ] Test keyboard shortcuts

**Acceptance Criteria:**
- All workflows pass integration tests
- No regressions in existing tests
- Code coverage > 80% for RuntimeTestBench

---

#### T087: Validate Keyboard Shortcuts (15 min)
**Files:** `tests/integration/RuntimeTestBench.integration.test.tsx`

**Requirements:**
- [ ] Test Space to pause/resume
- [ ] Test Ctrl+Enter to run
- [ ] Test F5 to reset
- [ ] Test F10 to step
- [ ] Test F11 to compile

**Acceptance Criteria:**
- All shortcuts trigger correct actions
- Shortcuts work in all states (idle/running/paused)
- No conflicting shortcuts

---

#### T088: Performance Testing (10 min)
**Files:** `tests/integration/RuntimeTestBench.performance.test.tsx`

**Requirements:**
- [ ] Test parse performance (<100ms for 100 lines)
- [ ] Test compilation performance (<500ms)
- [ ] Test snapshot generation (<50ms)
- [ ] Test UI update frequency (>30fps)

**Acceptance Criteria:**
- All performance targets met
- No memory leaks during execution
- Smooth UI updates

---

#### T089: Documentation Updates (3 min)
**Files:** `README.md`, `docs/runtime-test-bench-usage.md`

**Requirements:**
- [ ] Document edit → compile → run workflow
- [ ] Document keyboard shortcuts
- [ ] Add usage examples
- [ ] Add screenshots to Storybook

**Acceptance Criteria:**
- README updated with usage
- Documentation clear and complete
- Screenshots added

---

#### T090: Final Validation Checklist (2 min)

**Manual Testing:**
- [ ] Open Storybook to http://localhost:6007
- [ ] Navigate to RuntimeTestBench > Default
- [ ] Type workout code: `(21-15-9) Thrusters 95lb, Pullups`
- [ ] Verify parse (no errors, statements visible)
- [ ] Click "Compile" button
- [ ] Verify compilation log shows success
- [ ] Click "Run" button
- [ ] Verify runtime stack shows blocks
- [ ] Verify memory panel shows allocations
- [ ] Verify status footer shows elapsed time
- [ ] Test pause (Space key)
- [ ] Test resume (Space key)
- [ ] Test step (F10 key)
- [ ] Test reset (F5 key)
- [ ] Hover over stack block, verify editor highlights
- [ ] Hover over memory entry, verify stack highlights

**Automated Testing:**
- [ ] Run `npm test` - all tests pass
- [ ] Run `npm run test:unit` - no regressions
- [ ] Run `npm run build-storybook` - builds successfully
- [ ] Run `npx tsc --noEmit` - no new TypeScript errors

---

## Success Metrics

| Metric | Target | Status |
|--------|--------|--------|
| Parse Time | <100ms for 100 lines | ⏳ Pending |
| Compilation Time | <500ms | ⏳ Pending |
| Execution Performance | 10 steps/second | ⏳ Pending |
| UI Update Rate | >30fps | ⏳ Pending |
| Test Coverage | >80% | ⏳ Pending |
| Integration Tests | All pass | ⏳ Pending |

---

## Dependencies

- ✅ Phase 3.4 Complete (all panels implemented)
- ✅ Parser exists (`src/parser/md-timer.ts`)
- ✅ JitCompiler exists (`src/runtime/JitCompiler.ts`)
- ✅ ScriptRuntime exists (`src/runtime/ScriptRuntime.ts`)
- ✅ RuntimeAdapter exists (`src/runtime-test-bench/adapters/RuntimeAdapter.ts`)

---

## Risk Mitigation

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| Parser errors | MEDIUM | HIGH | Add try/catch around parse calls, display errors gracefully |
| Runtime crashes | LOW | HIGH | Add error boundaries, graceful error handling |
| Performance issues | MEDIUM | MEDIUM | Debounce parsing, throttle snapshot updates |
| Memory leaks | LOW | HIGH | Cleanup intervals on unmount, dispose runtime properly |

---

## Next Steps After Phase 3.5

**Phase 3.6: Advanced Features**
- Event queue visualization panel
- Timeline scrubbing
- Breakpoints and debugging
- Export/import workout state
- Performance profiling
- Mobile optimization

---

**Status:** ✅ Ready to start T076  
**Next Task:** Parse Code to WodScript (30 min)
