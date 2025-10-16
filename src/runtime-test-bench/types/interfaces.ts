// Runtime Test Bench UI - TypeScript Interfaces
// Generated from data-model.md sections 1-4
// All interfaces follow strict TypeScript patterns for React component library

import type { ScriptRuntime as RealScriptRuntime } from '../../runtime/ScriptRuntime';

// ============================================================================
// 1. UI STATE LAYER
// ============================================================================

/**
 * Central state container for entire test bench
 * Lifecycle: Created on mount, persists during session
 * Relationships: Source of truth for all panels
 */
export interface RuntimeTestBenchState {
  // Script & Parsing
  script: string;
  parseResults: ParseResults;

  // Runtime
  runtime?: RealScriptRuntime;
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

/**
 * Props for the RuntimeTestBench component
 */
export interface RuntimeTestBenchProps {
  initialCode?: string;
  onCodeChange?: (code: string) => void;
  className?: string;
}

/**
 * Holds parsing and compilation output
 * Lifecycle: Updated on script change (debounced 500ms)
 */
export interface ParseResults {
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

export interface ParseError {
  line: number;
  column: number;
  message: string;
  severity: 'error' | 'warning';
  suggestion?: string;
}

export interface ParseWarning {
  line: number;
  column: number;
  message: string;
  code: string;
}

/**
 * Manages cross-panel highlighting
 * Lifecycle: Updated on hover events
 */
export interface HighlightState {
  blockKey?: string;      // RuntimeBlock being hovered
  memoryId?: string;      // Memory entry being hovered
  line?: number;          // Editor line being highlighted
  source?: HighlightSource;
}

export type HighlightSource =
  | 'editor'
  | 'stack'
  | 'memory'
  | 'compilation';

// ============================================================================
// 2. DOMAIN LAYER
// ============================================================================

/**
 * Immutable snapshot of runtime state for UI rendering
 * Lifecycle: Created by RuntimeAdapter on each step
 * Relationships: Consumed by all visualization panels
 */
export interface ExecutionSnapshot {
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

export type ExecutionStatus =
  | 'idle'
  | 'executing'
  | 'paused'
  | 'completed'
  | 'error';

/**
 * UI-friendly representation of IRuntimeBlock
 * Lifecycle: Created during snapshot generation
 * Relationships: Rendered in RuntimeStackPanel
 */
export interface RuntimeStackBlock {
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

export type BlockType =
  | 'workout'
  | 'group'
  | 'timer'
  | 'rounds'
  | 'effort'
  | 'exercise'
  | 'custom';

export type BlockStatus =
  | 'pending'
  | 'active'
  | 'running'
  | 'complete'
  | 'error';

export interface MetricValue {
  value: any;
  unit?: string;
  formatted: string;
}

/**
 * UI-friendly representation of memory allocation
 * Lifecycle: Created during snapshot generation
 * Relationships: Rendered in MemoryPanel
 */
export interface MemoryEntry {
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

export type MemoryType =
  | 'metric'
  | 'timer-state'
  | 'loop-state'
  | 'group-state'
  | 'handler'
  | 'span'
  | 'unknown';

export type MemoryGrouping =
  | 'owner'
  | 'type'
  | 'none';

// ============================================================================
// 3. COMPONENT PROPS LAYER
// ============================================================================

/**
 * Base props interface for all panel components
 */
export interface BasePanelProps {
  className?: string;
  style?: React.CSSProperties;
  testId?: string;
}

/**
 * Props for EditorPanel component
 */
export interface EditorPanelProps extends BasePanelProps {
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

/**
 * Props for CompilationPanel component
 */
export interface CompilationPanelProps extends BasePanelProps {
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

export type CompilationTab = 'output' | 'errors';

export interface LogEntry {
  id: string;
  timestamp: number;
  message: string;
  level: 'info' | 'success' | 'warning' | 'error';
  metadata?: Record<string, any>;
}

/**
 * Props for RuntimeStackPanel component
 */
export interface RuntimeStackPanelProps extends BasePanelProps {
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

/**
 * Props for MemoryPanel component
 */
export interface MemoryPanelProps extends BasePanelProps {
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

/**
 * Props for Toolbar component
 */
export interface ToolbarProps extends BasePanelProps {
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

export interface NavItem {
  id: string;
  label: string;
  path: string;
  isActive: boolean;
}

export interface ActionButton {
  id: string;
  label: string;
  icon: string;
  disabled?: boolean;
  loading?: boolean;
  tooltip?: string;
}

/**
 * Props for StatusFooter component
 */
export interface StatusFooterProps extends BasePanelProps {
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

/**
 * Props for ControlsPanel component
 * Lifecycle: Created during component initialization
 * Relationships: Used by ControlsPanel for execution control UI
 */
export interface ControlsPanelProps extends BasePanelProps {
  /** Current execution status */
  status: ExecutionStatus;
  /** Whether controls are enabled */
  enabled: boolean;
  /** Execution speed multiplier (1.0 = normal speed) */
  speed: number;
  /** Callback for play/pause toggle */
  onPlayPause: () => void;
  /** Callback for stop execution */
  onStop: () => void;
  /** Callback for reset execution */
  onReset: () => void;
  /** Callback for speed change */
  onSpeedChange: (speed: number) => void;
  /** Callback for step execution */
  onStep: () => void;
  /** Whether step mode is enabled */
  stepMode: boolean;
  /** Callback for step mode toggle */
  onStepModeToggle: () => void;
}

// ============================================================================
// 4. INTEGRATION LAYER
// ============================================================================

/**
 * Converts ScriptRuntime state to ExecutionSnapshot
 * Lifecycle: Singleton instance, stateless
 */
export interface IRuntimeAdapter {
  /**
   * Creates immutable snapshot of runtime state
   * @param runtime - ScriptRuntime instance
   * @returns ExecutionSnapshot for UI rendering
   */
  createSnapshot(runtime: RealScriptRuntime): ExecutionSnapshot;

  /**
   * Extracts RuntimeStackBlocks from runtime stack
   * @param runtime - ScriptRuntime instance
   * @returns Array of UI-friendly block representations
   */
  extractStackBlocks(runtime: RealScriptRuntime): RuntimeStackBlock[];

  /**
   * Extracts MemoryEntries from runtime memory
   * @param runtime - ScriptRuntime instance
   * @returns Array of UI-friendly memory entries
   */
  extractMemoryEntries(runtime: RealScriptRuntime): MemoryEntry[];

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

// ============================================================================
// DEPENDENCY IMPORTS (to be resolved)
// ============================================================================

// These types are imported from existing WOD Wiki modules
// They will be available at runtime but need to be imported in implementation files

export interface ScriptRuntime {
  readonly memory: RuntimeMemory;
  readonly stack: IRuntimeBlock[];
  handle(event: NextEvent): void;
  mount(): void;
  unmount(): void;
  dispose(): void;
}

export interface RuntimeMemory {
  search(criteria: SearchCriteria): MemoryReference[];
  get<T>(id: string): T | undefined;
  allocate<T>(entry: MemoryEntryAllocation<T>): string;
}

export interface IRuntimeBlock {
  // Existing interface - no modifications
}

export interface NextEvent {
  // Existing interface - no modifications
}

export interface CodeStatement {
  // Existing interface - no modifications
}

export interface SearchCriteria {
  // Existing interface - no modifications
}

export interface MemoryReference {
  // Existing interface - no modifications
}

// Utility types for MemoryEntry allocation
export interface MemoryEntryAllocation<T = any> {
  ownerId: string;
  type: MemoryType;
  value: T;
  label?: string;
}

// ============================================================================
// HOOK RETURN TYPES
// ============================================================================

/**
 * Return type for useRuntimeTestBench hook
 */
export interface UseRuntimeTestBenchReturn {
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

/**
 * Return type for useRuntimeSnapshot hook
 */
export interface UseRuntimeSnapshotReturn {
  snapshot?: ExecutionSnapshot;
  loading: boolean;
  error?: Error;
}

/**
 * Return type for useMemoryVisualization hook
 */
export interface UseMemoryVisualizationReturn {
  entries: MemoryEntry[];
  filteredEntries: MemoryEntry[];
  groupedEntries: Map<string, MemoryEntry[]>;
  stats: {
    totalEntries: number;
    filteredCount: number;
    groupCount: number;
  };
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export type Theme = 'light' | 'dark' | 'system';

export interface ThemeColors {
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

export interface PerformanceMetrics {
  snapshotCreationTime: number;    // ms
  renderTime: number;               // ms
  memoryUsage?: number;             // MB
  frameRate?: number;               // fps
}

export interface CursorPosition {
  line: number;
  column: number;
  offset?: number;
}