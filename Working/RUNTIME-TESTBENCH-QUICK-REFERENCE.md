# Runtime Test Bench - Quick Reference Guide

## Project Overview

This guide summarizes the comprehensive UI requirements and interface architecture for building a **Runtime Test Bench** - a developer tool for testing, debugging, and inspecting the WOD Wiki JIT compilation and script execution pipeline.

**Documents**:
- `RUNTIME-TESTBENCH-UI-REQUIREMENTS.md` - Complete UI/UX specifications
- `RUNTIME-TESTBENCH-INTERFACE-ARCHITECTURE.md` - TypeScript interfaces and architecture

---

## Key Design Principles

1. **Progressive Disclosure**: Summary by default, deep details on hover/expand
2. **Spatial Separation**: Group panels by function (Editor, Compilation, Execution, Memory)
3. **Color Coding**: Consistent colors for block types and memory states
4. **Real-time Sync**: All visualizations update together with runtime changes
5. **Developer-Friendly**: Fast iteration with keyboard shortcuts and quick actions

---

## Layout Overview

### Main 3-Section Design (Desktop)

```
┌─────────────────────────────────────────────────────┐
│ TOOLBAR (Settings, Help, Export/Import)             │
├──────────────────────┬──────────────────────────────┤
│                      │                              │
│  EDITOR PANEL        │  COMPILATION PANEL           │
│  (35% width)         │  (65% width)                 │
│  • Monaco editor     │  • Statement table           │
│  • Line numbers      │  • Fragment visualization   │
│  • Syntax highlight  │  • Error display            │
│                      │                              │
├──────────────────────┼──────────────────────────────┤
│                      │                              │
│  RUNTIME STACK       │  MEMORY VISUALIZATION        │
│  (35% width)         │  (65% width)                 │
│  • Block hierarchy   │  • Memory table              │
│  • Active indicator  │  • Value popovers            │
│  • Metrics inline    │  • Grouped by owner/type    │
│                      │                              │
├──────────────────────┴──────────────────────────────┤
│  CONTROLS PANEL                                     │
│  • Next Block button • Reset button                 │
│  • Status indicator  • Event queue                  │
└─────────────────────────────────────────────────────┘
```

---

## Core Panels

### 1. Editor Panel
**Purpose**: Create and modify workout scripts

**Features**:
- Monaco-based code editor
- Real-time syntax highlighting (WOD Wiki syntax)
- Line number highlighting when hovering blocks
- Status badges: Valid ✓, Error ✗, Parsing...
- Parse errors with inline error messages

**Interactions**:
- Real-time parsing (500ms debounce)
- Ctrl+Enter: Execute next block
- Ctrl+Shift+R: Reset runtime

### 2. Compilation Panel
**Purpose**: Display how script is parsed into runtime blocks

**Features**:
- Statement table with line numbers and positions
- Fragment breakdown with token visualization
- Color-coded fragment types (Timer: Blue, Effort: Green, etc.)
- Error/warning display with suggestions
- Hover shows full parsed object

**Interactions**:
- Click statement → Jump to editor
- Hover statement → Highlight source and associated block
- Click error → Show detailed error info

### 3. Runtime Stack Panel
**Purpose**: Show current execution context and block hierarchy

**Features**:
- Bottom-to-top stack display (root → current block)
- Color-coded by type: Root (slate), Timer (blue), Effort (green), Rounds (purple)
- Active block highlighted with bright border
- Indentation shows nesting depth
- Inline metrics display (e.g., "20:00 remaining")
- Block status badges (running, paused, completed)

**Interactions**:
- Hover block → Show tooltip with details
- Hover block → Highlight owned memory in Memory panel
- Click block → Open detailed inspector
- Right-click → Copy block key, jump to source

### 4. Memory Visualization Panel
**Purpose**: Display runtime memory allocations and heap state

**Features**:
- Memory table grouped by owner block
- Columns: ID, Type, Owner, Status, Children
- Color-coded memory types and validity
- Hover popover shows value (JSON for objects)
- Popover positioned above cursor
- Validity indicators: ✓ Valid (green), ✗ Invalid (red), ⚠ Stale (yellow)

**Interactions**:
- Hover row → Show value popover + highlight owning block
- Click entry → Pin popover for inspection
- Filter by owner, type, or validity
- Search to find specific memory entries

### 5. Controls Panel
**Purpose**: Execute and control runtime state

**Features**:
- **Next Block Button**: Advance one block (can be queued for rapid clicks)
- **Reset Button**: Restart from beginning
- **Status Indicator**: Shows running/paused/completed state
- **Event Queue Display**: Shows pending events
- **Block Progress**: Current block # / total

**Interactions**:
- Click Next Block → Executes one step
- Rapid clicks → Queued and processed sequentially
- Keyboard shortcut Ctrl+Enter works globally

### 6. Toolbar
**Purpose**: Quick access to settings and utilities

**Features**:
- Workspace/workout name display
- Progress info: "Block 5 of 12", "Elapsed: 00:15.234"
- Settings menu (theme, visibility toggles, font size)
- Help/documentation links
- Export/Import buttons

---

## Color Coding System

### Block Types
| Type | Background | Border | Use Case |
|------|------------|--------|----------|
| Root | Slate-100 (#f1f5f9) | Slate-300 | Top-level container |
| Timer | Blue-100 (#dbeafe) | Blue-300 | Countdown/count-up timers |
| Effort | Green-100 (#dcfce7) | Green-300 | Exercise/effort blocks |
| Rounds | Purple-100 (#e9d5ff) | Purple-300 | Round loops |
| Completion | Emerald-100 (#ccfbf1) | Emerald-300 | Completed state |
| Idle | Gray-100 (#f3f4f6) | Gray-300 | Idle/inactive state |

### Fragment Types
| Type | Badge Color | Meaning |
|------|-------------|---------|
| Timer | Blue (#dbeafe) | Time duration (e.g., "20:00") |
| Effort | Green (#dcfce7) | Exercise effort (e.g., "5 Pullups") |
| Group | Purple (#e9d5ff) | Round/group wrapper |
| Metric | Amber (#fef3c7) | Measurement or count |
| Error | Red (#fee2e2) | Parse error |

### Memory Status
| Status | Color | Meaning |
|--------|-------|---------|
| Valid | Green (#22c55e) | Memory is current and accessible |
| Invalid | Red (#ef4444) | Memory is deallocated/stale |
| Stale | Yellow (#eab308) | Memory exists but not actively used |

---

## Key Interactions

### Cross-Panel Highlighting
1. **Hover Block in Stack**
   - Highlights source line in Editor (orange border)
   - Highlights owned memory in Memory panel (blue background)
   - Shows tooltip with block details

2. **Hover Memory Entry**
   - Shows value popover above cursor
   - Highlights owning block in Stack (blue background)
   - Shows metadata and child references

3. **Hover Fragment in Compilation**
   - Highlights corresponding line in Editor
   - Shows token details in tooltip
   - Links to associated runtime block (if executed)

4. **Hover Line in Editor**
   - Shows associated block info in tooltip (if any)
   - Jumps to block in Runtime Stack

### Execution Flow
1. User types in Editor → Script parsed automatically
2. Compilation panel shows parse results
3. User clicks "Next Block" → Runtime advances
4. Stack, Memory, and Clock all update together
5. Continue clicking for step-by-step execution
6. At completion, "Next Block" button disables

---

## Data Flow

```
Script Input (Editor)
      ↓
Parse & Validate (500ms debounce)
      ↓
Compilation Panel Shows Results
      ↓
JIT Compiler Creates Blocks
      ↓
Runtime Executes (on "Next Block" click)
      ↓
Update All Panels Simultaneously:
  • Runtime Stack Panel (shows active block)
  • Memory Panel (shows allocations)
  • Clock Display (if timer exists)
      ↓
Next Click or Completion
```

---

## Keyboard Shortcuts

| Keys | Action | Where |
|------|--------|-------|
| `Ctrl+Enter` / `Cmd+Enter` | Execute Next Block | Global |
| `Ctrl+Shift+R` / `Cmd+Shift+R` | Reset Runtime | Global |
| `Ctrl+,` / `Cmd+,` | Open Settings | Global |
| `Ctrl+F` / `Cmd+F` | Search Editor | Editor |
| `Ctrl+L` | Jump to Line | Editor |
| `Escape` | Close Popover/Modal | Any |
| `Enter` | Apply Filter | Memory Panel |
| `↑` / `↓` | Navigate Stack | Stack Panel |
| `Space` | Pin/Unpin Popover | Any |

---

## Required TypeScript Interfaces

### Core Props
- `RuntimeTestBenchProps` - Main component props
- `EditorPanelProps` - Editor panel configuration
- `CompilationPanelProps` - Compilation display config
- `RuntimeStackPanelProps` - Stack visualization config
- `MemoryVisualizationPanelProps` - Memory display config
- `ControlsPanelProps` - Controls configuration
- `ToolbarProps` - Toolbar actions and info

### Data Models
- `ExecutionContext` - Overall execution state
- `ExecutionSnapshot` - Point-in-time runtime state
- `RuntimeStackBlock` - Block for stack display
- `MemoryEntry` - Memory allocation display
- `CompilationStatement` - Parsed statement display
- `ParseResults` - Parsing output
- `Fragment` - Token in a statement

### State Management
- `RuntimeTestBenchState` - Complete component state
- `RuntimeTestBenchEvent` - UI event types
- `EventBus` - Event publishing/subscription

### Integration
- `IRuntimeAdapter` - Converts ScriptRuntime to test bench format
- `RuntimeAdapter` - Implementation of adapter

### React Hooks
- `useRuntimeTestBench()` - Main state hook
- `useRuntimeSnapshot()` - Extract snapshot from runtime
- `useMemoryVisualization()` - Filter and group memory
- `useTestBenchShortcuts()` - Keyboard shortcut handling
- `useHighlighting()` - Cross-panel highlighting state

---

## Performance Targets

| Metric | Target |
|--------|--------|
| Initial Load | <2 seconds |
| Next Block Response | <500ms |
| Memory Table Scroll | 60 FPS |
| Panel Resize | Smooth, no jank |
| Block Rendering (50+) | Use virtualization |
| Memory Entries (200+) | Use virtual scrolling |

---

## Responsive Breakpoints

| Breakpoint | Width | Layout |
|-----------|-------|--------|
| Desktop | ≥1920px | 4-panel grid (2x2) |
| Large Tablet | 1024-1920px | 4-panel grid, reduced padding |
| Tablet | 768-1024px | Stacked panels |
| Mobile | ≤768px | Single column with sheets |

---

## Implementation Phases

### Phase 1: Foundation (Weeks 1-2)
- Implement layout grid and panel structure
- Create Editor, Compilation, Stack, Memory panels
- Basic rendering from runtime data
- Cross-panel highlighting

### Phase 2: Interaction (Weeks 3-4)
- Implement Next/Reset buttons
- Add keyboard shortcuts
- Error display and handling
- Toolbar with settings

### Phase 3: Polish (Weeks 5-6)
- Performance optimization (virtualization)
- Dark mode support
- Accessibility audit
- Documentation and examples

### Phase 4: Testing & Release (Week 7)
- User testing
- Bug fixes
- Performance benchmarking
- Release v1.0

---

## Success Criteria

1. **Usability**: Developer can debug workout in <2 minutes without training
2. **Performance**: All core operations <500ms response time
3. **Adoption**: Used by 100% of engineering team for debugging
4. **Quality**: <2% UI-related bugs post-release
5. **Efficiency**: Reduces debugging time by 50% vs. manual inspection

---

## Files to Review

1. **JitCompilerDemo Component** (`stories/compiler/JitCompilerDemo.tsx`)
   - Current implementation to build upon
   - Existing data flow patterns
   - Component structure reference

2. **Runtime System** (`src/runtime/`)
   - `ScriptRuntime.ts` - Main runtime instance
   - `IRuntimeBlock.ts` - Block interface
   - `RuntimeStack.ts` - Stack management
   - `RuntimeMemory.ts` - Memory system

3. **Parser System** (`src/parser/`)
   - `timer.parser.ts` - Workout syntax parser
   - `timer.visitor.ts` - AST visitor

4. **Tailwind Config** (`tailwind.config.js`)
   - Color palette reference
   - Spacing and typography scales

---

## Next Steps

1. Review comprehensive UI requirements document
2. Review interface architecture document  
3. Create initial component structure
4. Implement data adapter from ScriptRuntime
5. Build panels incrementally with tests
6. Integrate with existing Storybook
7. Gather user feedback
8. Iterate and refine

---

**Quick Start**: Begin by extracting panels from `JitCompilerDemo.tsx` into separate, focused components. Each panel should accept its data via props and emit events via callbacks. Use the `RuntimeAdapter` to bridge between existing `ScriptRuntime` and new panel interfaces.

---

**Document Version**: 1.0  
**Created**: October 16, 2025  
**Status**: Ready for Development
