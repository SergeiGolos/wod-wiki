# Quickstart Guide: Runtime Test Bench UI

**Feature**: Runtime Test Bench - Integrated UI Component  
**Date**: October 16, 2025  
**Audience**: Developers implementing or testing this feature

---

## Overview

This quickstart demonstrates the Runtime Test Bench end-to-end workflow from a developer perspective. It validates that all user stories are satisfied and components integrate correctly.

**Time to Complete**: ~10 minutes  
**Prerequisites**: Node.js 18+, npm installed, wod-wiki repository cloned

---

## Setup (2 minutes)

### 1. Install Dependencies

```bash
cd x:\wod-wiki
npm install
```

**Expected Output**:
```
added X packages in Ys
```

### 2. Start Storybook

```bash
npm run storybook
```

**Expected Output**:
```
Storybook 9.1.10 for react-vite started
Local:   http://localhost:6006/
```

**✓ Verification**: Browser opens to http://localhost:6006

---

## User Story Validation (8 minutes)

### US-1: Developer Workflow

**Goal**: Edit workout scripts and step through execution with visualization

#### Step 1: Navigate to Runtime Test Bench
1. In Storybook sidebar, expand "Runtime Test Bench"
2. Click "RuntimeTestBench > Default"

**✓ Verification**: See 4-panel layout:
- Top-left: Editor with sample workout
- Top-right: Compilation panel
- Bottom-left: Runtime Stack panel
- Bottom-right: Memory panel

#### Step 2: Edit Workout Script
1. Click in Editor panel
2. Modify workout name: `workout "MURPH"` → `workout "FRAN"`
3. Wait 500ms (debounce)

**✓ Verification**:
- Compilation panel Output tab shows "Compilation started..."
- No errors in Errors tab
- Status badge shows green checkmark

#### Step 3: Step Through Execution
1. Click "Next Block" button in toolbar (or press Space)
2. Observe Runtime Stack panel update
3. Click "Next Block" again
4. Repeat 5 times

**✓ Verification**:
- Runtime Stack shows blocks appearing/completing
- Active block highlighted with ">" indicator
- Memory panel populates with entries
- Status footer shows "Executing"

#### Step 4: Reset Execution
1. Click "Reset" button in toolbar (or press Ctrl+R)

**✓ Verification**:
- Runtime Stack clears
- Memory panel clears
- Status footer shows "Idle"
- Editor content unchanged

**US-1 PASSED**: ✅ Can edit, execute, and debug workout scripts

---

### US-2: Visual Debugging

**Goal**: Cross-panel highlighting traces relationships between code, stack, and memory

#### Step 1: Hover Over Stack Block
1. Navigate to RuntimeTestBench story
2. Click "Next Block" 3 times to populate stack
3. Hover over "main" block in Runtime Stack panel

**✓ Verification**:
- Editor highlights line 6 (where "main" is defined)
- Memory panel highlights entries owned by "main" block
- Hover tooltip shows block details

#### Step 2: Hover Over Memory Entry
1. In Memory panel, hover over "reps_completed" entry

**✓ Verification**:
- Runtime Stack highlights owner block (e.g., "pushups")
- Entry value popover appears showing full details

#### Step 3: Click Compilation Error
1. Edit script to introduce syntax error: `workout "TEST {` (missing closing quote)
2. Wait for error to appear
3. In Compilation panel, click Errors tab
4. Click on error message

**✓ Verification**:
- Editor jumps to error line
- Error line highlighted in red
- Cursor positioned at error column

**US-2 PASSED**: ✅ Cross-panel highlighting enables efficient debugging

---

### US-3: Professional UI

**Goal**: Clean, screen-fitting interface optimized for developer workflow

#### Step 1: Visual Design Check
1. View RuntimeTestBench story at 1920x1080 resolution
2. Inspect each panel

**✓ Verification**:
- All 4 panels visible without scrolling
- Dark theme (#282c34 background)
- Orange primary color (#FFA500) for accents
- Space Grotesk font used throughout
- Consistent spacing (16px gaps)

#### Step 2: Responsive Design Check
1. Resize browser to 1024px width
2. Observe layout change

**✓ Verification**:
- Panels stack vertically
- Stack + Memory become tabs
- All content remains accessible

#### Step 3: Accessibility Check
1. Tab through interface (keyboard only)
2. Check focus indicators

**✓ Verification**:
- Tab order logical: Toolbar → Editor → Compilation → Stack → Memory
- Focus indicators visible (2px orange outline)
- All buttons keyboard-accessible

**US-3 PASSED**: ✅ Professional, accessible, screen-fitting UI

---

## Functional Requirements Validation

### FR-1: Editor Panel ✓

```bash
# Test: Monaco editor integration
1. Editor shows syntax highlighting (blue keywords, green exercises, red numbers)
2. Type "workout" - autocomplete suggestions appear
3. Press Ctrl+/ - line comments toggle
```

### FR-2: Compilation Panel ✓

```bash
# Test: Tabbed interface
1. Click Output tab - see compilation log with timestamps
2. Introduce error - click Errors tab - see error list
3. Click error - editor jumps to line
```

### FR-3: Runtime Stack Panel ✓

```bash
# Test: Hierarchical tree view
1. Step through nested workout (warmup -> main -> cooldown)
2. Verify tree structure with indentation
3. Check color coding: orange for active, gray for pending
4. Hover over block - see metrics tooltip
```

### FR-4: Memory Visualization Panel ✓

```bash
# Test: Grouped display and search
1. Type "reps" in search box - see filtered entries
2. Click "By Owner" button - entries grouped by block
3. Click "By Type" button - entries grouped by type (metric, timer-state, etc.)
4. Hover over value - see full JSON popover
```

### FR-5: Toolbar ✓

```bash
# Test: Navigation and actions
1. Verify "Runtime Test Bench" has orange underline (active)
2. Click Run button - script executes to completion
3. Click Next Block - steps one block
4. Click Reset - clears execution
5. Settings icon clickable
```

### FR-6: Status Footer ✓

```bash
# Test: Status and cursor info
1. Idle state: "Status: Idle" in gray
2. Click Next Block: "Status: Executing" in green
3. Complete execution: "Status: Completed" in green
4. Click in editor: Footer shows "Ln X, Col Y"
```

---

## Performance Validation

### Test 1: Step Execution Speed

```bash
# Setup: RuntimeTestBench with 20-line workout
1. Open browser DevTools > Performance tab
2. Click "Next Block" button
3. Record timing

✓ Expected: Update completes in <50ms
```

### Test 2: Large Script Parsing

```bash
# Setup: Load 500-line workout script
1. Paste large script into editor
2. Wait for parsing
3. Check compilation log timestamp

✓ Expected: Parse completes in <2 seconds
```

### Test 3: Memory Panel with 100+ Entries

```bash
# Setup: Execute workout that creates 100+ memory entries
1. Step through complete execution
2. Scroll memory panel
3. Search for entries

✓ Expected: Scrolling smooth (60fps), search <100ms
```

---

## Integration Test Scenarios

### Scenario 1: Simple AMRAP Workout

```typescript
const script = `
20:00 AMRAP
5 Pullups
10 Pushups
15 Air Squats
`;

// 1. Load script
// 2. Step through: AMRAP block → Pullups → Pushups → Squats
// 3. Verify memory shows: reps, sets, time
// 4. Reset
// ✓ All panels update correctly
```

### Scenario 2: Nested Rounds with Timer

```typescript
const script = `
workout "MURPH" {
  warmup {
    run 1mi
  }
  
  5 rounds {
    pullups 10
    pushups 20
    squats 30
  }
  
  cooldown {
    run 1mi
  }
}
`;

// 1. Load script
// 2. Step through all blocks
// 3. Verify hierarchy in stack: workout -> warmup/rounds/cooldown -> exercises
// 4. Check memory ownership
// ✓ Tree structure correct, memory properly scoped
```

### Scenario 3: Syntax Error Recovery

```typescript
const script = `
workout "TEST" {
  warmup {
    run 1mi
  
  main {
    pullups 10
  }
}
`;
// Missing closing brace on line 4

// 1. Load script
// 2. Compilation panel shows error: "Expected '}' on line 5"
// 3. Click error - jumps to line 5
// 4. Fix error: add '}' on line 4
// 5. Wait for recompile
// ✓ Error clears, script compiles successfully
```

---

## Keyboard Shortcuts Validation

| Shortcut | Action | Test |
|----------|--------|------|
| `Space` | Next Block | Press Space → stack advances |
| `Ctrl+Enter` | Run | Press Ctrl+Enter → executes to completion |
| `Ctrl+R` | Reset | Press Ctrl+R → execution resets |
| `F5` | Run | Press F5 → executes |
| `F10` | Step Over | Press F10 → advances one block |
| `F11` | Step Into | Press F11 → enters nested block |
| `Shift+F5` | Reset | Press Shift+F5 → resets |
| `Ctrl+F` | Search Memory | Press Ctrl+F → focus on memory search |
| `Ctrl+/` | Toggle Comment | Press Ctrl+/ in editor → line comments |

**✓ All shortcuts work as expected**

---

## Storybook Stories Validation

Navigate to each story and verify rendering:

- [ ] `RuntimeTestBench > Default` - Shows 4-panel layout with sample workout
- [ ] `RuntimeTestBench > Simple AMRAP` - Displays AMRAP workout
- [ ] `RuntimeTestBench > Nested Rounds` - Shows complex hierarchy
- [ ] `RuntimeTestBench > With Errors` - Displays parse errors
- [ ] `EditorPanel > Default` - Editor in isolation
- [ ] `CompilationPanel > Default` - Compilation output
- [ ] `RuntimeStackPanel > Default` - Stack visualization
- [ ] `MemoryPanel > Default` - Memory table
- [ ] `Toolbar > Default` - Navigation and buttons
- [ ] `StatusFooter > Default` - Status display

**✓ All stories render without errors**

---

## Accessibility Audit

### WCAG 2.1 AA Checklist

- [ ] **1.4.3 Contrast**: All text has 4.5:1 contrast ratio minimum
  - Test: Use browser DevTools > Accessibility > Contrast
  - Expected: All pass

- [ ] **2.1.1 Keyboard**: All functionality available via keyboard
  - Test: Tab through entire interface, use all shortcuts
  - Expected: No mouse-only actions

- [ ] **2.4.7 Focus Visible**: Focus indicator always visible
  - Test: Tab through, check each element
  - Expected: 2px orange outline on all focusable elements

- [ ] **4.1.2 Name, Role, Value**: ARIA labels present
  - Test: Screen reader (NVDA/JAWS) announces elements
  - Expected: All panels, buttons labeled

**✓ All accessibility requirements met**

---

## Success Criteria Summary

### Feature Complete ✅
- All 6 panels implemented and functional
- All 3 user stories validated
- All 6 functional requirements met

### Quality Metrics ✅
- Performance targets achieved (<50ms updates)
- TypeScript strict mode (new code only)
- Accessibility WCAG 2.1 AA compliant

### Documentation ✅
- This quickstart validates workflows
- Storybook stories demonstrate all states
- Component interfaces documented in data-model.md

---

## Troubleshooting

### Issue: Storybook won't start
**Solution**: 
```bash
# Kill any existing node processes
Get-Process -Name "node", "storybook" -ErrorAction SilentlyContinue | Stop-Process -Force

# Clear cache and restart
npm run storybook
```

### Issue: Compilation panel shows errors but editor looks correct
**Solution**: Check console for parser errors, verify debounce completed (wait 500ms after typing)

### Issue: Cross-panel highlighting not working
**Solution**: Ensure you're hovering (not clicking), check browser console for errors

---

## Next Steps

After completing this quickstart:

1. **Review Code**: Examine implementations in `src/runtime-test-bench/`
2. **Run Tests**: Execute `npm run test:unit` to verify all contract tests pass
3. **Extend**: Add new workout scenarios to Storybook stories
4. **Deploy**: Build static Storybook with `npm run build-storybook`

---

**Quickstart Status**: ✅ Ready for Validation  
**Estimated Time**: 10 minutes  
**All Steps Validated**: Yes (when feature complete)
