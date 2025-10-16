# Data Model: Runtime Test Bench UI

**Feature**: Runtime Test Bench - Integrated UI Component  
**Date**: October 16, 2025  
**Status**: Complete

---

## Overview

This document defines all data entities, TypeScript interfaces, and their relationships for the Runtime Test Bench UI. The data model is organized into three layers:

1. **UI State Layer**: Component props and local state
2. **Domain Layer**: ExecutionSnapshot and derived data structures
3. **Integration Layer**: RuntimeAdapter for ScriptRuntime integration

---

## 1. UI State Layer

### 1.1 RuntimeTestBenchState

**Purpose**: Central state container for entire test bench  
**Lifecycle**: Created on mount, persists during session  
**Relationships**: Source of truth for all panels

```typescript
interface RuntimeTestBenchState {
  // Script & Parsing
  script: string;
  parseResults: ParseResults;
  
  // Runtime
  runtime?: ScriptRuntime;
  snapshot?: ExecutionSnapshot;
  
  // Execution
  status: ExecutionStatus;
  stepCount: number;
  elapsedTime: number;
  eventQueue: NextEvent[];
  
  // UI State
  highlighting: HighlightState;
  compilationTab: CompilationTab;
  compilationLog: LogEntry[];
  
  // Memory Panel
  memoryFilterText: string;
  memoryGroupBy: MemoryGrouping;
  
  // Settings
  theme: Theme;
  showMemory: boolean;
  showStack: boolean;
  fontSize: number;
  
  // Footer
  cursorPosition?: CursorPosition;
}
```

**Validation Rules**:
- `script` must be valid UTF-8 string
- `stepCount` >= 0
- `elapsedTime` >= 0
- `fontSize` between 8 and 24
- `eventQueue` max 100 items (prevent memory leaks)

**State Transitions**:
```
idle -> executing: User clicks Run or Next Block
executing -> paused: User clicks Pause (future feature)
executing -> completed: Runtime stack empty
executing -> error: Runtime throws error
error -> idle: User clicks Reset
completed -> idle: User clicks Reset
any -> idle: User edits script
```

### 1.2 ParseResults

**Purpose**: Holds parsing and compilation output  
**Lifecycle**: Updated on script change (debounced 500ms)

```typescript
interface ParseResults {
  statements: CodeStatement[];
  errors: ParseError[];
  warnings: ParseWarning[];
  status: 'idle' | 'parsing' | 'success' | 'error';
  metadata?: {
    parseTime: number;      // milliseconds
    statementCount: number;
    tokenCount: number;
  };
}

interface ParseError {
  line: number;
  column: number;
  message: string;
  severity: 'error' | 'warning';
  suggestion?: string;
}

interface ParseWarning {
  line: number;
  column: number;
  message: string;
  code: string;
}
```

**Validation Rules**:
- Errors must have line >= 1, column >= 1
- Status transitions: idle → parsing → (success | error)
- Statements array can be empty if errors exist

### 1.3 HighlightState

**Purpose**: Manages cross-panel highlighting  
**Lifecycle**: Updated on hover events

```typescript
interface HighlightState {
  blockKey?: string;      // RuntimeBlock being hovered
  memoryId?: string;      // Memory entry being hovered
  line?: number;          // Editor line being highlighted
  source?: HighlightSource;
}

type HighlightSource = 
  | 'editor'
  | 'stack'
  | 'memory'
  | 'compilation';
```

**Validation Rules**:
- Only one highlight active at a time
- `line` must be >= 1 if set
- `blockKey` must exist in current snapshot
- `memoryId` must exist in current memory

---

## 2. Domain Layer

### 2.1 ExecutionSnapshot

**Purpose**: Immutable snapshot of runtime state for UI rendering  
**Lifecycle**: Created by RuntimeAdapter on each step  
**Relationships**: Consumed by all visualization panels

```typescript
interface ExecutionSnapshot {
  // Runtime Stack
  stack: {
    blocks: RuntimeStackBlock[];
    activeIndex: number;
    depth: number;
    rootBlockKey?: string;
  };
  
  // Memory State
  memory: {
    entries: MemoryEntry[];
    groupedByOwner: Map<string, MemoryEntry[]>;
    groupedByType: Map<string, MemoryEntry[]>;
    totalEntries: number;
  };
  
  // Execution Status
  status: ExecutionStatus;
  
  // Metadata
  metadata: {
    stepCount: number;
    elapsedTime: number;
    lastEvent?: string;
    lastEventTime?: number;
    performanceMetrics?: PerformanceMetrics;
  };
  
  // Timestamp
  timestamp: number;
}

type ExecutionStatus = 
  | 'idle'
  | 'executing'
  | 'paused'
  | 'completed'
  | 'error';
```

**Validation Rules**:
- `activeIndex` must be < `blocks.length`
- `depth` must equal deepest nesting level in blocks
- `timestamp` must be monotonically increasing
- All `groupedByOwner` entries must appear in `entries`

### 2.2 RuntimeStackBlock

**Purpose**: UI-friendly representation of IRuntimeBlock  
**Lifecycle**: Created during snapshot generation  
**Relationships**: Rendered in RuntimeStackPanel

```typescript
interface RuntimeStackBlock {
  // Identity
  key: string;
  blockType: BlockType;
  
  // Hierarchy
  parentKey?: string;
  children: string[];
  depth: number;
  
  // Display
  label: string;
  color: string;
  icon?: string;
  
  // State
  isActive: boolean;
  isComplete: boolean;
  status: BlockStatus;
  
  // Metrics
  metrics?: Record<string, MetricValue>;
  
  // Source
  sourceIds: number[];
  lineNumber?: number;
  
  // Metadata
  metadata?: {
    mountTime?: number;
    executionTime?: number;
    iterationCount?: number;
  };
}

type BlockType =
  | 'workout'
  | 'group'
  | 'timer'
  | 'rounds'
  | 'effort'
  | 'exercise'
  | 'custom';

type BlockStatus =
  | 'pending'
  | 'active'
  | 'running'
  | 'complete'
  | 'error';

interface MetricValue {
  value: any;
  unit?: string;
  formatted: string;
}
```

**Validation Rules**:
- `key` must be unique within snapshot
- `depth` must match hierarchy level (root=0)
- `parentKey` must exist if depth > 0
- All `children` keys must exist in snapshot
- `color` must be valid CSS color
- `sourceIds` must be valid CodeStatement IDs

### 2.3 MemoryEntry

**Purpose**: UI-friendly representation of memory allocation  
**Lifecycle**: Created during snapshot generation  
**Relationships**: Rendered in MemoryPanel

```typescript
interface MemoryEntry {
  // Identity
  id: string;
  ownerId: string;
  ownerLabel?: string;
  
  // Type & Value
  type: MemoryType;
  value: any;
  valueFormatted: string;
  
  // Display
  label: string;
  groupLabel?: string;
  icon?: string;
  
  // State
  isValid: boolean;
  isHighlighted: boolean;
  
  // Metadata
  metadata?: {
    createdAt?: number;
    lastModified?: number;
    accessCount?: number;
  };
  
  // Relationships
  references?: string[];  // Other memory IDs this references
  referencedBy?: string[]; // Memory IDs that reference this
}

type MemoryType =
  | 'metric'
  | 'timer-state'
  | 'loop-state'
  | 'group-state'
  | 'handler'
  | 'span'
  | 'unknown';

type MemoryGrouping =
  | 'owner'
  | 'type'
  | 'none';
```

**Validation Rules**:
- `id` must be unique within snapshot
- `ownerId` must correspond to a RuntimeStackBlock key
- `type` must be recognized MemoryType
- `value` must be serializable to JSON
- All `references` must be valid memory IDs
- `isValid` false only if owner block is disposed

---

## 3. Component Props Layer

### 3.1 Panel Component Props

All panel components follow consistent interface pattern:

```typescript
interface BasePanelProps {
  className?: string;
  style?: React.CSSProperties;
  testId?: string;
}
```

#### EditorPanelProps

```typescript
interface EditorPanelProps extends BasePanelProps {
  // Content
  value: string;
  onChange: (script: string) => void;
  
  // Highlighting
  highlightedLine?: number;
  
  // Errors
  errors?: ParseError[];
  
  // Status
  status: 'idle' | 'parsing' | 'valid' | 'error';
  
  // Suggestions
  suggestions?: string[];
  onSuggestionSelect?: (suggestion: string) => void;
  
  // Read-only mode
  readonly?: boolean;
}
```

#### CompilationPanelProps

```typescript
interface CompilationPanelProps extends BasePanelProps {
  // Content
  statements?: CodeStatement[];
  errors: ParseError[];
  warnings: ParseWarning[];
  compilationLog: LogEntry[];
  
  // Tab State
  activeTab: CompilationTab;
  onTabChange: (tab: CompilationTab) => void;
  
  // Interactions
  onStatementClick?: (statementId: number) => void;
  onErrorClick?: (error: ParseError) => void;
}

type CompilationTab = 'output' | 'errors';

interface LogEntry {
  id: string;
  timestamp: number;
  message: string;
  level: 'info' | 'success' | 'warning' | 'error';
  metadata?: Record<string, any>;
}
```

#### RuntimeStackPanelProps

```typescript
interface RuntimeStackPanelProps extends BasePanelProps {
  // Data
  blocks: RuntimeStackBlock[];
  activeBlockIndex?: number;
  
  // Highlighting
  highlightedBlockKey?: string;
  
  // Interactions
  onBlockHover?: (blockKey?: string, lineNumber?: number) => void;
  onBlockClick?: (blockKey: string) => void;
  
  // Display Options
  showMetrics?: boolean;
  showIcons?: boolean;
  expandAll?: boolean;
}
```

#### MemoryPanelProps

```typescript
interface MemoryPanelProps extends BasePanelProps {
  // Data
  entries: MemoryEntry[];
  
  // Filtering
  filterText?: string;
  onFilterChange?: (text: string) => void;
  
  // Grouping
  groupBy: MemoryGrouping;
  onGroupByChange?: (groupBy: MemoryGrouping) => void;
  
  // Highlighting
  highlightedOwnerKey?: string;
  highlightedMemoryId?: string;
  
  // Interactions
  onEntryHover?: (entryId?: string, ownerKey?: string) => void;
  onEntryClick?: (entryId: string) => void;
  
  // Display Options
  showMetadata?: boolean;
  expandValues?: boolean;
}
```

#### ToolbarProps

```typescript
interface ToolbarProps extends BasePanelProps {
  // Branding
  title?: string;
  workoutName?: string;
  
  // Navigation
  navigationItems: NavItem[];
  onNavigate?: (path: string) => void;
  
  // Actions
  actionButtons: ActionButton[];
  onAction: (actionId: string) => void;
  
  // User
  userAvatar?: string;
  userName?: string;
  onUserClick?: () => void;
  
  // Settings
  onSettingsClick?: () => void;
  onHelpClick?: () => void;
}

interface NavItem {
  id: string;
  label: string;
  path: string;
  isActive: boolean;
}

interface ActionButton {
  id: string;
  label: string;
  icon: string;
  disabled?: boolean;
  loading?: boolean;
  tooltip?: string;
}
```

#### StatusFooterProps

```typescript
interface StatusFooterProps extends BasePanelProps {
  // Status
  status: ExecutionStatus;
  statusMessage?: string;
  
  // Cursor
  lineNumber?: number;
  columnNumber?: number;
  
  // Metadata
  blockCount?: number;
  elapsedTime?: number;
  
  // Actions
  onStatusClick?: () => void;
}
```

---

## 4. Integration Layer

### 4.1 RuntimeAdapter Interface

**Purpose**: Converts ScriptRuntime state to ExecutionSnapshot  
**Lifecycle**: Singleton instance, stateless

```typescript
interface IRuntimeAdapter {
  /**
   * Creates immutable snapshot of runtime state
   * @param runtime - ScriptRuntime instance
   * @returns ExecutionSnapshot for UI rendering
   */
  createSnapshot(runtime: ScriptRuntime): ExecutionSnapshot;
  
  /**
   * Extracts RuntimeStackBlocks from runtime stack
   * @param runtime - ScriptRuntime instance
   * @returns Array of UI-friendly block representations
   */
  extractStackBlocks(runtime: ScriptRuntime): RuntimeStackBlock[];
  
  /**
   * Extracts MemoryEntries from runtime memory
   * @param runtime - ScriptRuntime instance
   * @returns Array of UI-friendly memory entries
   */
  extractMemoryEntries(runtime: ScriptRuntime): MemoryEntry[];
  
  /**
   * Groups memory entries by specified grouping
   * @param entries - Memory entries to group
   * @param groupBy - Grouping strategy
   * @returns Grouped memory map
   */
  groupMemoryEntries(
    entries: MemoryEntry[],
    groupBy: MemoryGrouping
  ): Map<string, MemoryEntry[]>;
}
```

**Implementation Notes**:
- Must not modify ScriptRuntime state
- Must handle disposed blocks gracefully
- Performance target: <10ms for snapshot creation
- Must be pure functions (same input → same output)

### 4.2 ScriptRuntime Integration

**Existing Interface** (no modifications):

```typescript
// From src/runtime/ScriptRuntime.ts
class ScriptRuntime {
  readonly memory: RuntimeMemory;
  readonly stack: IRuntimeBlock[];
  
  handle(event: NextEvent): void;
  mount(): void;
  unmount(): void;
  dispose(): void;
}

// Accessed by RuntimeAdapter
interface RuntimeMemory {
  search(criteria: SearchCriteria): MemoryReference[];
  get<T>(id: string): T | undefined;
  allocate<T>(entry: MemoryEntry<T>): string;
}
```

**Adapter Usage**:
```typescript
const adapter = new RuntimeAdapter();
const snapshot = adapter.createSnapshot(scriptRuntime);

// Snapshot is immutable - safe to pass to React components
<RuntimeStackPanel blocks={snapshot.stack.blocks} />
<MemoryPanel entries={snapshot.memory.entries} />
```

---

## 5. Hook Return Types

### 5.1 useRuntimeTestBench Return Type

```typescript
interface UseRuntimeTestBenchReturn {
  // State
  state: RuntimeTestBenchState;
  snapshot?: ExecutionSnapshot;
  
  // Script Actions
  updateScript: (script: string) => void;
  loadScript: (script: string, name?: string) => void;
  
  // Execution Actions
  run: () => void;
  stepExecution: () => void;
  stepOver: () => void;
  stepInto: () => void;
  resetExecution: () => void;
  pauseExecution: () => void;
  
  // UI Actions
  setHighlightedBlock: (blockKey?: string, line?: number) => void;
  setHighlightedMemory: (memoryId?: string, ownerKey?: string) => void;
  setMemoryFilter: (text: string) => void;
  setMemoryGrouping: (groupBy: MemoryGrouping) => void;
  setCompilationTab: (tab: CompilationTab) => void;
  
  // Settings Actions
  setTheme: (theme: Theme) => void;
  setFontSize: (size: number) => void;
  toggleMemoryPanel: () => void;
  toggleStackPanel: () => void;
}
```

### 5.2 useRuntimeSnapshot Return Type

```typescript
interface UseRuntimeSnapshotReturn {
  snapshot?: ExecutionSnapshot;
  loading: boolean;
  error?: Error;
}
```

### 5.3 useMemoryVisualization Return Type

```typescript
interface UseMemoryVisualizationReturn {
  entries: MemoryEntry[];
  filteredEntries: MemoryEntry[];
  groupedEntries: Map<string, MemoryEntry[]>;
  stats: {
    totalEntries: number;
    filteredCount: number;
    groupCount: number;
  };
}
```

---

## 6. Utility Types

### 6.1 Theme

```typescript
type Theme = 'light' | 'dark' | 'system';

interface ThemeColors {
  primary: string;
  backgroundLight: string;
  backgroundDark: string;
  panelBackground: string;
  textColor: string;
  success: string;
  error: string;
  info: string;
  warning: string;
}
```

### 6.2 Performance Metrics

```typescript
interface PerformanceMetrics {
  snapshotCreationTime: number;    // ms
  renderTime: number;               // ms
  memoryUsage?: number;             // MB
  frameRate?: number;               // fps
}
```

### 6.3 Cursor Position

```typescript
interface CursorPosition {
  line: number;
  column: number;
  offset?: number;
}
```

---

## 7. Entity Relationships

```
RuntimeTestBenchState
  ├─ contains → ParseResults
  ├─ contains → ExecutionSnapshot
  │   ├─ contains → RuntimeStackBlock[]
  │   │   └─ references → MemoryEntry (via ownerId)
  │   └─ contains → MemoryEntry[]
  │       └─ references → RuntimeStackBlock (via ownerId)
  ├─ contains → HighlightState
  │   ├─ references → RuntimeStackBlock (via blockKey)
  │   └─ references → MemoryEntry (via memoryId)
  └─ contains → LogEntry[]

ScriptRuntime
  ├─ transformed by → RuntimeAdapter
  └─ produces → ExecutionSnapshot

Panel Components
  ├─ consume → ExecutionSnapshot
  ├─ consume → ParseResults
  └─ emit → User Actions → RuntimeTestBenchState updates
```

---

## 8. Validation Summary

### Required Validations

1. **RuntimeTestBenchState**:
   - stepCount >= 0
   - elapsedTime >= 0
   - fontSize in range [8, 24]
   - eventQueue.length <= 100

2. **ParseResults**:
   - errors[].line >= 1
   - errors[].column >= 1
   - status transitions valid

3. **ExecutionSnapshot**:
   - activeIndex < blocks.length
   - depth matches actual nesting
   - timestamp monotonic

4. **RuntimeStackBlock**:
   - key unique
   - depth matches hierarchy
   - parentKey exists if depth > 0
   - children keys exist

5. **MemoryEntry**:
   - id unique
   - ownerId valid block key
   - value serializable
   - references valid

### Invariants

- ExecutionSnapshot is immutable
- RuntimeAdapter is stateless
- All hooks are pure (no side effects in render)
- Panel components are memoized

---

**Document Status**: ✅ Complete  
**Next**: Generate contracts for component APIs
