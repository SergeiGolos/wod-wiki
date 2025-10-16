# Runtime Test Bench - Prototype Analysis & Component Integration Research

**Date**: October 16, 2025  
**Purpose**: Analyze prototype design, existing JitCompilerDemo structure, and create integration strategy  
**Status**: Research Document

---

## Executive Summary

This document combines analysis of:
1. **Prototype UI** (code.html + screenshot) - Visual design and layout concept
2. **Existing JitCompilerDemo** (stories/compiler/JitCompilerDemo.tsx) - Functional requirements
3. **Component Architecture** (from requirements docs) - Structured design

**Goal**: Create a unified implementation strategy that leverages the prototype's clean design with the JitCompilerDemo's proven functionality.

---

## Part 1: Prototype Analysis (code.html)

### 1.1 Visual Design Review

**Color Scheme**:
```
Primary:           #FFA500 (Orange)
Background Light:  #f6f8f7
Background Dark:   #282c34 (Dark gray)
Panel Background:  #3c4049 (Slightly lighter)
Text Color:        #abb2bf (Light gray)
Success:           #98c379 (Green)
Error:             #e06c75 (Red)
Info:              #61afef (Blue)
```

**Typography**:
- Font: Space Grotesk (sans-serif)
- Size: 14px (body), 18px (headers)
- Weight: 300-700 range

**Key Observations**:
- Dark theme preferred (matches developer workflow)
- Clean, minimal design
- Material Symbols Outlined icons
- Rounded corners (0.25rem-0.75rem)
- Clear visual hierarchy

### 1.2 Layout Analysis

**Header**:
```
┌─────────────────────────────────────────────────┐
│ Logo    Navbar                  Buttons  Avatar │
│ [🏋️] WOD Wiki  [Dashboard] [Editor] [Bench]    │
│                              [►Run] [Next] [etc]│
└─────────────────────────────────────────────────┘
```

- Navigation with active state (underline on "Runtime Test Bench")
- Action buttons in header (Run, Next Block, Step Over, Step Into, Reset)
- User avatar in top right

**Main Content Grid** (3-section layout):
```
┌──────────────────────────┬──────────────────────────┐
│ Editor (col-span-4)      │ Compilation (col-span-6) │
├──────────────────────────┼──────────────────────────┤
│ Runtime Stack (col-4)    │ Memory (col-6)           │
└──────────────────────────┴──────────────────────────┘
```

- Uses Tailwind CSS grid: `grid-cols-10 grid-rows-2`
- Editor: 40% width
- Compilation: 60% width
- Stack: 40% width
- Memory: 60% width
- 16px gap between panels
- 16px padding on container

**Footer**:
```
┌──────────────────────────────────────────────┐
│ Status: Executing     Ln 8, Col 5            │
└──────────────────────────────────────────────┘
```

### 1.3 Component Details from Prototype

#### Editor Panel (Top Left)
**Header**:
- Title: "Editor"
- Background: panel-background

**Content**:
- Syntax-highlighted code (Monaco-style)
- Line numbers in gray
- Keywords colored: info (blue), success (green), error (red)
- Expandable suggestions dropdown
  - Shows at line 7 (near "pullups" mention)
  - Shows: pullups, pushups_diamond, pushups_wide
  - Hover state with bg-panel-background

**Size**: 40% width

#### Compilation Panel (Top Right)
**Header**:
- Title: "Compilation"
- Tab navigation: "Output" (active), "Errors"
- Active tab shows orange underline

**Content**:
- Console-style output
- Timestamps: [2023-10-27 10:00:XX]
- Status messages with success coloring
- Shows compilation flow:
  - "Compilation started..."
  - "Script parsed successfully."
  - "Building abstract syntax tree..."
  - "Compilation successful."

**Size**: 60% width

#### Runtime Stack Panel (Bottom Left)
**Header**:
- Title: "Runtime Stack"

**Content**:
- Hierarchical tree view with nesting
- "workout: MURPH" (root)
  - "warmup" (child)
  - **"> main"** (active, highlighted in brown/orange)
    - "pullups"
    - **"> pushups"** (current, highlighted in orange)
    - "squats"
  - "cooldown" (child)
- Active indicator: ">" prefix
- Current execution block: darker highlight

**Size**: 40% width

#### Memory Panel (Bottom Right)
**Header**:
- Title: "Memory"
- Search box: "Filter variables..."
- Search icon on left

**Content**:
- Grouped by scope:
  - **global**: user_weight: 80kg
  - **exercise: pushups**: reps_completed, reps_remaining, current_set
  - **exercise: pullups**: reps_completed, reps_remaining, current_set
- Values in error color (red: #e06c75)
- Monospace font for variables

**Size**: 60% width

---

## Part 2: JitCompilerDemo Functional Analysis

### 2.1 Current Architecture

**Component Structure**:
```typescript
JitCompilerDemo
├── State
│   ├── script: string
│   ├── runtime: ScriptRuntime
│   ├── hoveredBlockKey: string
│   ├── hoveredMemoryBlockKey: string
│   └── highlightedLine: number
│
├── ScriptEditor (Monaco-based)
│   ├── Syntax highlighting
│   ├── Line highlighting on hover
│   ├── Error display
│   └── onChange → reparse
│
├── FragmentVisualizer
│   ├── Shows parsed statements
│   ├── Displays fragment types
│   ├── Shows positions and status
│   └── Click interactions
│
├── RuntimeClockDisplay
│   ├── Finds timer blocks
│   ├── Shows ClockAnchor
│   └── Displays block key
│
├── CompactRuntimeStackVisualizer
│   ├── Shows blocks bottom-first
│   ├── Color-coded by type
│   ├── Shows active indicator
│   ├── Displays metrics inline
│   └── Hover for memory highlight
│
└── MemoryVisualizationTable
    ├── Shows all memory entries
    ├── Grouped by owner
    ├── Value popover on hover
    ├── Filter controls
    └── Validity indicators
```

### 2.2 Data Flow in JitCompilerDemo

```
User edits script
    ↓
onChange → setScript()
    ↓
useEffect watches script change
    ↓
createRuntime() via MdTimerRuntime
    ↓
JitCompiler.registerStrategy()
    ↓
New runtime created
    ↓
RuntimeStack initialized
    ↓
All visualizations update
```

### 2.3 Key Components Used

**From src/**:
- `WodWiki` - Monaco editor wrapper
- `ScriptRuntime` - Runtime system
- `JitCompiler` - Compilation engine
- `MdTimerRuntime` - Markdown parser
- `RuntimeBlock` - Block implementation
- `NextEventHandler` - Event handling
- `FragmentVisualizer` - Parser visualization
- `ClockAnchor` - Timer display

**Behaviors**:
- `TimerStrategy`, `RoundsStrategy`, `EffortStrategy`
- `TimerBehavior` with memory tracking
- `TIMER_MEMORY_TYPES` for memory classification

### 2.4 Existing Panel Implementation

**1. ScriptEditor Component**
```typescript
interface Props {
  value: string;
  onChange: (v: string) => void;
  highlightedLine?: number;
}
```
- Uses WodWiki component
- Creates cursor metadata for line highlighting
- Full Monaco features available

**2. CompactRuntimeBlockDisplay**
```typescript
interface Props {
  block: MockRuntimeBlock;
  isActive: boolean;
  isHighlighted?: boolean;
  onBlockHover: (blockKey?: string, lineNumber?: number) => void;
}
```
- Shows block with type coloring
- Displays metrics inline
- Active indicator (←)
- Hover feedback

**3. MemoryVisualizationTable**
```typescript
interface Props {
  entries: MemoryTableEntry[];
  hoveredBlockKey?: string;
  onMemoryHover: (entryId?: string, blockKey?: string) => void;
}
```
- Value popover on hover
- Positioned above cursor
- Shows full JSON for objects
- Max-height 320px with scroll

### 2.5 Missing Pieces (vs. Prototype)

| Feature | Prototype Has | JitCompilerDemo Has | Gap |
|---------|---------------|-------------------|-----|
| Header with nav | ✓ | ✗ | Need to add |
| Action buttons | ✓ | Partial | Need more buttons |
| Toolbar/Settings | ✓ | ✗ | Need to add |
| Tab navigation | ✓ | ✗ | Output/Errors tabs |
| Tree-style stack | ✗ | Partial | Current is list |
| Status footer | ✓ | ✗ | Need footer |
| Search in memory | ✓ | Partial | Need UI |
| Exercise suggestions | ✓ | ✗ | WodWiki may have |
| Theme toggle | ✓ | ✗ | Need to add |

---

## Part 3: Integration Strategy

### 3.1 Component Mapping

**Prototype → Implementation**:

| Prototype Panel | Maps To | Implementation Strategy |
|---|---|---|
| Header | Toolbar | Use new Toolbar component with navigation |
| Editor | EditorPanel | Wrap existing ScriptEditor with prototype styling |
| Compilation | CompilationPanel | Create new, show Output/Errors tabs |
| Runtime Stack | RuntimeStackPanel | Enhance CompactRuntimeStackVisualizer |
| Memory | MemoryVisualizationPanel | Enhance MemoryVisualizationTable with search |
| Footer | Status footer | New component showing execution state |

### 3.2 File Structure

```
src/
├── runtime-test-bench/
│   ├── RuntimeTestBench.tsx (main component)
│   ├── components/
│   │   ├── Toolbar.tsx (new - header + nav)
│   │   ├── EditorPanel.tsx (refactor - wrap ScriptEditor)
│   │   ├── CompilationPanel.tsx (new - tabs + output)
│   │   ├── RuntimeStackPanel.tsx (enhance - tree view)
│   │   ├── MemoryPanel.tsx (enhance - add search)
│   │   ├── ControlsPanel.tsx (refactor - move buttons)
│   │   └── StatusFooter.tsx (new)
│   ├── hooks/
│   │   ├── useRuntimeTestBench.ts (state management)
│   │   ├── useRuntimeAdapter.ts (data conversion)
│   │   └── useHighlighting.ts (cross-panel)
│   ├── adapters/
│   │   └── RuntimeAdapter.ts (ScriptRuntime → data)
│   ├── types/
│   │   ├── interfaces.ts (all interfaces)
│   │   └── types.ts (utility types)
│   └── styles/
│       └── tailwind-components.ts (reusable classes)

stories/
├── runtime-test-bench/
│   ├── RuntimeTestBench.stories.tsx (main story)
│   ├── Examples.stories.tsx (example workouts)
│   └── Interactions.stories.tsx (interaction demos)
```

### 3.3 Phase 1: Extract Existing Components

**From JitCompilerDemo.tsx**, extract as reusable components:

1. **ScriptEditor** (already extracted)
   ```typescript
   // Location: src/runtime-test-bench/components/EditorPanel.tsx
   // Wraps: WodWiki
   // Adds: Prototype styling, borders, padding
   ```

2. **RuntimeStackVisualizer** (enhance from JitCompilerDemo)
   ```typescript
   // Location: src/runtime-test-bench/components/RuntimeStackPanel.tsx
   // Current: CompactRuntimeBlockDisplay list
   // Enhance: Tree view with hierarchical display
   // Add: Better visual nesting, icons
   ```

3. **MemoryVisualizer** (enhance from JitCompilerDemo)
   ```typescript
   // Location: src/runtime-test-bench/components/MemoryPanel.tsx
   // Current: MemoryVisualizationTable
   // Add: Search input, filtering, grouping toggle
   // Add: Better visual organization
   ```

### 3.4 Phase 2: Create Missing Components

1. **Toolbar**
   ```typescript
   // New: src/runtime-test-bench/components/Toolbar.tsx
   // Shows: WOD Wiki logo, navigation, action buttons, avatar
   // Features: 
   //   - Navigation links with active state
   //   - Action buttons: Run, Next Block, Step Over, Step Into, Reset
   //   - Settings menu icon
   //   - Help icon
   //   - User avatar
   ```

2. **CompilationPanel**
   ```typescript
   // New: src/runtime-test-bench/components/CompilationPanel.tsx
   // Shows: Output and Errors tabs
   // Content:
   //   - Output tab: Compilation log with timestamps
   //   - Errors tab: Parse errors with suggestions
   // Replaces: Current FragmentVisualizer table
   ```

3. **ControlsPanel**
   ```typescript
   // New: src/runtime-test-bench/components/ControlsPanel.tsx
   // Extracted from: Current inline buttons
   // Shows: Status, block progress, elapsed time
   // Actions: Next Block, Reset
   ```

4. **StatusFooter**
   ```typescript
   // New: src/runtime-test-bench/components/StatusFooter.tsx
   // Shows: 
   //   - Execution status (Executing, Paused, Complete)
   //   - Cursor position (Ln X, Col Y)
   // Updates: With each step
   ```

### 3.5 Phase 3: Integrate with Styling

**Apply Prototype Colors**:
```typescript
// src/runtime-test-bench/styles/colors.ts
export const colors = {
  primary: '#FFA500',
  backgroundLight: '#f6f8f7',
  backgroundDark: '#282c34',
  panelBackground: '#3c4049',
  textColor: '#abb2bf',
  success: '#98c379',
  error: '#e06c75',
  info: '#61afef',
}

// Extend Tailwind in tailwind.config.js
theme: {
  extend: {
    colors: {
      'primary': '#FFA500',
      'background-light': '#f6f8f7',
      'background-dark': '#282c34',
      'panel-background': '#3c4049',
      'text-color': '#abb2bf',
      'success': '#98c379',
      'error': '#e06c75',
      'info': '#61afef',
    }
  }
}
```

**Layout Structure**:
```typescript
// src/runtime-test-bench/RuntimeTestBench.tsx
<div className="flex flex-col h-screen">
  {/* Header */}
  <Toolbar {...toolbarProps} />
  
  {/* Main Content */}
  <main className="flex-grow grid grid-cols-10 grid-rows-2 gap-4 p-4">
    {/* Top Left: Editor */}
    <div className="col-span-4 row-span-1">
      <EditorPanel {...editorProps} />
    </div>
    
    {/* Top Right: Compilation */}
    <div className="col-span-6 row-span-1">
      <CompilationPanel {...compilationProps} />
    </div>
    
    {/* Bottom Left: Stack */}
    <div className="col-span-4 row-span-1">
      <RuntimeStackPanel {...stackProps} />
    </div>
    
    {/* Bottom Right: Memory */}
    <div className="col-span-6 row-span-1">
      <MemoryPanel {...memoryProps} />
    </div>
  </main>
  
  {/* Footer */}
  <StatusFooter {...footerProps} />
</div>
```

---

## Part 4: Detailed Component Specifications

### 4.1 Toolbar Component

```typescript
interface ToolbarProps {
  currentWorkout?: string;
  navigationItems: NavItem[];
  actionButtons: ActionButton[];
  onNavigate: (path: string) => void;
  onAction: (action: string) => void;
  onSettingsClick: () => void;
  onHelpClick: () => void;
  userAvatar?: string;
}

interface NavItem {
  label: string;
  path: string;
  isActive: boolean;
}

interface ActionButton {
  id: string;
  label: string;
  icon: string;
  disabled?: boolean;
  onClick: () => void;
}

// Layout:
// Left: [🏋️ Logo] [WOD Wiki Title]
// Center: [Dashboard] [Workout Editor] [Runtime Test Bench (active)]
// Right: [▶ Run] [⏭ Next Block] [↻ Step Over] [↙ Step Into] [↻ Reset] | [⚙ Settings] [? Help] [Avatar]
```

**HTML Structure**:
```html
<header className="flex items-center justify-between whitespace-nowrap 
                   border-b border-solid border-panel-background px-6 py-3">
  <!-- Left: Logo -->
  <div className="flex items-center gap-4">
    <span className="material-symbols-outlined text-primary text-2xl">
      fitness_center
    </span>
    <h1 className="text-white text-lg font-bold">WOD Wiki</h1>
  </div>
  
  <!-- Center: Navigation -->
  <div className="flex items-center gap-6">
    <a className="text-sm font-medium" href="#">Dashboard</a>
    <a className="text-sm font-medium" href="#">Workout Editor</a>
    <a className="text-white text-sm font-bold border-b-2 border-primary pb-1" 
       href="#">Runtime Test Bench</a>
  </div>
  
  <!-- Right: Actions + Avatar -->
  <div className="flex items-center gap-4">
    <!-- Action Buttons -->
    <div className="flex items-center gap-2">
      <button className="flex items-center justify-center gap-2 rounded-lg h-10 px-4 
                        bg-primary text-background-dark text-sm font-bold">
        <span className="material-symbols-outlined">play_arrow</span>
        Run
      </button>
      <!-- More buttons... -->
    </div>
    
    <!-- Avatar -->
    <div className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-10" 
         style={{backgroundImage: 'url(...)'}} />
  </div>
</header>
```

### 4.2 EditorPanel Component

**Enhancements to current ScriptEditor**:
- Add border and padding (from prototype)
- Add header with title
- Add error status indicator
- Apply prototype colors
- Keep all existing functionality

```typescript
interface EditorPanelProps {
  value: string;
  onChange: (script: string) => void;
  highlightedLine?: number;
  errors?: ParseError[];
  status: 'idle' | 'parsing' | 'valid' | 'error';
}

// Layout:
<div className="col-span-4 row-span-1 bg-panel-background rounded-lg 
                flex flex-col p-4">
  <div className="flex justify-between items-center mb-3">
    <h2 className="text-white text-lg font-bold">Editor</h2>
    {status === 'error' && (
      <span className="text-xs text-error bg-error/10 px-2 py-1 rounded">
        ✗ Syntax Error
      </span>
    )}
  </div>
  
  <div className="relative flex-grow bg-[#282c34] rounded-md p-4 overflow-auto">
    <ScriptEditor 
      value={value}
      onChange={onChange}
      highlightedLine={highlightedLine}
    />
    
    {/* Suggestions Popup */}
    {suggestions.length > 0 && (
      <div className="absolute top-1/2 left-4 bg-background-dark p-2 rounded-lg 
                      shadow-lg border border-panel-background">
        <p className="text-sm font-bold text-white mb-1">Suggestions:</p>
        <ul>
          {suggestions.map(s => (
            <li key={s} className="text-sm p-1 hover:bg-panel-background 
                                  rounded-md cursor-pointer">
              {s}
            </li>
          ))}
        </ul>
      </div>
    )}
  </div>
</div>
```

### 4.3 CompilationPanel Component

**New component with tabs**:
```typescript
interface CompilationPanelProps {
  statements: CodeStatement[];
  errors: ParseError[];
  warnings: ParseWarning[];
  compilationLog: LogEntry[];
  activeTab: 'output' | 'errors';
  onTabChange: (tab: 'output' | 'errors') => void;
}

interface LogEntry {
  timestamp: number;
  message: string;
  level: 'info' | 'success' | 'warning' | 'error';
}

// Layout:
<div className="col-span-6 row-span-1 bg-panel-background rounded-lg 
                flex flex-col p-4">
  <h2 className="text-white text-lg font-bold">Compilation</h2>
  
  {/* Tab Navigation */}
  <div className="flex border-b border-background-dark mt-2">
    <button className="flex flex-col items-center justify-center 
                      border-b-2 border-primary text-white pb-2 px-4">
      <p className="text-sm font-bold">Output</p>
    </button>
    <button className="flex flex-col items-center justify-center 
                      border-b-2 border-transparent text-text-color pb-2 px-4">
      <p className="text-sm font-bold">Errors</p>
    </button>
  </div>
  
  {/* Content */}
  <div className="flex-grow bg-[#282c34] rounded-md p-4 mt-3 overflow-auto">
    {activeTab === 'output' ? (
      <CompilationOutput log={compilationLog} />
    ) : (
      <ErrorList errors={errors} warnings={warnings} />
    )}
  </div>
</div>

// Output Tab Content:
// [timestamp] message
// [2023-10-27 10:00:00] Compilation started...
// [2023-10-27 10:00:01] Script parsed successfully.
// [2023-10-27 10:00:02] Building abstract syntax tree...
// [2023-10-27 10:00:03] Compilation successful.
```

### 4.4 RuntimeStackPanel Component

**Enhanced from current CompactRuntimeStackVisualizer**:
```typescript
interface RuntimeStackPanelProps {
  blocks: RuntimeStackBlock[];
  activeBlockIndex: number;
  highlightedBlockKey?: string;
  onBlockHover?: (blockKey: string) => void;
  onBlockClick?: (blockKey: string) => void;
}

// Current structure (from JitCompilerDemo):
// - Flat list with indentation
// 
// New structure (from prototype):
// - Tree view with hierarchy
// - Better visual nesting
// - Parent-child relationships clear
// - Icons for block types

// Example tree:
// workout: MURPH
//   warmup
//   > main (active group)
//     pullups
//     > pushups (current execution)
//     squats
//   cooldown

// Layout in prototype:
// - Use 12px indentation per level (matching requirements)
// - Color code by block type
// - Show active indicator (>)
// - Highlight current execution
// - Show metrics inline
```

**Implementation considerations**:
- Current implementation uses list with indentation
- Prototype shows tree structure more clearly
- Could add expand/collapse for nested blocks
- Keep current hover behavior (highlight memory)

### 4.5 MemoryPanel Component

**Enhanced from current MemoryVisualizationTable**:
```typescript
interface MemoryPanelProps {
  entries: MemoryEntry[];
  hoveredBlockKey?: string;
  filterText?: string;
  groupBy?: 'owner' | 'type' | 'none';
  onFilterChange?: (text: string) => void;
  onGroupByChange?: (groupBy: 'owner' | 'type' | 'none') => void;
  onEntryHover?: (entryId: string) => void;
}

// Add to prototype:
// - Search input at top
// - Filter as user types
// - Group toggle buttons
// - Collapsible sections

// Layout:
<div className="col-span-6 row-span-1 bg-panel-background rounded-lg 
                flex flex-col p-4">
  <div className="flex justify-between items-center mb-3">
    <h2 className="text-white text-lg font-bold">Memory</h2>
    
    {/* Search */}
    <div className="relative">
      <span className="material-symbols-outlined 
                       absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
        search
      </span>
      <input className="bg-[#282c34] border border-panel-background 
                       rounded-lg py-2 pl-10 pr-4 text-sm 
                       focus:outline-none focus:ring-1 focus:ring-primary w-64"
             placeholder="Filter variables..."
             type="text"
             onChange={e => onFilterChange(e.target.value)}
      />
    </div>
  </div>
  
  {/* Group Toggle */}
  <div className="flex gap-2 mb-2">
    <button className={groupBy === 'owner' ? 'active' : ''}>By Owner</button>
    <button className={groupBy === 'type' ? 'active' : ''}>By Type</button>
  </div>
  
  {/* Content */}
  <MemoryVisualizationTable {...tableProps} />
</div>
```

### 4.6 StatusFooter Component

**New component at bottom of page**:
```typescript
interface StatusFooterProps {
  status: 'idle' | 'executing' | 'paused' | 'completed' | 'error';
  lineNumber?: number;
  columnNumber?: number;
  blockCount?: number;
  elapsedTime?: number;
}

// Layout:
<footer className="bg-background-dark border-t border-panel-background 
                   px-4 py-2 text-xs text-text-color 
                   flex justify-between items-center">
  <div>
    <span>Status: <span className="text-success font-semibold">
      Executing
    </span></span>
  </div>
  <div>
    <span>Ln {lineNumber}, Col {columnNumber}</span>
  </div>
</footer>

// Shows:
// - Execution status with color coding
// - Current cursor position (line, column)
// - Could add: Block count, elapsed time, error count
```

---

## Part 5: Data Flow Integration

### 5.1 State Management Strategy

**Combine JitCompilerDemo state + Prototype features**:

```typescript
interface RuntimeTestBenchState {
  // Script & Parsing
  script: string;
  parseResults: ParseResults;
  
  // Runtime
  runtime?: ScriptRuntime;
  
  // Execution
  snapshot?: ExecutionSnapshot;
  status: 'idle' | 'executing' | 'paused' | 'completed' | 'error';
  stepCount: number;
  elapsedTime: number;
  
  // UI State
  hoveredBlockKey?: string;
  hoveredMemoryId?: string;
  highlightedLine?: number;
  
  // Compilation Tab
  compilationTab: 'output' | 'errors';
  compilationLog: LogEntry[];
  
  // Memory Filtering
  memoryFilterText?: string;
  memoryGroupBy: 'owner' | 'type' | 'none';
  
  // Settings
  theme: 'light' | 'dark';
  showMemory: boolean;
  showStack: boolean;
  fontSize: number;
  
  // Footer
  cursorLine?: number;
  cursorColumn?: number;
}
```

### 5.2 Event Flow

```
┌─ User Input ────────────────────────┐
│                                     │
├─ Edit script in Editor             │
│  └─ onChange(script)               │
│      └─ setScript()                │
│          └─ useEffect watches      │
│              └─ Parse script       │
│                  └─ Update parseResults
│                      └─ Update compilationLog
│
├─ Click "Next Block"                │
│  └─ handleNextBlock()              │
│      └─ runtime.handle(NextEvent)  │
│          └─ Stack advances         │
│              └─ Memory updates     │
│                  └─ All panels re-render
│
├─ Hover block in Stack              │
│  └─ onBlockHover(blockKey)         │
│      └─ setHoveredBlockKey()       │
│          └─ Editor highlights line │
│          └─ Memory highlights owned entries
│
└─ Search in Memory                  │
   └─ onFilterChange(text)           │
       └─ setMemoryFilterText()      │
           └─ Filter table rows      │
```

### 5.3 Rendering Strategy

**Use hooks from requirements**:
```typescript
// Main component
export const RuntimeTestBench: React.FC<RuntimeTestBenchProps> = (props) => {
  // State hook
  const state = useRuntimeTestBench(
    props.initialScript,
    props.initialRuntime
  );
  
  // Snapshot hook (convert ScriptRuntime to display data)
  const snapshot = useRuntimeSnapshot(state.runtime);
  
  // Memory visualization hook
  const memory = useMemoryVisualization(
    state.runtime,
    state.memoryGroupBy,
    state.hoveredBlockKey
  );
  
  // Highlighting hook
  const highlighting = useHighlighting();
  
  // Keyboard shortcuts hook
  useTestBenchShortcuts({
    onNextBlock: state.stepExecution,
    onReset: state.resetExecution,
  });
  
  return (
    <div className="flex flex-col h-screen">
      <Toolbar {...state} onAction={handleAction} />
      <main className="flex-grow grid grid-cols-10 grid-rows-2 gap-4 p-4">
        {/* Component tree */}
      </main>
      <StatusFooter {...state} />
    </div>
  );
}
```

---

## Part 6: Migration Path from JitCompilerDemo

### 6.1 Incremental Extraction

**Week 1**: Prepare foundations
- Create folder structure
- Define all TypeScript interfaces
- Create base component skeletons
- Set up Tailwind extensions for prototype colors

**Week 2**: Extract existing panels
- Move ScriptEditor → EditorPanel (add prototype styling)
- Move CompactRuntimeStackVisualizer → RuntimeStackPanel
- Move MemoryVisualizationTable → MemoryPanel (add search)
- Keep all existing functionality

**Week 3**: Create new panels
- Build Toolbar component
- Build CompilationPanel with tabs
- Build ControlsPanel
- Build StatusFooter

**Week 4**: Integration & Polish
- Wire up all data flow
- Add cross-panel highlighting
- Test with real workouts
- Apply final styling

### 6.2 Backward Compatibility

**Keep existing JitCompilerDemo**:
- Don't delete or modify original
- Use it as reference while building
- When complete, retire it with deprecation notice
- Copy example workouts to new Storybook stories

**Wrap existing components**:
- JitCompilerDemo.tsx becomes thin wrapper around RuntimeTestBench
- Points to new version
- Shows deprecation message

---

## Part 7: Comparison Table

### Prototype vs JitCompilerDemo vs Requirements

| Feature | Prototype | JitCompilerDemo | Requirements | Integration |
|---------|-----------|-----------------|--------------|-------------|
| **Header/Nav** | ✓ | ✗ | ✓ | Use prototype design |
| **Editor** | ✓ | ✓ | ✓ | Use existing + style |
| **Compilation** | ✓ | Partial | ✓ | Create new panel |
| **Stack** | ✓ | ✓ | ✓ | Enhance existing |
| **Memory** | ✓ | ✓ | ✓ | Enhance + search |
| **Controls** | ✓ | ✓ | ✓ | Extract + enhance |
| **Footer** | ✓ | ✗ | ✗ | Create new |
| **Tabs** | ✓ | ✗ | ✗ | Add to panels |
| **Search** | ✓ | ✗ | ✓ | Add to memory |
| **Colors** | ✓ | ✗ | Partial | Apply to all |
| **Responsive** | ✗ | ✗ | ✓ | Implement |
| **Accessibility** | ✗ | Partial | ✓ | Audit + fix |
| **Dark mode** | ✓ | ✗ | Optional | Already in prototype |

---

## Part 8: Implementation Checklist

### Phase 1: Foundation (Week 1)
- [ ] Create folder structure
  - [ ] `src/runtime-test-bench/`
  - [ ] `src/runtime-test-bench/components/`
  - [ ] `src/runtime-test-bench/hooks/`
  - [ ] `src/runtime-test-bench/adapters/`
  - [ ] `src/runtime-test-bench/types/`
  - [ ] `stories/runtime-test-bench/`

- [ ] Define TypeScript interfaces
  - [ ] Copy all interfaces from requirements document
  - [ ] Create types/interfaces.ts
  - [ ] Create types/types.ts

- [ ] Extend Tailwind config
  - [ ] Add prototype colors
  - [ ] Add custom components
  - [ ] Verify dark mode setup

- [ ] Create component skeletons
  - [ ] RuntimeTestBench.tsx (main)
  - [ ] All 6 panels (empty)
  - [ ] All hooks (empty)

- [ ] Create RuntimeAdapter
  - [ ] Implement IRuntimeAdapter interface
  - [ ] Test with existing ScriptRuntime

### Phase 2: Extract Components (Week 2)
- [ ] EditorPanel
  - [ ] Wrap existing ScriptEditor
  - [ ] Add header + status badge
  - [ ] Apply prototype styling

- [ ] RuntimeStackPanel
  - [ ] Migrate CompactRuntimeBlockDisplay
  - [ ] Keep hover behavior
  - [ ] Add tree structure

- [ ] MemoryPanel
  - [ ] Migrate MemoryVisualizationTable
  - [ ] Add search input
  - [ ] Add grouping toggle

- [ ] Test component extraction
  - [ ] Can still parse scripts
  - [ ] Can still step through execution
  - [ ] Memory displays correctly

### Phase 3: Create New Components (Week 3)
- [ ] Toolbar
  - [ ] Logo + title
  - [ ] Navigation with active state
  - [ ] Action buttons
  - [ ] Avatar

- [ ] CompilationPanel
  - [ ] Output tab
  - [ ] Errors tab
  - [ ] Tab switching
  - [ ] Show compilation log

- [ ] ControlsPanel
  - [ ] Next Block button
  - [ ] Reset button
  - [ ] Status display

- [ ] StatusFooter
  - [ ] Status indicator
  - [ ] Cursor position
  - [ ] Styling

### Phase 4: Integration (Week 4)
- [ ] Wire all data flow
- [ ] Test cross-panel highlighting
- [ ] Test keyboard shortcuts
- [ ] Apply all prototype colors
- [ ] Test responsive design
- [ ] Accessibility audit
- [ ] Create Storybook stories
- [ ] Document migration

---

## Part 9: Specific Code Examples

### 9.1 Color Integration Example

```typescript
// tailwind.config.js (extend theme)
module.exports = {
  theme: {
    extend: {
      colors: {
        'primary': '#FFA500',
        'bg-light': '#f6f8f7',
        'bg-dark': '#282c34',
        'panel': '#3c4049',
        'text': '#abb2bf',
        'success': '#98c379',
        'error': '#e06c75',
        'info': '#61afef',
      }
    }
  }
}

// Usage in components
<div className="bg-panel text-text border-b border-panel">
  <h2 className="text-white font-bold">Title</h2>
</div>

<button className="bg-primary text-bg-dark hover:bg-orange-600">
  Primary Button
</button>

<span className="text-success">✓ Success</span>
<span className="text-error">✗ Error</span>
<span className="text-info">ℹ Info</span>
```

### 9.2 Layout Integration Example

```typescript
// src/runtime-test-bench/RuntimeTestBench.tsx
export const RuntimeTestBench: React.FC<RuntimeTestBenchProps> = ({
  initialScript = `20:00 AMRAP\n5 Pullups\n10 Pushups\n15 Air Squats`,
  runtime: initialRuntime,
  showRuntimeStack = true,
  showMemory = true
}) => {
  const state = useRuntimeTestBench(initialScript, initialRuntime);
  
  return (
    <div className="flex flex-col h-screen bg-bg-dark">
      {/* Toolbar - from prototype */}
      <Toolbar 
        currentWorkout={state.workoutName}
        onRunClick={state.run}
        onNextBlockClick={state.stepExecution}
        onResetClick={state.resetExecution}
      />
      
      {/* Main Content Grid - from prototype */}
      <main className="flex-grow grid grid-cols-10 grid-rows-2 gap-4 p-4 
                       overflow-hidden">
        {/* Top Left: Editor (40%) */}
        <div className="col-span-4 row-span-1 
                       bg-panel rounded-lg overflow-hidden">
          <EditorPanel 
            value={state.script}
            onChange={state.updateScript}
            highlightedLine={state.highlighting.line}
            errors={state.parseResults.errors}
            status={state.parseResults.status}
          />
        </div>
        
        {/* Top Right: Compilation (60%) */}
        <div className="col-span-6 row-span-1 
                       bg-panel rounded-lg overflow-hidden">
          <CompilationPanel
            statements={state.parseResults.statements}
            errors={state.parseResults.errors}
            compilationLog={state.compilationLog}
            activeTab={state.compilationTab}
            onTabChange={state.setCompilationTab}
          />
        </div>
        
        {/* Bottom Left: Stack (40%) */}
        {showRuntimeStack && (
          <div className="col-span-4 row-span-1 
                         bg-panel rounded-lg overflow-hidden">
            <RuntimeStackPanel
              blocks={state.snapshot?.stack.blocks || []}
              activeBlockIndex={state.snapshot?.stack.activeIndex || 0}
              highlightedBlockKey={state.highlighting.blockKey}
              onBlockHover={state.setHighlightedBlock}
            />
          </div>
        )}
        
        {/* Bottom Right: Memory (60%) */}
        {showMemory && (
          <div className="col-span-6 row-span-1 
                         bg-panel rounded-lg overflow-hidden">
            <MemoryPanel
              entries={state.snapshot?.memory.entries || []}
              filterText={state.memoryFilter}
              groupBy={state.memoryGroupBy}
              onFilterChange={state.setMemoryFilter}
              onGroupByChange={state.setMemoryGroupBy}
              onEntryHover={state.setHighlightedMemory}
            />
          </div>
        )}
      </main>
      
      {/* Footer - from prototype */}
      <StatusFooter
        status={state.status}
        lineNumber={state.cursorLine}
        columnNumber={state.cursorColumn}
      />
    </div>
  );
};
```

### 9.3 Hook Integration Example

```typescript
// src/runtime-test-bench/hooks/useRuntimeTestBench.ts
export const useRuntimeTestBench = (
  initialScript: string,
  initialRuntime?: ScriptRuntime
) => {
  // All state
  const [state, setState] = useState<RuntimeTestBenchState>({
    script: initialScript,
    parseResults: { statements: [], errors: [], warnings: [], status: 'idle' },
    // ... rest of state
  });
  
  // Derived state from snapshot
  const snapshot = useRuntimeSnapshot(state.runtime);
  
  // Actions
  const updateScript = useCallback((newScript: string) => {
    setState(s => ({ ...s, script: newScript }));
    // Trigger parse via effect
  }, []);
  
  const stepExecution = useCallback(() => {
    if (!state.runtime) return;
    const nextEvent = new NextEvent({/* ... */});
    state.runtime.handle(nextEvent);
    setState(s => ({ 
      ...s, 
      snapshot: useRuntimeSnapshot(state.runtime),
      stepCount: s.stepCount + 1
    }));
  }, [state.runtime]);
  
  const resetExecution = useCallback(() => {
    // Reset runtime, snapshot, UI state
  }, []);
  
  // Parse effect
  useEffect(() => {
    // Debounce parse (500ms)
    const timer = setTimeout(() => {
      try {
        const mdRuntime = new MdTimerRuntime();
        const wodScript = mdRuntime.read(state.script) as WodScript;
        const jitCompiler = new JitCompiler([]);
        // Register strategies...
        const runtime = new ScriptRuntime(wodScript, jitCompiler);
        
        setState(s => ({
          ...s,
          parseResults: { 
            statements: wodScript.statements,
            errors: [],
            warnings: [],
            status: 'success'
          },
          runtime,
          compilationLog: [
            ...s.compilationLog,
            { timestamp: Date.now(), message: 'Compilation successful', level: 'success' }
          ]
        }));
      } catch (error) {
        setState(s => ({
          ...s,
          parseResults: { 
            statements: [],
            errors: [/* parse errors */],
            warnings: [],
            status: 'error'
          }
        }));
      }
    }, 500);
    
    return () => clearTimeout(timer);
  }, [state.script]);
  
  return {
    ...state,
    snapshot,
    updateScript,
    stepExecution,
    resetExecution,
    setHighlightedBlock: (key?: string) => setState(s => ({ 
      ...s, 
      highlighting: { ...s.highlighting, blockKey: key }
    })),
    // ... more actions
  };
};
```

---

## Conclusions & Recommendations

### 1. Design Quality
The **prototype (code.html)** has excellent visual design:
- Dark theme suitable for developer tools
- Clear color hierarchy with orange accent
- Logical 3-section layout that matches requirements
- Professional styling with appropriate spacing

**Recommendation**: Use the prototype as-is for visual/layout design

### 2. Functional Requirements
The **JitCompilerDemo** has proven functionality:
- Script parsing and compilation works
- Runtime execution step-by-step works
- Memory tracking and visualization works
- Cross-panel interactions work

**Recommendation**: Extract and refactor existing components rather than rebuild

### 3. Integration Strategy
**Best approach**: Combine prototype design with JitCompilerDemo functionality
1. Use prototype layout and colors
2. Extract JitCompilerDemo components and refactor
3. Create missing components (Toolbar, CompilationPanel, Footer)
4. Wire together with shared state and hooks
5. Test incrementally

### 4. Implementation Difficulty
- **Easy**: Apply prototype styling to existing components
- **Medium**: Extract components and refactor
- **Medium**: Create new panels (Toolbar, CompilationPanel)
- **Easy**: Wire data flow with hooks

**Total Effort**: ~4 weeks for full implementation

### 5. Testing Strategy
1. **Component tests**: Each panel renders correctly with data
2. **Integration tests**: Data flows between components
3. **UI tests**: Cross-panel highlighting works
4. **E2E tests**: Full workout can be edited and executed
5. **Visual tests**: Matches prototype design

---

## Appendix: File References

### From Prototype (code.html)
- Color scheme: Lines 10-18
- Layout structure: Lines 54-78
- Toolbar: Lines 32-52
- Editor panel: Lines 84-108
- Compilation panel: Lines 110-130
- Stack panel: Lines 132-154
- Memory panel: Lines 156-180
- Footer: Lines 182-186

### From JitCompilerDemo
- Main component: `stories/compiler/JitCompilerDemo.tsx` (900+ lines)
- ScriptEditor: Lines 93-135
- RuntimeClockDisplay: Lines 54-90
- CompactRuntimeBlockDisplay: Lines 137-165
- CompactRuntimeStackVisualizer: Lines 167-189
- MemoryVisualizationTable: Lines 191-320
- Group visualization: Lines 322-380
- Memory formatting: Lines 381-430

### From Requirements Documents
- **UI-REQUIREMENTS.md**: Section 3 (Panel specifications)
- **INTERFACE-ARCHITECTURE.md**: Section 2-3 (Component interfaces)
- **VISUAL-DESIGN-GUIDE.md**: Full document (styling reference)

---

**Document Status**: ✅ Complete Research Package  
**Created**: October 16, 2025  
**Next Phase**: Begin Phase 1 implementation
