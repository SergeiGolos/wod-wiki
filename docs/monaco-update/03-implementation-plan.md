# Implementation Plan - Enhanced Monaco Editor

## Overview

This document outlines a phased implementation plan for building the enhanced markdown editor with WOD block support, context overlays, and inline workout execution.

## Design Principles

1. **No breaking changes** - Existing components remain functional
2. **Incremental delivery** - Each phase produces testable functionality
3. **Component isolation** - New features in separate directory
4. **Test coverage** - Unit tests for each new component
5. **Documentation first** - Storybook stories demonstrate features

## Phase 1: Foundation & Block Detection

### Goal
Create the basic markdown editor infrastructure and WOD block detection system.

### Tasks

#### 1.1 Create Base Component Structure
- [ ] Create `src/markdown-editor/` directory
- [ ] Create `MarkdownEditor.tsx` - Basic Monaco wrapper with markdown language
- [ ] Register markdown language mode (or use existing markdown support)
- [ ] Add basic styling and layout (full-page container)

**Acceptance Criteria:**
- Monaco editor renders in markdown mode
- Full page layout with proper sizing
- Basic markdown syntax highlighting works

**Testing:**
- Storybook story: `MarkdownEditor.stories.tsx` with sample markdown
- Can type and edit markdown content
- No console errors or warnings

#### 1.2 WOD Block Detection
- [ ] Create `utils/blockDetection.ts`
- [ ] Implement `detectWodBlocks(text: string): WodBlock[]`
- [ ] Track block line ranges and content
- [ ] Handle block add/remove/edit scenarios

**Acceptance Criteria:**
- Correctly identifies all `````wod` blocks in content
- Tracks line numbers accurately
- Updates on content changes
- Handles edge cases (nested backticks, incomplete blocks)

**Testing:**
- Unit tests: `blockDetection.test.ts`
  - Single WOD block detection
  - Multiple WOD blocks
  - Empty document
  - Malformed blocks
  - Block editing scenarios

#### 1.3 Block State Management
- [ ] Create `WodBlockManager.tsx` component
- [ ] Create `hooks/useWodBlocks.ts` hook
- [ ] Implement block registration/unregistration
- [ ] Track active block (cursor position detection)

**Acceptance Criteria:**
- Blocks are detected on content change (debounced)
- Active block determined by cursor position
- Block state updates correctly on edits
- Old blocks cleaned up when removed

**Testing:**
- Unit tests: `useWodBlocks.test.ts`
- Integration test: Add/remove blocks, verify state
- Storybook story showing block detection indicators

**Estimated Time:** 2-3 days

---

## Phase 2: Parser Integration

### Goal
Connect WOD block detection to the existing parser and display parsing results.

### Tasks

#### 2.1 Parser Hook
- [ ] Create `hooks/useBlockParser.ts`
- [ ] Create parser instance per block
- [ ] Parse block content on changes (debounced)
- [ ] Track parsing errors and statements

**Acceptance Criteria:**
- Each block has its own `MdTimerRuntime` instance
- Parsing happens 500ms after content changes
- Parsed statements stored in block state
- Parse errors captured and displayed

**Testing:**
- Unit tests: `useBlockParser.test.ts`
- Test valid WOD scripts
- Test invalid scripts with errors
- Test parser cleanup on block removal

#### 2.2 Visual Feedback for Blocks
- [ ] Add decorations to mark WOD block boundaries
- [ ] Highlight active block
- [ ] Show parse errors inline (decorations or gutter icons)
- [ ] Add gutter icons for parsed blocks

**Acceptance Criteria:**
- Visual distinction for WOD block regions
- Active block clearly highlighted
- Parse errors visible inline
- Success indicators for valid blocks

**Testing:**
- Storybook story: Show various parse states
- Visual regression tests (screenshots)

**Estimated Time:** 1-2 days

---

## Phase 3: Context Overlay Widget

### Goal
Create the right-side context panel that displays fragment information and controls.

### Tasks

#### 3.1 Base Widget Infrastructure
- [ ] Create `widgets/ReactMonacoWidget.ts` - Base class for React widgets
- [ ] Create `widgets/ContextOverlay.tsx` - Overlay widget implementation
- [ ] Handle widget lifecycle (mount/unmount)
- [ ] Position overlay on right side of editor

**Acceptance Criteria:**
- Overlay renders as `IOverlayWidget`
- Positioned on right half of editor
- Shows/hides based on active block
- Properly cleaned up on unmount

**Testing:**
- Unit tests: Widget lifecycle
- Storybook story: Overlay positioning
- Test on different viewport sizes

#### 3.2 Fragment Display Panel
- [ ] Create `components/ContextPanel.tsx`
- [ ] Integrate `FragmentVisualizer` component
- [ ] Display parsed fragments for active block
- [ ] Show parse errors in panel

**Acceptance Criteria:**
- Fragments displayed in context panel
- Color-coded by fragment type (reuse existing colors)
- Updates when block content changes
- Shows error state for parse failures

**Testing:**
- Storybook story: Various workout types
- Test fragment visualization updates

#### 3.3 Panel Responsive Behavior
- [ ] Handle editor resize events
- [ ] Adjust panel width dynamically
- [ ] Collapse panel on narrow viewports
- [ ] Add show/hide toggle

**Acceptance Criteria:**
- Panel adapts to viewport width
- Minimum width maintained (300px)
- Toggle button works
- Smooth transitions

**Testing:**
- Test on mobile/tablet/desktop viewports
- Responsive behavior story

**Estimated Time:** 2-3 days

---

## Phase 4: Fragment Editing UI

### Goal
Allow users to add and edit workout statements through the context panel.

### Tasks

#### 4.1 Fragment Editor Component
- [ ] Create `components/FragmentEditor.tsx`
- [ ] UI for adding new statements (effort, timer, rounds)
- [ ] Forms for editing fragment values
- [ ] Exercise search/autocomplete integration

**Acceptance Criteria:**
- Can add new effort statements
- Can add timer fragments
- Can add rounds fragments
- Exercise autocomplete works
- Changes update editor content

**Testing:**
- Storybook story: Fragment editor controls
- Test each fragment type addition
- Test exercise search

#### 4.2 Statement Editing
- [ ] Click on parsed statement to edit
- [ ] Inline editing of fragment values
- [ ] Delete statement functionality
- [ ] Reorder statements (drag and drop, optional)

**Acceptance Criteria:**
- Clicking fragment opens editor
- Changes sync to editor immediately
- Delete removes statement from editor
- UI feedback for actions

**Testing:**
- Integration test: Edit statement, verify editor update
- Test each fragment type edit

#### 4.3 Text Synchronization
- [ ] Update editor content when adding statements
- [ ] Maintain cursor position
- [ ] Preserve formatting and spacing
- [ ] Handle concurrent manual edits

**Acceptance Criteria:**
- Editor text updates correctly
- Cursor stays in reasonable position
- No text corruption on updates
- Manual edits don't break synchronization

**Testing:**
- Test various edit scenarios
- Test rapid typing + panel edits
- Edge cases (empty blocks, partial edits)

**Estimated Time:** 3-4 days

---

## Phase 5: Clock View Zone

### Goal
Display workout timer inline after WOD block end.

### Tasks

#### 5.1 View Zone Infrastructure
- [ ] Create `zones/ReactViewZone.ts` - Base class for React view zones
- [ ] Create `zones/ClockViewZone.tsx` - Clock zone implementation
- [ ] Handle view zone lifecycle
- [ ] Position zone after block end line

**Acceptance Criteria:**
- View zone renders inline
- Positioned after ```` ``` closing line
- Properly sized (height auto-adjusts)
- Cleaned up when block removed

**Testing:**
- Unit tests: View zone lifecycle
- Storybook story: View zone rendering

#### 5.2 Clock Display Integration
- [ ] Integrate `ClockAnchor` component
- [ ] Integrate `TimeDisplay` component
- [ ] Show placeholder when runtime not started
- [ ] Display timer when runtime active

**Acceptance Criteria:**
- Clock renders in view zone
- Shows "Ready to start" when inactive
- Updates in real-time during workout
- Proper time formatting (existing components)

**Testing:**
- Storybook story: Clock states (inactive, active, paused, complete)
- Visual regression tests

#### 5.3 Zone Position Management
- [ ] Update zone position when block moves (edits above)
- [ ] Handle multiple zones (multiple blocks)
- [ ] Remove zone when block removed
- [ ] Smooth transitions on position changes

**Acceptance Criteria:**
- Zone follows block as content changes
- Multiple zones don't interfere
- No flickering on updates
- Proper cleanup

**Testing:**
- Test editing above block (zone should move)
- Test multiple blocks with zones
- Test rapid block add/remove

**Estimated Time:** 2-3 days

---

## Phase 6: Runtime Integration

### Goal
Connect workout execution to the UI, enabling start/stop/pause controls.

### Tasks

#### 6.1 Runtime Hook
- [ ] Create `hooks/useBlockRuntime.ts`
- [ ] Create runtime instance on workout start
- [ ] Manage runtime lifecycle (start/stop/pause/resume)
- [ ] Clean up runtime on stop or block removal

**Acceptance Criteria:**
- Runtime created only when needed
- Start/stop/pause/resume work correctly
- Runtime disposed properly
- Memory released on cleanup

**Testing:**
- Unit tests: `useBlockRuntime.test.ts`
- Test runtime lifecycle transitions
- Test cleanup scenarios

#### 6.2 Workout Controls
- [ ] Create `components/WorkoutControls.tsx`
- [ ] Add to context panel
- [ ] Start/stop/pause/resume buttons
- [ ] Workout state indicators

**Acceptance Criteria:**
- Controls appear in context panel
- Start button creates runtime and begins execution
- Stop button halts and cleans up runtime
- Pause/resume toggle during execution
- Disabled states when inappropriate

**Testing:**
- Storybook story: Control states
- Integration test: Full workout lifecycle

#### 6.3 Clock Updates
- [ ] Connect runtime to clock display
- [ ] Emit tick events to clock
- [ ] Update clock state (countdown/countup)
- [ ] Handle workout completion

**Acceptance Criteria:**
- Clock updates at proper intervals (matches existing behavior)
- Countdown/countup displays correctly
- Clock stops at workout completion
- Completion state displayed

**Testing:**
- Integration test: Start workout, verify clock updates
- Test completion scenario

**Estimated Time:** 2-3 days

---

## Phase 7: Results View Zone

### Goal
Display workout results inline after workout completion.

### Tasks

#### 7.1 Results Zone
- [ ] Create `zones/ResultsViewZone.tsx`
- [ ] Position after clock zone (higher ordinal)
- [ ] Show only after workout completion
- [ ] Handle zone lifecycle

**Acceptance Criteria:**
- Zone appears only after workout completes
- Positioned below clock zone
- Proper height allocation
- Removed on workout restart

**Testing:**
- Storybook story: Results zone rendering
- Test appearance timing

#### 7.2 Results Table Component
- [ ] Create `components/ResultsTable.tsx`
- [ ] Display workout metrics (time, rounds, reps)
- [ ] Format data in table layout
- [ ] Export functionality (optional, future)

**Acceptance Criteria:**
- Table displays all relevant metrics
- Data matches workout execution
- Clean, readable layout
- Proper formatting

**Testing:**
- Unit tests: Data formatting
- Storybook story: Various workout result types

#### 7.3 Data Collection
- [ ] Capture metrics during workout execution
- [ ] Store completion data
- [ ] Handle partial completions (stopped early)
- [ ] Format for table display

**Acceptance Criteria:**
- All metrics captured from runtime
- Data persists after workout stops
- Incomplete workouts show partial data
- Data structure matches table expectations

**Testing:**
- Integration test: Complete workout, verify data
- Test partial completion scenarios

**Estimated Time:** 2-3 days

---

## Phase 8: Multiple Blocks & Markdown Features

### Goal
Support multiple simultaneous workouts and basic markdown editing features.

### Tasks

#### 8.1 Multi-Block Support
- [ ] Multiple independent runtimes
- [ ] Multiple overlays (one per block)
- [ ] Multiple view zones
- [ ] Proper state isolation

**Acceptance Criteria:**
- Can start multiple workouts simultaneously
- Each block has independent state
- No cross-block interference
- Memory properly managed

**Testing:**
- Integration test: Multiple active blocks
- Stress test: Many blocks (10+)

#### 8.2 Markdown Toolbar
- [ ] Create `components/MarkdownToolbar.tsx`
- [ ] Basic formatting buttons (bold, italic, headers)
- [ ] Insert WOD block button
- [ ] Toolbar positioning (top overlay)

**Acceptance Criteria:**
- Toolbar positioned at top
- Formatting buttons work
- Insert WOD block creates template
- Keyboard shortcuts supported

**Testing:**
- Storybook story: Toolbar controls
- Test formatting operations

#### 8.3 Title Line Extraction
- [ ] Parse first line as title
- [ ] Display in header/metadata
- [ ] Use for file saving (future)
- [ ] Validate title format

**Acceptance Criteria:**
- First line treated as title
- Title displayed separately (if UI added)
- Non-title markdown starts from line 2
- Date parsing (if formatted as date)

**Testing:**
- Unit tests: Title extraction
- Test various title formats

**Estimated Time:** 2-3 days

---

## Phase 9: Polish & Optimization

### Goal
Refine UX, improve performance, add documentation.

### Tasks

#### 9.1 Performance Optimization
- [ ] Debounce/throttle expensive operations
- [ ] Lazy widget creation
- [ ] Efficient decoration updates
- [ ] Profile and optimize hot paths

**Acceptance Criteria:**
- No noticeable lag on typing
- Smooth widget transitions
- Memory usage reasonable
- No memory leaks

**Testing:**
- Performance benchmarks
- Memory leak detection tests

#### 9.2 UX Refinements
- [ ] Smooth animations/transitions
- [ ] Loading states
- [ ] Error recovery
- [ ] Accessibility (keyboard navigation)

**Acceptance Criteria:**
- Professional look and feel
- Intuitive interactions
- Proper ARIA labels
- Keyboard-friendly

**Testing:**
- Accessibility audit
- User testing feedback

#### 9.3 Documentation
- [ ] Component API documentation
- [ ] Usage examples in stories
- [ ] Integration guide
- [ ] Migration notes

**Acceptance Criteria:**
- All public APIs documented
- Example stories for each feature
- README updated
- JSDoc comments added

**Testing:**
- Documentation review
- Example stories verified

**Estimated Time:** 2-3 days

---

## Testing Strategy

### Unit Tests
- Block detection logic
- Parser integration hooks
- Runtime lifecycle hooks
- Data formatting utilities

### Integration Tests
- Full workflow: Type → Parse → Start → Complete → Results
- Multi-block scenarios
- Error handling flows
- State synchronization

### Visual Tests
- Storybook stories for all components
- Screenshot comparisons (optional)
- Responsive layout tests

### Manual Testing Checklist
- [ ] Create markdown document
- [ ] Add WOD block
- [ ] Edit workout in context panel
- [ ] Start workout
- [ ] Pause/resume workout
- [ ] Complete workout
- [ ] View results
- [ ] Add second WOD block
- [ ] Start both workouts
- [ ] Edit markdown between blocks
- [ ] Remove WOD block
- [ ] Verify cleanup

---

## Risk Mitigation

### Risk: Monaco Widget Complexity
**Mitigation:** Start with simple widget, iterate. Use base classes to abstract complexity.

### Risk: State Synchronization Issues
**Mitigation:** Thorough testing of edit scenarios. Clear state ownership rules.

### Risk: Performance with Many Blocks
**Mitigation:** Lazy widget creation. Profiling and optimization phase planned.

### Risk: Breaking Existing Functionality
**Mitigation:** Parallel implementation. No changes to existing components. Comprehensive regression tests.

---

## Estimated Total Timeline

| Phase | Days | Cumulative |
|-------|------|------------|
| Phase 1: Foundation | 2-3 | 3 |
| Phase 2: Parser | 1-2 | 5 |
| Phase 3: Context Overlay | 2-3 | 8 |
| Phase 4: Fragment Editor | 3-4 | 12 |
| Phase 5: Clock Zone | 2-3 | 15 |
| Phase 6: Runtime | 2-3 | 18 |
| Phase 7: Results | 2-3 | 21 |
| Phase 8: Multi-Block | 2-3 | 24 |
| Phase 9: Polish | 2-3 | 27 |

**Total: 3-4 weeks** of focused development

---

## Success Criteria

### MVP (Minimum Viable Product)
After Phase 6, the system should:
- ✅ Display markdown editor with WOD block support
- ✅ Parse and visualize WOD blocks in context panel
- ✅ Allow starting workouts and viewing clock
- ✅ No breaking changes to existing code

### Full Feature Set
After Phase 9, the system should:
- ✅ All MVP features plus:
- ✅ Fragment editing through context panel
- ✅ Results display after completion
- ✅ Multiple simultaneous workouts
- ✅ Basic markdown formatting tools
- ✅ Professional polish and documentation

---

## Future Enhancements (Out of Scope)

These features are identified but not included in this plan:

1. **File persistence** - Save/load markdown files
2. **Workout library** - Catalog of saved workouts
3. **Advanced editing** - Drag-and-drop reordering
4. **Export formats** - PDF, print-friendly views
5. **Collaboration** - Real-time multi-user editing
6. **Mobile app** - Native mobile experience
7. **Analytics** - Workout history and progress tracking
8. **Social features** - Sharing workouts

These can be addressed in future iterations once the core functionality is proven.
