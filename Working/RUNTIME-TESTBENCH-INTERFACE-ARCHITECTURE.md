# Runtime Test Bench - Interface Architecture Summary

## Overview

This document describes the TypeScript interfaces and component structures needed to build the Runtime Test Bench as specified in the comprehensive UI requirements document. It focuses on the **data flow architecture** and **required interfaces** to create an effective testing and debugging tool for the WOD Wiki runtime system.

---

## 1. Core Component Architecture

### 1.1 Top-Level Test Bench Component

```typescript
interface RuntimeTestBenchProps {
  /**
   * Initial workout script to load
   */
  initialScript?: string;

  /**
   * Pre-created runtime instance (optional - creates new if not provided)
   */
  runtime?: ScriptRuntime;

  /**
   * Control which panels are visible
   */
  showEditor?: boolean;
  showCompilation?: boolean;
  showRuntimeStack?: boolean;
  showMemory?: boolean;
  showControls?: boolean;
  showToolbar?: boolean;

  /**
   * Callback when script changes
   */
  onScriptChange?: (script: string) => void;

  /**
   * Callback when runtime state changes
   */
  onRuntimeStateChange?: (state: RuntimeState) => void;

  /**
   * Callback when execution completes
   */
  onExecutionComplete?: (result: ExecutionResult) => void;

  /**
   * Custom theme configuration
   */
  theme?: 'light' | 'dark' | 'auto';

  /**
   * Responsive layout mode
   */
  layoutMode?: 'desktop' | 'compact' | 'execution-focus' | 'memory-inspection';
}

/**
 * Main Runtime Test Bench component
 */
export const RuntimeTestBench: React.FC<RuntimeTestBenchProps>;
```

---

## 2. Panel Component Interfaces

### 2.1 Editor Panel

```typescript
interface EditorPanelProps {
  /**
   * Current script source code
   */
  value: string;

  /**
   * Called when script text changes
   */
  onChange: (newScript: string) => void;

  /**
   * Line number to highlight (when hovering block in stack)
   */
  highlightedLine?: number;

  /**
   * Parsing/syntax errors to display
   */
  errors?: ParseError[];

  /**
   * Current parse status
   */
  status: 'idle' | 'parsing' | 'valid' | 'error';

  /**
   * Line that caused error (if any)
   */
  errorLine?: number;

  /**
   * Callback when editor requests focus for line
   */
  onLineClick?: (lineNumber: number) => void;

  /**
   * Callback to clear/reset editor
   */
  onClear?: () => void;
}

interface ParseError {
  line: number;
  column: number;
  message: string;
  suggestion?: string;
  code?: string;
}

export const EditorPanel: React.FC<EditorPanelProps>;
```

### 2.2 Compilation Panel

```typescript
interface CompilationPanelProps {
  /**
   * Parsed statements from the script
   */
  statements: CodeStatement[];

  /**
   * Parsing errors to display
   */
  errors: ParseError[];

  /**
   * Parsing warnings
   */
  warnings: ParseWarning[];

  /**
   * Currently highlighted statement (from memory hover)
   */
  highlightedStatementIndex?: number;

  /**
   * Callback when hovering statement
   */
  onStatementHover?: (index: number) => void;

  /**
   * Callback when clicking statement
   */
  onStatementClick?: (index: number) => void;

  /**
   * Filter mode for display
   */
  filterMode: 'all' | 'errors' | 'warnings';
}

interface ParseWarning {
  line: number;
  message: string;
  severity: 'info' | 'warning';
}

interface CompilationStatement {
  lineNumber: number;
  position: { start: number; end: number };
  fragments: Fragment[];
  parseStatus: 'valid' | 'error' | 'warning';
  errorMessage?: string;
}

interface Fragment {
  type: 'timer' | 'effort' | 'rep-count' | 'exercise' | 'metric' | 'unknown';
  value: string;
  position: { start: number; end: number };
  metadata?: Record<string, any>;
}

export const CompilationPanel: React.FC<CompilationPanelProps>;
```

### 2.3 Runtime Stack Panel

```typescript
interface RuntimeStackPanelProps {
  /**
   * Current runtime stack (bottom to top order)
   */
  blocks: RuntimeStackBlock[];

  /**
   * Index of currently active block
   */
  activeBlockIndex: number;

  /**
   * Block key to highlight (from memory hover)
   */
  highlightedBlockKey?: string;

  /**
   * Callback when hovering block
   */
  onBlockHover?: (blockKey: string, lineNumber?: number) => void;

  /**
   * Callback when leaving block hover
   */
  onBlockLeave?: () => void;

  /**
   * Callback when clicking block to inspect
   */
  onBlockInspect?: (blockKey: string) => void;

  /**
   * Callback when copying block key
   */
  onBlockKeyCopy?: (blockKey: string) => void;
}

interface RuntimeStackBlock {
  /**
   * Unique identifier for this block instance
   */
  key: string; // From BlockKey

  /**
   * Type of block for display and coloring
   */
  blockType: 'Root' | 'Timer' | 'Effort' | 'Group' | 'Rounds' | 'Completion' | 'Idle';

  /**
   * Display name or identifier
   */
  displayName: string;

  /**
   * Nesting depth for indentation
   */
  depth: number;

  /**
   * Inline metrics to display
   */
  metrics: BlockMetric[];

  /**
   * Current block status
   */
  status: 'idle' | 'running' | 'paused' | 'completed' | 'error';

  /**
   * Source line number in original script (if known)
   */
  sourceLineNumber?: number;

  /**
   * Source line content (for hover display)
   */
  sourceLineContent?: string;

  /**
   * Error message if status is 'error'
   */
  errorMessage?: string;

  /**
   * Parent block key (for hierarchy)
   */
  parentKey?: string;
}

interface BlockMetric {
  type: string;           // e.g., "duration", "reps", "rounds-remaining"
  label?: string;         // e.g., "Time Remaining"
  value: string | number;
  unit?: string;          // e.g., "sec", "reps", "mins"
  color?: string;
}

export const RuntimeStackPanel: React.FC<RuntimeStackPanelProps>;
```

### 2.4 Memory Visualization Panel

```typescript
interface MemoryVisualizationPanelProps {
  /**
   * Memory entries to display
   */
  entries: MemoryEntry[];

  /**
   * Block key that's currently hovered (to highlight owned memory)
   */
  highlightedBlockKey?: string;

  /**
   * Callback when hovering memory entry
   */
  onEntryHover?: (entryId: string, blockKey: string) => void;

  /**
   * Callback when leaving entry hover
   */
  onEntryLeave?: () => void;

  /**
   * Callback when clicking entry
   */
  onEntryClick?: (entryId: string) => void;

  /**
   * Filter options
   */
  filterByType?: string;        // Filter by memory type
  filterByOwner?: string;       // Filter by owner block key
  filterByValidity?: 'all' | 'valid' | 'invalid' | 'stale';

  /**
   * Update filter
   */
  onFilterChange?: (filters: MemoryFilter) => void;

  /**
   * Group memory by owner
   */
  groupByOwner?: boolean;
}

interface MemoryEntry {
  /**
   * Unique identifier in memory space
   */
  id: string;

  /**
   * Type of memory allocation
   */
  type: MemoryType;

  /**
   * Block key that owns this memory
   */
  ownerBlockKey: string;

  /**
   * String representation of value
   */
  displayValue: string;

  /**
   * Raw value for inspection
   */
  rawValue: any;

  /**
   * Whether memory is currently valid/accessible
   */
  isValid: boolean;

  /**
   * Child references (how many children this entry has)
   */
  childCount: number;

  /**
   * Source position where this memory was allocated
   */
  sourcePosition?: { line: number; column: number };

  /**
   * When this memory was allocated (timestamp)
   */
  allocatedAt?: number;

  /**
   * Custom metadata for this memory
   */
  metadata?: Record<string, any>;
}

type MemoryType = 
  | 'metric'
  | 'timer-state'
  | 'loop-state'
  | 'group-state'
  | 'handlers'
  | 'spans'
  | 'metrics-snapshot'
  | 'other';

interface MemoryFilter {
  type?: string;
  ownerBlockKey?: string;
  validity?: 'all' | 'valid' | 'invalid' | 'stale';
  searchText?: string;
}

export const MemoryVisualizationPanel: React.FC<MemoryVisualizationPanelProps>;
```

### 2.5 Controls Panel

```typescript
interface ControlsPanelProps {
  /**
   * Whether "Next Block" button is enabled
   */
  canAdvance: boolean;

  /**
   * Whether "Reset" button is enabled
   */
  canReset: boolean;

  /**
   * Current execution status
   */
  executionStatus: 'idle' | 'running' | 'paused' | 'completed' | 'error';

  /**
   * Number of queued events pending execution
   */
  queuedEventCount: number;

  /**
   * Whether currently processing
   */
  isProcessing: boolean;

  /**
   * Callback when Next Block clicked
   */
  onNextBlock: () => void;

  /**
   * Callback when Reset clicked
   */
  onReset: () => void;

  /**
   * Current block number / total
   */
  blockProgress?: { current: number; total: number };

  /**
   * Elapsed execution time
   */
  elapsedTime?: number;

  /**
   * Number of steps executed
   */
  stepCount?: number;

  /**
   * Error message if status is 'error'
   */
  errorMessage?: string;
}

export const ControlsPanel: React.FC<ControlsPanelProps>;
```

### 2.6 Toolbar

```typescript
interface ToolbarProps {
  /**
   * Workspace/workout name
   */
  workspaceName?: string;

  /**
   * Current execution progress info
   */
  progressInfo?: {
    blockNumber: number;
    totalBlocks: number;
    elapsedMs: number;
    stepCount: number;
  };

  /**
   * Callback to open settings
   */
  onOpenSettings: () => void;

  /**
   * Callback to open help
   */
  onOpenHelp: () => void;

  /**
   * Callback to export
   */
  onExport: (format: 'json' | 'trace' | 'script') => void;

  /**
   * Callback to import
   */
  onImport: (file: File) => void;

  /**
   * Available menu actions
   */
  actions?: ToolbarAction[];

  /**
   * Current theme
   */
  theme: 'light' | 'dark';

  /**
   * Theme toggle callback
   */
  onThemeChange: (theme: 'light' | 'dark') => void;
}

interface ToolbarAction {
  id: string;
  label: string;
  icon?: string;
  disabled?: boolean;
  onClick: () => void;
}

export const Toolbar: React.FC<ToolbarProps>;
```

---

## 3. Supporting Interfaces and Types

### 3.1 Execution Context

```typescript
interface ExecutionContext {
  /**
   * Current runtime instance
   */
  runtime: ScriptRuntime;

  /**
   * Current script being executed
   */
  script: WodScript;

  /**
   * Execution state snapshot
   */
  snapshot: ExecutionSnapshot;

  /**
   * Parse results
   */
  parseResults: ParseResults;

  /**
   * Errors encountered
   */
  errors: RuntimeError[];

  /**
   * Warnings encountered
   */
  warnings: RuntimeWarning[];
}

interface ExecutionSnapshot {
  /**
   * Stack state
   */
  stack: {
    blocks: RuntimeStackBlock[];
    activeIndex: number;
    depth: number;
  };

  /**
   * Memory state
   */
  memory: {
    entries: MemoryEntry[];
    totalAllocated: number;
    groupedByOwner: Record<string, MemoryEntry[]>;
    groupedByType: Record<string, MemoryEntry[]>;
  };

  /**
   * Metrics collected so far
   */
  metrics: {
    executedBlocks: number;
    elapsedTime: number;
    stepCount: number;
    errorCount: number;
  };

  /**
   * Timestamp of this snapshot
   */
  timestamp: number;
}

interface ParseResults {
  /**
   * Successfully parsed statements
   */
  statements: CodeStatement[];

  /**
   * Parsing errors
   */
  errors: ParseError[];

  /**
   * Parsing warnings
   */
  warnings: ParseWarning[];

  /**
   * Overall parse status
   */
  status: 'idle' | 'parsing' | 'success' | 'error';

  /**
   * Time taken to parse
   */
  parseTimeMs: number;
}

interface RuntimeError {
  code: string;
  message: string;
  blockKey?: string;
  lineNumber?: number;
  severity: 'error' | 'critical';
  stackTrace?: string;
  timestamp: number;
}

interface RuntimeWarning {
  code: string;
  message: string;
  blockKey?: string;
  lineNumber?: number;
  severity: 'warning' | 'info';
  timestamp: number;
}

interface ExecutionResult {
  /**
   * Whether execution completed successfully
   */
  success: boolean;

  /**
   * Final execution snapshot
   */
  finalSnapshot: ExecutionSnapshot;

  /**
   * Total execution time
   */
  totalTimeMs: number;

  /**
   * Total steps executed
   */
  totalSteps: number;

  /**
   * Any errors that occurred
   */
  errors: RuntimeError[];

  /**
   * Collected metrics
   */
  metrics: Record<string, any>;
}
```

### 3.2 State Management Types

```typescript
interface RuntimeTestBenchState {
  /**
   * Current script being edited
   */
  script: string;

  /**
   * Parse results
   */
  parseResults: ParseResults;

  /**
   * Runtime instance
   */
  runtime?: ScriptRuntime;

  /**
   * Current execution snapshot
   */
  snapshot?: ExecutionSnapshot;

  /**
   * UI state
   */
  ui: {
    mode: 'edit' | 'execute' | 'debug';
    highlightedBlockKey?: string;
    highlightedMemoryId?: string;
    highlightedLineNumber?: number;
    hoveredMemoryBlockKey?: string;
    selectedBlockKey?: string;
    showDetailPanel: boolean;
    detailPanelContent?: any;
  };

  /**
   * Settings
   */
  settings: {
    theme: 'light' | 'dark';
    layoutMode: 'desktop' | 'compact' | 'execution-focus' | 'memory-inspection';
    fontSize: number;
    showMemory: boolean;
    showStack: boolean;
    showCompilation: boolean;
    memoryFilterMode: 'all' | 'valid' | 'owner-specific';
    autoScroll: boolean;
  };

  /**
   * History for undo/redo
   */
  history: {
    past: ExecutionSnapshot[];
    present: ExecutionSnapshot | null;
    future: ExecutionSnapshot[];
  };
}
```

### 3.3 Interaction Events

```typescript
interface RuntimeTestBenchEvent {
  type: 
    | 'script-changed'
    | 'script-parsed'
    | 'execution-started'
    | 'execution-step'
    | 'execution-completed'
    | 'execution-error'
    | 'block-hover'
    | 'memory-hover'
    | 'block-selected'
    | 'settings-changed'
    | 'theme-changed';

  payload: any;
  timestamp: number;
}

type RuntimeTestBenchEventHandler = (event: RuntimeTestBenchEvent) => void;

interface EventBus {
  on(eventType: string, handler: RuntimeTestBenchEventHandler): void;
  off(eventType: string, handler: RuntimeTestBenchEventHandler): void;
  emit(event: RuntimeTestBenchEvent): void;
}
```

---

## 4. Integration with Existing Runtime System

### 4.1 Adapter Pattern for ScriptRuntime

```typescript
/**
 * Adapter that converts ScriptRuntime state into RuntimeTestBench-compatible format
 */
interface IRuntimeAdapter {
  /**
   * Convert current runtime state to test bench snapshot
   */
  toSnapshot(runtime: ScriptRuntime): ExecutionSnapshot;

  /**
   * Convert memory entries to display format
   */
  extractMemory(runtime: ScriptRuntime): MemoryEntry[];

  /**
   * Convert stack to display format
   */
  extractStack(runtime: ScriptRuntime): RuntimeStackBlock[];

  /**
   * Convert statements to compilation display format
   */
  extractStatements(script: WodScript): CompilationStatement[];

  /**
   * Extract errors from runtime
   */
  extractErrors(runtime: ScriptRuntime): RuntimeError[];
}

export class RuntimeAdapter implements IRuntimeAdapter {
  toSnapshot(runtime: ScriptRuntime): ExecutionSnapshot {
    return {
      stack: this.extractStackInfo(runtime),
      memory: this.extractMemoryInfo(runtime),
      metrics: this.extractMetrics(runtime),
      timestamp: Date.now()
    };
  }

  private extractStackInfo(runtime: ScriptRuntime) {
    const blocks = runtime.stack.blocksBottomFirst.map((block, index) => 
      this.blockToDisplayFormat(block, index)
    );
    return {
      blocks,
      activeIndex: blocks.length - 1,
      depth: blocks.length
    };
  }

  private extractMemoryInfo(runtime: ScriptRuntime) {
    // Convert memory.search() results to MemoryEntry[]
    const refs = runtime.memory.search({ 
      id: null, 
      ownerId: null, 
      type: null, 
      visibility: null 
    });
    
    const entries = refs.map(ref => ({
      id: ref.id,
      type: ref.type as MemoryType,
      ownerBlockKey: ref.ownerId || 'unknown',
      displayValue: this.formatMemoryValue(ref),
      rawValue: runtime.memory.get(ref),
      isValid: true,
      childCount: 0
    }));

    return {
      entries,
      totalAllocated: entries.length,
      groupedByOwner: this.groupByOwner(entries),
      groupedByType: this.groupByType(entries)
    };
  }

  private blockToDisplayFormat(block: IRuntimeBlock, depth: number): RuntimeStackBlock {
    return {
      key: block.key.toString(),
      blockType: (block.blockType as any) || 'Idle',
      displayName: block.blockType || block.constructor.name,
      depth,
      metrics: [],
      status: 'idle',
      sourceLineNumber: undefined
    };
  }

  private formatMemoryValue(ref: any): string {
    // Format memory value for display
    return JSON.stringify(ref.value).substring(0, 50);
  }

  private groupByOwner(entries: MemoryEntry[]): Record<string, MemoryEntry[]> {
    return entries.reduce((acc, entry) => {
      const owner = entry.ownerBlockKey;
      if (!acc[owner]) acc[owner] = [];
      acc[owner].push(entry);
      return acc;
    }, {} as Record<string, MemoryEntry[]>);
  }

  private groupByType(entries: MemoryEntry[]): Record<string, MemoryEntry[]> {
    return entries.reduce((acc, entry) => {
      const type = entry.type;
      if (!acc[type]) acc[type] = [];
      acc[type].push(entry);
      return acc;
    }, {} as Record<string, MemoryEntry[]>);
  }

  private extractMetrics(runtime: ScriptRuntime) {
    return {
      executedBlocks: runtime.stack.blocks.length,
      elapsedTime: 0,
      stepCount: 0,
      errorCount: 0
    };
  }
}
```

---

## 5. Data Flow Diagram

```
┌─────────────────────────────────────────────────────┐
│         RuntimeTestBench Component                  │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌────────────────────────────────────────────┐   │
│  │      State & Context Management            │   │
│  │  - ExecutionContext                        │   │
│  │  - RuntimeTestBenchState                   │   │
│  │  - EventBus                                │   │
│  └────────────────────────────────────────────┘   │
│                      │                             │
│                      ▼                             │
│  ┌────────────────────────────────────────────┐   │
│  │      RuntimeAdapter                        │   │
│  │  Converts ScriptRuntime → TestBench format │   │
│  └────────────────────────────────────────────┘   │
│                      │                             │
│        ┌─────────────┼─────────────┐              │
│        ▼             ▼             ▼              │
│  ┌──────────┐  ┌──────────┐  ┌─────────────┐    │
│  │ Editor   │  │Compiler  │  │ Memory      │    │
│  │ Panel    │  │ Panel    │  │ Panel       │    │
│  └──────────┘  └──────────┘  └─────────────┘    │
│        │             │             │             │
│        └─────────────┼─────────────┘             │
│                      │                           │
│                      ▼                           │
│  ┌────────────────────────────────────────────┐   │
│  │    Runtime Stack Panel                     │   │
│  │    Controls Panel                          │   │
│  └────────────────────────────────────────────┘   │
│                                                   │
└─────────────────────────────────────────────────────┘
                       │
                       ▼
              ScriptRuntime (via JIT)
```

---

## 6. Hook Interfaces (React)

```typescript
/**
 * Hook to manage Runtime Test Bench state
 */
function useRuntimeTestBench(
  initialScript?: string,
  initialRuntime?: ScriptRuntime
): RuntimeTestBenchState & {
  updateScript: (script: string) => void;
  stepExecution: () => void;
  resetExecution: () => void;
  setHighlightedBlock: (key?: string) => void;
  setHighlightedMemory: (id?: string) => void;
  updateSettings: (settings: Partial<RuntimeTestBenchState['settings']>) => void;
  subscribe: (handler: RuntimeTestBenchEventHandler) => () => void;
};

/**
 * Hook to extract and update runtime snapshot
 */
function useRuntimeSnapshot(runtime?: ScriptRuntime): {
  snapshot: ExecutionSnapshot | null;
  adapter: IRuntimeAdapter;
  refresh: () => void;
};

/**
 * Hook to manage memory visualization
 */
function useMemoryVisualization(
  runtime?: ScriptRuntime,
  filterMode?: 'all' | 'valid' | 'owner-specific',
  highlightedBlockKey?: string
): {
  entries: MemoryEntry[];
  groupedByOwner: Record<string, MemoryEntry[]>;
  groupedByType: Record<string, MemoryEntry[]>;
  filter: (options: MemoryFilter) => void;
};

/**
 * Hook for keyboard shortcuts
 */
function useTestBenchShortcuts(handler: {
  onNextBlock: () => void;
  onReset: () => void;
  onSettings: () => void;
}): void;

/**
 * Hook to manage cross-panel highlighting
 */
function useHighlighting(): {
  highlightedBlock?: string;
  highlightedMemory?: string;
  highlightedLine?: number;
  setBlockHighlight: (key?: string, line?: number) => void;
  setMemoryHighlight: (id?: string, blockKey?: string) => void;
  setLineHighlight: (line?: number) => void;
  clear: () => void;
};
```

---

## 7. CSS/Styling Architecture

```typescript
/**
 * Design tokens and theme configuration
 */
interface RuntimeTestBenchTheme {
  colors: {
    block: Record<'Root' | 'Timer' | 'Effort' | 'Rounds' | 'Completion' | 'Idle', BlockColors>;
    memory: Record<MemoryType, string>;
    ui: {
      background: string;
      foreground: string;
      border: string;
      hover: string;
      active: string;
      error: string;
      warning: string;
      success: string;
    };
  };

  spacing: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };

  typography: {
    fontFamily: string;
    fontSize: Record<'xs' | 'sm' | 'md' | 'lg' | 'xl', string>;
    fontWeight: Record<'light' | 'normal' | 'bold', number>;
    lineHeight: Record<'tight' | 'normal' | 'relaxed', string>;
  };

  shadows: Record<'sm' | 'md' | 'lg' | 'xl', string>;
  transitions: Record<string, string>;
}

interface BlockColors {
  background: string;
  border: string;
  text: string;
  hover?: string;
}
```

---

## 8. Implementation Checklist

### Core Interfaces
- [ ] `RuntimeTestBenchProps`
- [ ] `EditorPanelProps`
- [ ] `CompilationPanelProps`
- [ ] `RuntimeStackPanelProps`
- [ ] `MemoryVisualizationPanelProps`
- [ ] `ControlsPanelProps`
- [ ] `ToolbarProps`

### Supporting Types
- [ ] `ExecutionContext`
- [ ] `ExecutionSnapshot`
- [ ] `RuntimeStackBlock`
- [ ] `MemoryEntry`
- [ ] `ParseResults`
- [ ] `RuntimeTestBenchState`

### Adapter Pattern
- [ ] `IRuntimeAdapter` interface
- [ ] `RuntimeAdapter` implementation

### Hooks
- [ ] `useRuntimeTestBench`
- [ ] `useRuntimeSnapshot`
- [ ] `useMemoryVisualization`
- [ ] `useTestBenchShortcuts`
- [ ] `useHighlighting`

### Components
- [ ] `EditorPanel`
- [ ] `CompilationPanel`
- [ ] `RuntimeStackPanel`
- [ ] `MemoryVisualizationPanel`
- [ ] `ControlsPanel`
- [ ] `Toolbar`
- [ ] `RuntimeTestBench`

### Styling
- [ ] Define Tailwind classes
- [ ] Create theme tokens
- [ ] Implement dark mode
- [ ] Test responsive breakpoints

### Testing
- [ ] Unit tests for adapters
- [ ] Component snapshot tests
- [ ] Integration tests for data flow
- [ ] Accessibility tests
- [ ] Performance benchmarks

---

## 9. Migration Path from JitCompilerDemo

The existing `JitCompilerDemo` component can be incrementally refactored into the new test bench architecture:

1. **Extract panels** from monolithic component
2. **Create adapter** to convert existing data structures
3. **Implement hooks** for state management
4. **Build new layout** with grid system
5. **Migrate interactions** from direct state to events
6. **Add new features** (highlighting, filtering, modals)
7. **Performance optimization** (virtualization, memoization)
8. **Documentation and testing**

---

**Document Version**: 1.0  
**Status**: Complete  
**Ready for**: Engineering Review
