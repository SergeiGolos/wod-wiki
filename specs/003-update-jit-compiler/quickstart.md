# Quickstart: Enhanced JIT Compiler Demo Visualization

**Feature**: 003-update-jit-compiler  
**Date**: 2025-10-03  
**Duration**: ~5 minutes

This quickstart validates the enhanced JIT Compiler Demo by walking through all key user scenarios from the specification.

---

## Prerequisites

```bash
# Ensure dependencies installed
npm install

# Start Storybook development server
npm run storybook
```

**Expected**: Storybook starts on http://localhost:6006 (~2 seconds)

---

## Test Scenario 1: Controls Panel & Panel Toggles

**Objective**: Verify Controls panel with toggle switches for each visualization panel

**Steps**:
1. Navigate to: `Compiler > JIT Compiler Demo > Default`
2. Observe the Storybook Controls panel on the right side
3. Locate three toggle switches:
   - "Show Fragments"
   - "Show Runtime Stack"  
   - "Show Memory"

**Expected**:
- ✅ All three toggles visible in Controls panel
- ✅ All toggles default to ON (checked)
- ✅ Main canvas shows three visualization panels vertically arranged

**Action**:
4. Click "Show Fragments" toggle to OFF
5. Observe fragments panel disappears
6. Click toggle back to ON

**Expected**:
- ✅ Fragments panel hides when toggled OFF
- ✅ Fragments panel reappears when toggled ON
- ✅ Other panels (Runtime Stack, Memory) remain unaffected

**Validation**: Repeat for "Show Runtime Stack" and "Show Memory" toggles

---

## Test Scenario 2: Fragment Visualization Display

**Objective**: Verify fragments are parsed, grouped by type, and color-coded

**Steps**:
1. Ensure "Show Fragments" toggle is ON
2. Locate the workout script editor (top of demo)
3. Observe default script content (should contain timer, rep, effort examples)
4. Locate the Fragments visualization panel below editor

**Expected**:
- ✅ Fragments panel displays parsed fragments
- ✅ Fragments grouped by type (Timer, Rep, Effort, etc.)
- ✅ Each group has color-coded background:
  - Timer: Blue
  - Rep: Green
  - Effort: Yellow
  - Distance: Teal
  - Rounds: Purple
  - Action: Pink
  - Increment: Indigo
  - Lap: Orange
  - Text: Gray
  - Resistance: Red
- ✅ Each group shows type name as header (uppercase)
- ✅ Individual fragment values displayed within each group

---

## Test Scenario 3: Editor Updates & Fragment Parsing

**Objective**: Verify fragment panel updates when editor content changes

**Steps**:
1. Click in the workout script editor
2. Clear existing content (Ctrl+A, Delete)
3. Type: `10:00 for time`
4. Wait 300ms for parse to complete

**Expected**:
- ✅ Fragments panel updates automatically (no manual refresh needed)
- ✅ Timer fragment displayed: `10:00`
- ✅ Text fragment displayed: `for time`

**Action**:
5. Continue typing: `\n5 rounds of\n  10 push-ups`

**Expected**:
- ✅ Fragments panel updates with each change
- ✅ Rounds fragment appears: `5`
- ✅ Rep fragment appears: `10`
- ✅ Action fragment appears: `push-ups`

---

## Test Scenario 4: Parse Error Handling

**Objective**: Verify error state display when parsing fails

**Steps**:
1. Clear editor content
2. Type invalid syntax: `10::00 invalid @#$`
3. Wait 300ms for parse attempt

**Expected**:
- ✅ Fragments panel shows error state
- ✅ Error message displayed (e.g., "Unexpected token" or similar)
- ✅ Previous fragments cleared (not retained)
- ✅ Error icon or indicator visible

**Action**:
4. Clear editor and type valid syntax: `5:00 for time`

**Expected**:
- ✅ Error state clears
- ✅ Valid fragments display again
- ✅ Timer fragment: `5:00`

---

## Test Scenario 5: Runtime Block Hover Highlighting

**Objective**: Verify hovering runtime block highlights memory and source line

**Steps**:
1. Ensure "Show Runtime Stack" and "Show Memory" toggles are ON
2. Locate Runtime Stack panel (middle section)
3. Identify a runtime block (e.g., "Timer" block with depth indicator)
4. Hover mouse over the runtime block

**Expected**:
- ✅ Hovered block receives highlight styling (background color change)
- ✅ Associated memory allocations in Memory panel highlight simultaneously
- ✅ Corresponding source code line highlights in editor (if applicable)
- ✅ Highlight transition is smooth (no flicker)
- ✅ Transition completes within ~50-100ms (feels responsive)

**Action**:
5. Move mouse away from block

**Expected**:
- ✅ Highlight clears from runtime block
- ✅ Highlight clears from memory allocations
- ✅ Source line highlight clears

---

## Test Scenario 6: Memory Entry Hover Highlighting

**Objective**: Verify hovering memory entry highlights owning runtime block

**Steps**:
1. Locate Memory Allocations panel (bottom section)
2. Identify a memory entry (showing type, value, validation status)
3. Hover mouse over the memory entry

**Expected**:
- ✅ Hovered memory entry receives highlight styling
- ✅ Owning runtime block highlights in Runtime Stack panel
- ✅ Highlight transition is smooth
- ✅ Transition completes within ~50-100ms

**Action**:
4. Move mouse away from memory entry

**Expected**:
- ✅ Highlight clears from memory entry
- ✅ Highlight clears from runtime block

---

## Test Scenario 7: Rapid Hover Changes

**Objective**: Verify highlight performance with quick mouse movements

**Steps**:
1. Quickly move mouse across multiple runtime blocks (rapid succession)
2. Observe highlight updates

**Expected**:
- ✅ Highlights update smoothly without lag
- ✅ No flickering or visual artifacts
- ✅ Each block highlights correctly as mouse enters
- ✅ Previous highlights clear properly
- ✅ Memory allocations update correspondingly

---

## Test Scenario 8: Debug Harness Removal Verification

**Objective**: Verify no debug harness features present

**Steps**:
1. Examine entire JIT Compiler Demo interface
2. Look for any debug-specific controls, buttons, or sections

**Expected**:
- ✅ No debug harness controls visible
- ✅ No debug-specific UI sections present
- ✅ Only visualization panels (Fragments, Runtime Stack, Memory) and Controls toggles visible
- ✅ Clean, focused interface for visualization

---

## Test Scenario 9: Panel Session Persistence

**Objective**: Verify toggle states persist during session

**Steps**:
1. Toggle "Show Fragments" OFF
2. Toggle "Show Memory" OFF
3. Leave "Show Runtime Stack" ON
4. Click to a different story (e.g., Clock > Default)
5. Navigate back to `Compiler > JIT Compiler Demo > Default`

**Expected**:
- ✅ Fragments panel remains hidden (toggle OFF)
- ✅ Memory panel remains hidden (toggle OFF)
- ✅ Runtime Stack panel remains visible (toggle ON)
- ✅ Toggle states restored from sessionStorage

**Action**:
6. Refresh browser page (F5)

**Expected**:
- ✅ Toggle states reset to defaults (all ON) after full page refresh
- ✅ SessionStorage cleared on new session

---

## Test Scenario 10: Long Fragment List Scrolling

**Objective**: Verify scrolling works for many fragments

**Steps**:
1. Clear editor content
2. Type a long workout script:
   ```
   10:00 for time
   5 rounds of
     10 push-ups
     20 sit-ups
     30 air squats
   Rest 2:00
   10:00 AMRAP
     15 burpees
     25 box jumps
     35 wall balls
   ```
3. Observe Fragments panel

**Expected**:
- ✅ All fragments parsed and displayed
- ✅ Fragments panel is scrollable (vertical scroll)
- ✅ Visual hierarchy maintained
- ✅ No layout overflow or visual breakage

---

## Test Scenario 11: Parser Story Compatibility

**Objective**: Verify Parser story still works after component extraction

**Steps**:
1. Navigate to: `Parsing > Parser > Default`
2. Observe fragment visualization in Parser story
3. Edit sample script in Parser story editor

**Expected**:
- ✅ Parser story loads without errors
- ✅ Fragment visualization displays identically to before extraction
- ✅ Same color coding, grouping, and layout
- ✅ Editing updates fragments in Parser story
- ✅ No regression from component extraction

---

## Validation Checklist

After completing all scenarios, verify:

### Functional Requirements
- [ ] FR-001: Controls panel with toggles present
- [ ] FR-002: Toggles enable/disable panels correctly
- [ ] FR-003: Panels arranged vertically
- [ ] FR-004: Toggle states persist during session
- [ ] FR-005: Fragments grouped by type
- [ ] FR-006: Correct color coding per type
- [ ] FR-007: Shared components work in both stories
- [ ] FR-008-010: Fragment display hierarchy and values
- [ ] FR-011: Parse errors show error state
- [ ] FR-011-014: Runtime stack displays correctly
- [ ] FR-015-017: Memory allocations display correctly
- [ ] FR-018-021: Hover highlighting works bidirectionally
- [ ] FR-022: Highlight transitions within 50-100ms
- [ ] FR-023-025: No debug harness features present
- [ ] FR-026-029: Editor integration works correctly

### Edge Cases
- [ ] Empty/invalid script shows error state
- [ ] Long scripts are scrollable
- [ ] Rapid hover changes perform smoothly
- [ ] Text truncation works for long values

### Performance
- [ ] Storybook starts in ~2 seconds
- [ ] Fragment parsing completes in <300ms
- [ ] Highlight transitions in 50-100ms
- [ ] No visual flicker or lag

### Backward Compatibility
- [ ] Parser story still works after extraction
- [ ] No regressions in existing functionality

---

## Troubleshooting

### Issue: Fragments panel not updating on editor change
**Solution**: Check browser console for parse errors. Verify editor is wired to `onDidChangeModelContent` event.

### Issue: Highlights not appearing
**Solution**: Verify hover event handlers attached to runtime blocks and memory entries. Check CSS transition classes applied.

### Issue: Toggles not persisting
**Solution**: Check browser console for sessionStorage errors. Verify storage key: `jit-compiler-demo-panel-state`.

### Issue: Parser story broken after extraction
**Solution**: Verify import paths in Parser.tsx. Ensure FragmentVisualizer exported from `src/components/fragments/index.ts`.

---

## Success Criteria

**✅ Quickstart PASSES if**:
- All 11 test scenarios complete successfully
- All validation checklist items checked
- No console errors during testing
- Performance targets met (highlight transitions, parsing speed)
- Parser story remains functional

**❌ Quickstart FAILS if**:
- Any critical functional requirement not working
- Performance targets exceeded (>100ms highlights, >500ms parsing)
- Parser story regression
- Console errors present

---

## Next Steps

After successful quickstart validation:
1. Run full unit test suite: `npm run test:unit`
2. Run Storybook interaction tests: `npm run test:storybook`
3. Run build verification: `npm run build-storybook`
4. Document any issues found in GitHub issue tracker
5. Mark feature as complete if all tests pass

**Estimated Total Time**: ~5 minutes for manual quickstart validation
