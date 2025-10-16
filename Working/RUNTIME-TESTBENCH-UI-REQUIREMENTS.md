# Runtime Test Bench UI Requirements

## Executive Summary

This document defines comprehensive UI requirements for a **Runtime Test Bench** component that serves as an effective interface for testing, debugging, and inspecting the WOD Wiki JIT compilation and script execution pipeline. The test bench is designed as a developer tool built upon the existing `JitCompilerDemo` component, optimized for:

- **Clean Visualization**: Clearly display runtime state, memory allocation, and execution flow
- **Screen Efficiency**: Fit all essential information into standard desktop/tablet screens
- **Inspection Capabilities**: Enable deep inspection of runtime blocks, memory entries, and metrics
- **Workflow Clarity**: Guide developers through the workout compilation and execution process

---

## 1. Core Interface Architecture

### 1.1 Purpose and Scope

The Runtime Test Bench is a **development tool** that allows engineers to:

1. **Author Workouts**: Write workout scripts using WOD Wiki syntax
2. **Compile Incrementally**: Step through JIT compilation process
3. **Execute Stepwise**: Advance through runtime blocks one at a time
4. **Inspect State**: View memory, stack, metrics, and runtime context
5. **Debug Issues**: Trace block execution, memory allocation, and event handling

### 1.2 Key Design Principles

- **Progressive Disclosure**: Show summary by default, deep details on demand (hover/expand)
- **Spatial Separation**: Logical grouping by function (Editor, Compilation, Execution, Memory)
- **Color Coding**: Use consistent color scheme for block types and states
- **Real-time Feedback**: Update all visualizations synchronously with runtime state
- **Keyboard Navigation**: Support shortcuts for rapid testing iteration

---

## 2. Main Layout Structure

### 2.1 Overall Grid Layout (3-Section Design)

The runtime test bench uses a **responsive grid layout** optimized for developer workflows:

```
┌─────────────────────────────────────────────────────────────┐
│                    HEADER / TOOLBAR                         │
├──────────────────────┬──────────────────────────────────────┤
│                      │                                      │
│   EDITOR PANEL       │     COMPILATION PANEL                │
│   (Left: 35%)        │     (Right: 65%)                     │
│                      │                                      │
├──────────────────────┼──────────────────────────────────────┤
│                      │                                      │
│   RUNTIME STACK      │     MEMORY VISUALIZATION             │
│   (Bottom-Left: 35%) │     (Bottom-Right: 65%)              │
│                      │                                      │
└──────────────────────┴──────────────────────────────────────┘
```

**Rationale**: 
- Editor positioned for quick access to script modifications
- Compilation panel gives immediate feedback on parsing/compilation status
- Runtime stack shows current execution context
- Memory visualization displays runtime state details

### 2.2 Alternative Compact Layout (2-Section)

For smaller screens or focused workflows:

```
┌──────────────────────────────────────────┐
│          EDITOR + CONTROLS               │
├──────────────────────────────────────────┤
│   RUNTIME STATE + MEMORY (Tabbed)        │
└──────────────────────────────────────────┘
```

---

## 3. Detailed Panel Specifications

### 3.1 Editor Panel

**Purpose**: Primary interface for creating and modifying workout scripts

#### 3.1.1 Components

1. **Header**
   - Title: "Create Workout"
   - Optional subtitle showing filename or date
   - Line number indicator when hovering over blocks
   - Status badge: "Parsing...", "✓ Valid", "✗ Syntax Error"

2. **Script Editor (Monaco-based)**
   - Code highlighting using WOD Wiki syntax rules
   - Line numbers enabled
   - Word wrap optional (user preference)
   - Current line highlight from runtime execution
   - Syntax error indicators with red squiggles
   - Minimap for large scripts (optional)

3. **Line Highlight Feature**
   - When hovering over a runtime block, highlight its source line in the editor
   - Visual indicator: Orange border on source line
   - Helps understand block-to-source mapping

4. **Keyboard Shortcuts**
   - `Ctrl+Enter`: Execute next block
   - `Ctrl+Shift+R`: Reset runtime
   - `Ctrl+,`: Toggle settings

#### 3.1.2 Behavior

- Real-time parsing as user types (debounced 500ms)
- Parse errors show inline with error messages
- Script changes trigger automatic recompilation
- Cursor position tracked for context-aware compilation

#### 3.1.3 Visual Style

```css
/* Editor Container */
.editor-panel {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  overflow: hidden;
}

/* Status Badge */
.status-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
}

.status-valid { background: #dcfce7; color: #16a34a; }
.status-error { background: #fee2e2; color: #dc2626; }
.status-parsing { background: #fef3c7; color: #b45309; }
```

---

### 3.2 Compilation Panel (Parsed Workout Breakdown)

**Purpose**: Display how the script is parsed and compiled into runtime blocks

#### 3.2.1 Components

1. **Header**
   - Title: "Parsed Workout" or "Compilation Result"
   - Statistic: "{X} statements", "{Y} fragments"
   - Filter: Toggle to show only "Errors", "Warnings", "All"

2. **Statement Table**
   - Columns:
     - **Line**: Source line number (clickable → scrolls editor)
     - **Position**: Character offset range `[col-col]`
     - **Fragment Type**: Token type (Timer, Effort, Rep Count, etc.)
     - **Parsed Value**: Interpreted value or error
     - **Status**: ✓ Valid, ⚠ Warning, ✗ Error

3. **Fragment Visualizer** (for each statement)
   - Display parsed fragments with syntax highlighting
   - Show token sequence: `[Timer] 20:00 → [Amount] 5 → [Exercise] Pullups`
   - Color coding for fragment types:
     - **Timer**: Blue (#3b82f6)
     - **Effort**: Green (#22c55e)
     - **Group/Rounds**: Purple (#a855f7)
     - **Metric**: Amber (#f59e0b)
     - **Error**: Red (#ef4444)

4. **Error/Warning Display**
   - Inline error messages below problematic statements
   - Error code and description
   - Suggested fix if available
   - Link to documentation

#### 3.2.2 Interaction

- **Hover on Statement**: 
  - Highlight corresponding line in editor
  - Show full parsed object in popover
  - Highlight associated runtime block (if executed)

- **Click on Error**:
  - Jump to source line in editor
  - Display error details panel
  - Show related documentation

- **Fragment Inspection**:
  - Hover over fragment to see raw token data
  - Show metadata: source position, validation status

#### 3.2.3 Visual Style

```css
.statement-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
}

.statement-row {
  border-bottom: 1px solid #f3f4f6;
  transition: background-color 0.2s;
}

.statement-row:hover {
  background-color: #f9fafb;
}

.statement-row.error {
  background-color: #fef2f2;
  border-left: 3px solid #ef4444;
}

.fragment-badge {
  display: inline-block;
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  font-weight: 600;
  margin-right: 0.25rem;
}

.fragment-timer { background: #dbeafe; color: #1e40af; }
.fragment-effort { background: #dcfce7; color: #15803d; }
.fragment-group { background: #e9d5ff; color: #6b21a8; }
.fragment-metric { background: #fef3c7; color: #92400e; }
.fragment-error { background: #fee2e2; color: #991b1b; }
```

---

### 3.3 Runtime Stack Panel

**Purpose**: Display the current execution context and block hierarchy

#### 3.3.1 Components

1. **Header**
   - Title: "Runtime Stack"
   - Status: "Active Block: {N} / {Total}"
   - Progress bar showing stack depth
   - Block count: "{X} blocks"

2. **Block List** (bottom-first order, root → current)
   - Each block shows:
     - **Display Name**: Block type or identifier
     - **Block Type Tag**: (Timer, Effort, Rounds, Group, Idle, Completion)
     - **Key**: Unique block identifier (truncated with tooltip)
     - **Depth**: Indentation level in hierarchy
     - **Active Indicator**: Arrow (→) pointing to current block
     - **Metrics** (inline): Key values like "21 reps", "20:00 remaining"
     - **Status**: Running, Paused, Completed

3. **Color Coding by Type**
   ```
   Root        → Slate background (#f1f5f9)
   Timer       → Blue background (#dbeafe)
   Effort      → Green background (#dcfce7)
   Group       → Purple background (#e9d5ff)
   Rounds      → Purple background (#e9d5ff)
   Completion  → Emerald background (#ccfbf1)
   Idle        → Gray background (#f3f4f6)
   ```

4. **Active Block Highlight**
   - Bright blue border (3px solid #2563eb)
   - Light blue background (#eff6ff)
   - Subtle glow shadow

#### 3.3.2 Interaction

- **Hover on Block**:
  - Show detailed block information in tooltip
  - Highlight associated memory entries
  - Highlight source lines in editor

- **Click on Block**:
  - Open detailed inspector modal
  - Show full block state, children, metrics
  - Display memory allocations owned by this block

- **Right-click on Block**:
  - Copy block key to clipboard
  - Jump to source in editor
  - Show block lifecycle methods

#### 3.3.3 Compact Block Display Format

```
┌─────────────────────────────────────────────┐
│ ► TimerBlock (Timer)                [20:00] │ Active
│   └─ EffortBlock (Effort)        [5 × Reps] │
│       └─ ExerciseBlock          [Pullups]   │
│   └─ EffortBlock (Effort)        [10 × Reps]│
│       └─ ExerciseBlock          [Pushups]   │
└─────────────────────────────────────────────┘
```

**Indentation**: Each nesting level adds 12px left padding

#### 3.3.4 Visual Style

```css
.runtime-stack {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  max-height: 400px;
  overflow-y: auto;
}

.block-item {
  padding: 0.5rem 0.75rem;
  margin-bottom: 0.25rem;
  border-left: 3px solid transparent;
  border-radius: 0.25rem;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;
}

.block-item:hover {
  background-color: #f9fafb;
}

.block-item.active {
  border: 2px solid #2563eb;
  background-color: #eff6ff;
  border-left: 3px solid #2563eb;
}

.block-key {
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 0.75rem;
  color: #6b7280;
}

.block-status {
  float: right;
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.125rem 0.5rem;
  border-radius: 0.25rem;
}

.block-status.running { background: #dcfce7; color: #15803d; }
.block-status.paused { background: #fef3c7; color: #92400e; }
.block-status.completed { background: #ccfbf1; color: #0d9488; }
```

---

### 3.4 Memory Visualization Panel

**Purpose**: Display runtime memory allocations, heap state, and data structures

#### 3.4.1 Components

1. **Header**
   - Title: "Memory Space"
   - Statistics: "{X} total entries"
   - Breakdown: "{N} metrics", "{M} timers", "{P} handlers", etc.
   - Filter controls: By owner, by type, by validity

2. **Memory Table** (Grouped by Owner Block)
   - Columns:
     - **ID**: Memory identifier (truncated, full value in tooltip)
     - **Type**: Memory type (metric, timer-state, loop-state, handler, etc.)
     - **Owner**: Block key that owns this memory
     - **Status**: Valid (✓ green), Invalid (✗ red), Stale (⚠ yellow)
     - **Children**: Count of child references

3. **Memory Entry Details** (Popover on hover)
   - Triggered on row hover
   - Positioned above cursor to avoid obscuring table
   - Content:
     - Header: ID, Type badge, Validity indicator
     - Value section (stringified or structured JSON)
     - Footer: Ownership, children count, validity status
   - Max height: 320px (with scrolling)
   - Width: 384px (max-w-sm)

4. **Type Badges**
   ```
   metric          → Blue badge
   timer-state     → Cyan badge
   loop-state      → Purple badge
   group-state     → Indigo badge
   handlers        → Green badge
   metrics         → Blue badge
   spans           → Orange badge
   ```

5. **Validity Indicators**
   - **Valid** (green dot): Memory is current and accessible
   - **Invalid** (red dot): Memory is stale or deallocated
   - **Stale** (yellow dot): Memory exists but not actively used

#### 3.4.2 Interaction

- **Hover on Row**: 
  - Show value popover
  - Highlight owning block in runtime stack
  - Show metadata

- **Click on Entry**:
  - Pin popover to stay visible
  - Allow text selection and copying

- **Filter**:
  - By owner block: Show only memory owned by selected block
  - By type: Show only specific memory types
  - By validity: Hide invalid/stale entries

#### 3.4.3 Memory Entry Popover Design

```
┌─ POPOVER ───────────────────────────────────┐
│ ● value_abc123          [metric]  [✓ Valid] │
│                                              │
│ Object Structure:                           │
│ {                                           │
│   "type": "pullup",                         │
│   "value": 5,                               │
│   "unit": "reps",                           │
│   "sourceId": 42,                           │
│   "blockId": "blk-xyz"                      │
│ }                                           │
│                                              │
│ Children: 2        Valid                    │
└──────────────────────────────────────────────┘
```

#### 3.4.4 Visual Style

```css
.memory-table {
  width: 100%;
  font-size: 0.875rem;
  border-collapse: collapse;
}

.memory-row {
  border-bottom: 1px solid #e5e7eb;
  transition: background-color 0.2s;
}

.memory-row:hover {
  background-color: #f3f4f6;
  cursor: pointer;
}

.memory-row.highlighted {
  background-color: #dbeafe;
  border-left: 3px solid #0284c7;
}

.memory-row.invalid {
  opacity: 0.5;
}

.memory-table th {
  background-color: #f9fafb;
  font-weight: 600;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 0.5rem 0.75rem;
  text-align: left;
  border-bottom: 2px solid #e5e7eb;
}

.validity-dot {
  display: inline-block;
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 50%;
  margin-right: 0.5rem;
}

.validity-dot.valid { background: #22c55e; }
.validity-dot.invalid { background: #ef4444; }
.validity-dot.stale { background: #eab308; }

.popover {
  position: fixed;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);
  padding: 1rem;
  max-width: 24rem;
  max-height: 20rem;
  z-index: 50;
  overflow-y: auto;
}

.popover-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.75rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid #f3f4f6;
}
```

---

### 3.5 Runtime Controls Panel

**Purpose**: Provide execution controls and state management

#### 3.5.1 Components

1. **Main Controls**
   - **Next Block Button**
     - Label: "Next Block" or "Step"
     - State: Enabled, Disabled (when script complete), Loading
     - Keyboard shortcut: `Ctrl+Enter`
     - Tooltip: "Advance to next block in runtime execution"
     - Shows queue count: "Next Block (3 queued)" if rapid-clicked

   - **Reset Button**
     - Label: "Reset" or "Restart"
     - Restarts runtime from beginning
     - Clears execution state

   - **Refresh UI Button** (optional)
     - Force synchronize UI with runtime state
     - Useful for debugging UI sync issues

2. **Status Indicator**
   - Shows current execution status: Running, Paused, Completed, Error
   - Color coded: Green (running), Yellow (paused), Gray (idle), Red (error)
   - Animated pulse when processing

3. **Event Queue Display**
   - Shows pending events from rapid clicks
   - Format: "⏳ Processing next event... (3 queued)"
   - Auto-clears when all events processed

#### 3.5.2 Interaction

- **Click Next Block**:
  - Disabled temporarily while processing
  - Queues additional clicks if rapid
  - Updates all visualizations on completion
  - Shows brief loading indicator

- **Click Reset**:
  - Clears all runtime state
  - Resets stack to empty
  - Resets memory
  - Returns to initial script state

- **Keyboard Shortcuts**:
  - `Ctrl+Enter` or `Cmd+Enter`: Next Block
  - `Ctrl+Shift+R`: Reset
  - `Ctrl+,`: Toggle settings panel

#### 3.5.3 Visual Style

```css
.controls-panel {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  padding: 1rem;
  display: flex;
  align-items: center;
  gap: 1rem;
}

.button {
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
  font-weight: 600;
  font-size: 0.875rem;
  transition: all 0.2s;
  cursor: pointer;
  border: none;
}

.button.primary {
  background: #2563eb;
  color: white;
}

.button.primary:hover {
  background: #1d4ed8;
}

.button.primary:active {
  background: #1e40af;
}

.button.primary:disabled {
  background: #d1d5db;
  color: #9ca3af;
  cursor: not-allowed;
}

.button.secondary {
  background: #4b5563;
  color: white;
}

.button.secondary:hover {
  background: #374151;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.875rem;
  font-weight: 500;
}

.status-badge.running {
  background: #dcfce7;
  color: #15803d;
}

.status-badge.running::before {
  content: '●';
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.status-badge.paused {
  background: #fef3c7;
  color: #92400e;
}

.status-badge.completed {
  background: #ccfbf1;
  color: #0d9488;
}

.status-badge.error {
  background: #fee2e2;
  color: #991b1b;
}
```

---

### 3.6 Toolbar / Header

**Purpose**: Quick access to settings, documentation, and utilities

#### 3.6.1 Components

1. **Left Section**
   - Application title: "Runtime Test Bench" or "WOD Wiki Debugger"
   - Workspace indicator: Shows current workout name or "Untitled"

2. **Center Section**
   - Progress indicator: "Block {N} of {M}"
   - Execution time: "Elapsed: 00:15.234"
   - Step counter: "Steps: 42"

3. **Right Section**
   - **Settings Menu** (gear icon)
     - Toggle panels: Show/hide Stack, Memory, Compilation
     - Color theme: Light/Dark mode
     - Syntax highlighting options
     - Font size controls

   - **Documentation Link** (help icon)
     - Link to WOD Wiki syntax guide
     - Link to runtime architecture docs
     - Link to troubleshooting guide

   - **Export/Import** (download icon)
     - Export script as JSON
     - Export execution trace
     - Import example scripts
     - Copy shareable link

#### 3.6.2 Visual Style

```css
.toolbar {
  background: linear-gradient(to right, #f8fafc, #f1f5f9);
  border-bottom: 1px solid #e2e8f0;
  padding: 0.75rem 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
}

.toolbar-section {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.workspace-name {
  font-size: 0.875rem;
  color: #6b7280;
  font-weight: 500;
}

.progress-text {
  font-size: 0.75rem;
  color: #6b7280;
  font-family: 'Monaco', monospace;
}

.icon-button {
  padding: 0.5rem;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 0.375rem;
  cursor: pointer;
  transition: all 0.2s;
  color: #6b7280;
}

.icon-button:hover {
  background: #f3f4f6;
  color: #1f2937;
}
```

---

## 4. Data Flow and Interaction Patterns

### 4.1 Event Flow Architecture

```
┌─────────────────┐
│  User Modifies  │
│  Script (Editor)│
└────────┬────────┘
         │ onChange
         ▼
┌─────────────────────┐
│  Parse & Validate   │
│  (Debounced 500ms)  │
└────────┬────────────┘
         │ statements[]
         ▼
┌──────────────────────┐
│ Compilation Panel    │ ◄─── Updates with fragments
│ Shows Parse Results  │      and errors
└──────────────────────┘

         │ user clicks "Next Block"
         ▼
┌─────────────────────┐
│ Handle NextEvent    │
│ in ScriptRuntime    │
└────────┬────────────┘
         │ runtime state changes
         ▼
┌──────────────────────┐
│ Update Visualizations│
│ Stack, Memory, Clock │
└──────────────────────┘
```

### 4.2 Cross-Panel Synchronization

**Bidirectional Highlighting**:
1. **Hover Block in Stack** → Highlight source line in editor + associated memory
2. **Hover Memory Entry** → Highlight owning block in stack
3. **Hover Fragment in Compilation** → Highlight both source and relevant block
4. **Hover Line in Editor** → Show tooltip of associated block (if any)

**State Synchronization**:
- All panels update simultaneously when runtime state changes
- Memory updates trigger re-render of stack (if ownership shown)
- Stack changes trigger memory filter update
- Clock updates trigger progress display

### 4.3 Error Handling and Recovery

**Display Error State**:
1. **Parsing Error**: 
   - Show in Compilation panel with red highlight
   - Disable "Next Block" button
   - Show error message with line number
   - Offer auto-fix suggestion

2. **Runtime Error**:
   - Show error in controls panel
   - Pause execution
   - Show stack trace in modal
   - Offer rollback option

3. **Memory Error**:
   - Mark entry as invalid in Memory panel
   - Show warning icon
   - Indicate ownership chain

---

## 5. Interface Modes and Customization

### 5.1 View Modes

1. **Full Debug Mode** (Default)
   - All panels visible
   - Complete memory visualization
   - Full runtime stack

2. **Compact Mode** (Tablets/Small Screens)
   - Editor and controls on top
   - Runtime stack and memory below (tabbed)
   - Simplified visualization

3. **Execution Focus Mode**
   - Hides editor panel
   - Emphasizes clock and controls
   - Shows only active block context
   - Good for monitoring live execution

4. **Memory Inspection Mode**
   - Expands memory panel
   - Shows owner relationships
   - Groups memory by type
   - Shows allocation history

### 5.2 Customization Options

**Settings Panel** includes:
- Panel visibility toggles
- Column visibility in tables
- Color theme (Light/Dark)
- Font size (80%-120%)
- Auto-refresh interval
- Keyboard shortcut customization
- Memory entry filtering options

---

## 6. Keyboard Shortcuts

| Shortcut | Action | Context |
|----------|--------|---------|
| `Ctrl+Enter` / `Cmd+Enter` | Execute Next Block | Global |
| `Ctrl+Shift+R` / `Cmd+Shift+R` | Reset Runtime | Global |
| `Ctrl+,` / `Cmd+,` | Open Settings | Global |
| `Ctrl+F` / `Cmd+F` | Search in Editor | Editor |
| `Ctrl+L` | Jump to Line | Editor |
| `Escape` | Close Popover/Modal | Any |
| `Enter` | Confirm Filter | Memory Panel |
| `↑` / `↓` | Navigate Stack | Stack Panel |
| `Space` | Pin/Unpin Popover | Any |

---

## 7. Responsive Design Specifications

### 7.1 Breakpoints

- **Desktop** (≥1920px): Full 4-panel layout, all visualizations visible
- **Large Tablet** (1024-1920px): 2x2 grid, slight reduction in padding
- **Tablet** (768-1024px): Stacked layout, panels reorganized
- **Mobile** (≤768px): Single column, bottom sheets for secondary panels

### 7.2 Layout Transitions

```
Desktop Layout:
┌─────────────────────────────────────────┐
│ Editor (35%) │ Compilation (65%)        │
├──────────────┼────────────────────────┤
│ Stack (35%)  │ Memory (65%)            │
└─────────────────────────────────────────┘

Tablet Layout:
┌────────────────────────────────┐
│ Editor (full width)            │
├────────────────────────────────┤
│ Compilation (full width)       │
├────────────────────────────────┤
│ Stack / Memory (tabbed)        │
└────────────────────────────────┘

Mobile Layout:
┌────────────────────────┐
│ Editor (full width)    │
├────────────────────────┤
│ Controls (full width)  │
├────────────────────────┤
│ Runtime (fullscreen    │
│  sheet when needed)    │
└────────────────────────┘
```

---

## 8. Color Palette and Theming

### 8.1 Base Palette (Light Mode)

```css
/* Grays */
--gray-50:   #f9fafb;
--gray-100:  #f3f4f6;
--gray-200:  #e5e7eb;
--gray-300:  #d1d5db;
--gray-500:  #6b7280;
--gray-600:  #4b5563;
--gray-900:  #111827;

/* Blues (Primary) */
--blue-100:  #dbeafe;
--blue-600:  #2563eb;
--blue-700:  #1d4ed8;

/* Semantic Colors */
--success:   #22c55e;    /* Green for valid */
--error:     #ef4444;    /* Red for errors */
--warning:   #f59e0b;    /* Amber for warnings */
--info:      #3b82f6;    /* Blue for info */
```

### 8.2 Block Type Colors

| Block Type | Background | Border | Text |
|-----------|-----------|--------|------|
| Root | `#f1f5f9` (slate-100) | `#cbd5e1` (slate-300) | `#1e293b` (slate-900) |
| Timer | `#dbeafe` (blue-100) | `#7dd3fc` (blue-300) | `#0c4a6e` (blue-900) |
| Effort | `#dcfce7` (green-100) | `#86efac` (green-300) | `#15803d` (green-900) |
| Rounds/Group | `#e9d5ff` (purple-100) | `#e879f9` (purple-300) | `#6b21a8` (purple-900) |
| Completion | `#ccfbf1` (emerald-100) | `#6ee7b7` (emerald-300) | `#065f46` (emerald-900) |
| Idle | `#f3f4f6` (gray-100) | `#d1d5db` (gray-300) | `#374151` (gray-700) |

### 8.3 Dark Mode (Optional)

Invert palette:
- Backgrounds: Dark (e.g., `#1f2937`)
- Text: Light (e.g., `#f3f4f6`)
- Borders: Medium gray (e.g., `#4b5563`)
- Accent colors: Increased saturation/brightness

---

## 9. Performance Considerations

### 9.1 Rendering Optimization

1. **Virtualization for Large Lists**
   - Stack with >50 blocks: Use virtual scrolling
   - Memory table with >200 entries: Use virtual scrolling

2. **Debouncing**
   - Script changes: 500ms debounce before reparse
   - Filter updates: 300ms debounce
   - Resize events: 200ms debounce

3. **Memoization**
   - Block items: `React.memo` to prevent re-renders
   - Memory table rows: Memoized with stable keys
   - Popovers: Lazy render only when visible

### 9.2 Memory Management

1. **Popover Lifecycle**
   - Unmount on hover exit (not just hide)
   - Clear references to prevent memory leaks
   - Limit to single active popover

2. **Table Scrolling**
   - Lazy load rows outside viewport
   - Unload rows when scrolled far away
   - Cache row heights for smooth scrolling

### 9.3 Update Batching

- Batch memory updates: Update all entries at once, not individually
- Use `requestAnimationFrame` for synchronized updates
- Throttle rapid Next Block clicks (queue instead of process immediately)

---

## 10. Accessibility Requirements

### 10.1 WCAG 2.1 AA Compliance

1. **Keyboard Navigation**
   - Tab through all interactive elements
   - Focus indicators clearly visible (2px outline)
   - Logical tab order (left→right, top→bottom)

2. **Color Contrast**
   - Text: 4.5:1 ratio (normal text)
   - Large text: 3:1 ratio
   - Icons: 3:1 ratio
   - Test all combinations (light/dark themes)

3. **Screen Reader Support**
   - Semantic HTML: `<button>`, `<table>`, `<section>`
   - ARIA labels for icons: `aria-label="Next Block"`
   - ARIA live regions for status updates: `aria-live="polite"`
   - Announce block changes: "Entered timer block, 20 minutes"

4. **Visual Clarity**
   - Don't rely on color alone (use icons + text)
   - Provide text labels for all buttons
   - Support high contrast mode
   - Support large text (200% zoom)

### 10.2 Error Messages

- **Visible**: Always shown, not in tooltips only
- **Clear**: Specific error description, not generic
- **Actionable**: Suggest next steps or fix
- **Accessible**: Read by screen readers

### 10.3 Focus Management

- Focus initial element on panel open (editor textarea)
- Trap focus in modals (tab wraps around)
- Return focus to trigger element on close
- Announce focus movement: "Runtime stack panel activated"

---

## 11. Future Enhancements

### 11.1 Phase 2 Features

1. **Execution Timeline**
   - Visual timeline showing block execution history
   - Timeline with time durations
   - Rewind capability to previous state

2. **Memory Profiling**
   - Memory usage graph over time
   - Allocation/deallocation patterns
   - Memory leak detection

3. **Performance Metrics**
   - Block execution time tracking
   - Slowest blocks identification
   - Performance recommendations

4. **Advanced Debugging**
   - Breakpoints on specific blocks
   - Conditional execution
   - Memory watches (alert on change)

### 11.2 Phase 3 Features

1. **Collaborative Debugging**
   - Share execution state via URL
   - Compare two runtime states side-by-side
   - Export/import execution traces

2. **Macro Recording**
   - Record series of steps
   - Replay on demand
   - Create test cases from recordings

3. **AI-Assisted Debugging**
   - Suggest improvements to workout syntax
   - Explain block relationships
   - Propose fixes for errors

---

## 12. Implementation Roadmap

### Phase 1: Foundation (Weeks 1-2)
- [ ] Implement 3-section layout grid
- [ ] Create Editor panel with Monaco integration
- [ ] Create Compilation panel with Fragment visualization
- [ ] Create Runtime Stack panel with block display
- [ ] Create Memory panel with table and popover
- [ ] Implement cross-panel highlighting

### Phase 2: Interaction (Weeks 3-4)
- [ ] Implement control buttons (Next, Reset)
- [ ] Add keyboard shortcuts
- [ ] Implement error handling UI
- [ ] Add toolbar with settings
- [ ] Responsive design breakpoints

### Phase 3: Polish (Weeks 5-6)
- [ ] Performance optimization (virtualization, memoization)
- [ ] Dark mode support
- [ ] Accessibility audit and fixes
- [ ] Comprehensive documentation
- [ ] Example workouts and tutorials

### Phase 4: Testing & Release (Week 7)
- [ ] User testing
- [ ] Bug fixes
- [ ] Performance benchmarking
- [ ] Release v1.0

---

## 13. Success Metrics

1. **Usability**
   - Developer can debug workout in <2 minutes without training
   - All core tasks completable within first 10 minutes of use
   - <2% UI-related bugs reported post-release

2. **Performance**
   - Initial load: <2 seconds
   - Next Block click: <500ms response time
   - Memory table scroll: 60 FPS
   - Panel resize: Smooth without jank

3. **Adoption**
   - Used by 100% of engineering team for debugging
   - Reduces debugging time by 50% vs. manual inspection
   - Creates 10+ educational materials leveraging the tool

---

## 14. Glossary

- **Runtime Block**: Executable unit in the runtime stack (e.g., TimerBlock, EffortBlock)
- **Memory Entry**: Allocated data structure in runtime memory (metrics, state, handlers)
- **JIT Compiler**: Just-In-Time compiler that generates runtime blocks from parsed statements
- **Statement**: Parsed line or group of lines in the workout script
- **Fragment**: Smallest parsed unit (token) within a statement
- **Block Key**: Unique identifier for a runtime block instance
- **Stack**: Execution stack containing nested runtime blocks
- **Owner**: Block that owns/allocated a memory entry

---

## Appendix A: Example Workflows

### A.1: Debugging a Parsing Error

**Scenario**: User enters invalid syntax, wants to find and fix the error.

**Steps**:
1. User types in Editor panel
2. Compilation panel shows red error highlight on problematic line
3. User clicks error message
4. Editor jumps to line with inline error explanation
5. User corrects syntax
6. Error disappears, Compilation panel updates

### A.2: Inspecting Memory During Execution

**Scenario**: User wants to understand what data is allocated when executing a timer block.

**Steps**:
1. User clicks "Next Block" to enter timer execution
2. Runtime Stack panel highlights active TimerBlock
3. User hovers over TimerBlock
4. Memory panel filters to show only memory owned by this block
5. User hovers over "timer-state" entry to see current time
6. Popover shows state structure with current elapsed time
7. User clicks Next Block again
8. Memory updates show time advancement

### A.3: Tracing Block Hierarchy

**Scenario**: User wants to understand block nesting and relationships.

**Steps**:
1. User opens workout with nested rounds (AMRAP with efforts)
2. Runtime Stack shows indented hierarchy
3. User hovers over child block
4. Source line in Editor highlights
5. User hovers over parent block
6. Compilation panel shows parent fragment
7. Memory panel shows shared state between parent and child

---

## Appendix B: Sample Scripts for Testing

### B.1 Simple AMRAP

```
20:00 AMRAP
5 Pullups
10 Pushups
15 Air Squats
```

### B.2 Multiple Rounds

```
5 Rounds For Time
10 Thrusters 95/65
15 Calorie Row
```

### B.3 EMOM

```
15:00 EMOM
Minute 1: 10 Kettlebell Swings
Minute 2: 15 Box Jumps
Minute 3: 20 Double-Unders
```

---

**Document Version**: 1.0  
**Last Updated**: October 16, 2025  
**Status**: Draft for Review  
**Prepared For**: Engineering Team  
