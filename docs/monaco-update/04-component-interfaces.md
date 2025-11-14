# Component Interfaces & API Design

## Overview

This document defines the TypeScript interfaces and API contracts for all new components in the enhanced Monaco editor implementation.

## Core Data Structures

### WodBlock

Represents a single WOD block within the markdown document.

```typescript
interface WodBlock {
  /** Unique identifier for this block */
  id: string;
  
  /** Line number where ```wod appears (0-indexed) */
  startLine: number;
  
  /** Line number where closing ``` appears (0-indexed) */
  endLine: number;
  
  /** Raw text content of the WOD block (without backticks) */
  content: string;
  
  /** Parser instance for this block (lazy-initialized) */
  parser?: MdTimerRuntime;
  
  /** Parsed statements (populated after parsing) */
  statements?: ICodeStatement[];
  
  /** Parse errors, if any */
  errors?: ParseError[];
  
  /** Runtime instance (only when workout is active) */
  runtime?: ScriptRuntime;
  
  /** Execution state */
  state: WodBlockState;
  
  /** Monaco widget/zone IDs for cleanup */
  widgetIds: {
    overlay?: string;
    clockZone?: string;
    resultsZone?: string;
  };
  
  /** Collected workout data (after completion) */
  results?: WorkoutResults;
}

type WodBlockState = 
  | 'idle'       // Not parsed yet
  | 'parsing'    // Parse in progress
  | 'parsed'     // Successfully parsed
  | 'error'      // Parse error
  | 'starting'   // Runtime initializing
  | 'running'    // Workout in progress
  | 'paused'     // Workout paused
  | 'completed'  // Workout finished
  | 'stopped';   // Workout stopped early
```

### WorkoutResults

Data collected during/after workout execution.

```typescript
interface WorkoutResults {
  /** When workout started */
  startTime: number;
  
  /** When workout ended */
  endTime: number;
  
  /** Total elapsed time (ms) */
  duration: number;
  
  /** Rounds completed (for rounds-based workouts) */
  roundsCompleted?: number;
  
  /** Total rounds (for rounds-based workouts) */
  totalRounds?: number;
  
  /** Reps completed (for rep-based workouts) */
  repsCompleted?: number;
  
  /** Metrics collected from runtime */
  metrics: WorkoutMetric[];
  
  /** Whether workout was completed or stopped early */
  completed: boolean;
}

interface WorkoutMetric {
  name: string;
  value: number | string;
  unit?: string;
  timestamp?: number;
}
```

### ParseError

Standardized error format for parsing failures.

```typescript
interface ParseError {
  /** Line number (1-indexed for display) */
  line?: number;
  
  /** Column number (1-indexed for display) */
  column?: number;
  
  /** Error message */
  message: string;
  
  /** Severity level */
  severity: 'error' | 'warning' | 'info';
  
  /** Code excerpt showing the error */
  excerpt?: string;
}
```

## Component Props

### MarkdownEditor

Main component wrapping Monaco with markdown support.

```typescript
interface MarkdownEditorProps {
  /** Initial markdown content */
  initialContent?: string;
  
  /** Callback when content changes */
  onContentChange?: (content: string) => void;
  
  /** Callback when title changes (first line) */
  onTitleChange?: (title: string) => void;
  
  /** Whether to show markdown toolbar */
  showToolbar?: boolean;
  
  /** Whether editor is read-only */
  readonly?: boolean;
  
  /** Custom theme name */
  theme?: string;
  
  /** Custom CSS class */
  className?: string;
  
  /** Height of editor (default: 100vh) */
  height?: string | number;
  
  /** Width of editor (default: 100%) */
  width?: string | number;
  
  /** Optional Monaco options override */
  editorOptions?: monaco.editor.IStandaloneEditorConstructionOptions;
}
```

### WodBlockManager

Component managing WOD block detection and lifecycle.

```typescript
interface WodBlockManagerProps {
  /** Monaco editor instance */
  editor: monaco.editor.IStandaloneCodeEditor;
  
  /** Current markdown content */
  content: string;
  
  /** Callback when blocks change */
  onBlocksChange?: (blocks: WodBlock[]) => void;
  
  /** Callback when active block changes */
  onActiveBlockChange?: (blockId: string | null) => void;
  
  /** Whether to show context overlays */
  showOverlays?: boolean;
  
  /** Whether to show inline view zones */
  showInlineViews?: boolean;
  
  /** Parsing debounce delay (ms, default: 500) */
  parseDelay?: number;
}
```

### ContextOverlay

Widget showing WOD block context and controls.

```typescript
interface ContextOverlayProps {
  /** Monaco editor instance */
  editor: monaco.editor.IStandaloneCodeEditor;
  
  /** Block to display context for */
  block: WodBlock;
  
  /** Callback when block content should be updated */
  onUpdateBlock?: (blockId: string, newContent: string) => void;
  
  /** Callback when workout should start */
  onStartWorkout?: (blockId: string) => void;
  
  /** Callback when workout should stop */
  onStopWorkout?: (blockId: string) => void;
  
  /** Callback when workout should pause */
  onPauseWorkout?: (blockId: string) => void;
  
  /** Callback when workout should resume */
  onResumeWorkout?: (blockId: string) => void;
  
  /** Whether overlay is visible */
  visible: boolean;
  
  /** Width of overlay panel (default: 400px) */
  width?: number;
  
  /** Whether to show debug info */
  debug?: boolean;
}
```

### ContextPanel

Content of the context overlay.

```typescript
interface ContextPanelProps {
  /** Block data */
  block: WodBlock;
  
  /** Callbacks for block updates */
  onUpdateContent: (newContent: string) => void;
  onStartWorkout: () => void;
  onStopWorkout: () => void;
  onPauseWorkout: () => void;
  onResumeWorkout: () => void;
  
  /** Whether in compact mode */
  compact?: boolean;
}
```

### FragmentEditor

UI for adding/editing workout statements.

```typescript
interface FragmentEditorProps {
  /** Current parsed statements */
  statements: ICodeStatement[];
  
  /** Callback when new statement should be added */
  onAddStatement: (statement: ICodeStatement) => void;
  
  /** Callback when statement should be updated */
  onUpdateStatement: (index: number, statement: ICodeStatement) => void;
  
  /** Callback when statement should be deleted */
  onDeleteStatement: (index: number) => void;
  
  /** Currently selected statement index */
  selectedIndex?: number;
  
  /** Callback when selection changes */
  onSelectionChange?: (index: number | null) => void;
}

interface FragmentEditorItemProps {
  /** Statement to edit */
  statement: ICodeStatement;
  
  /** Callback when statement changes */
  onChange: (statement: ICodeStatement) => void;
  
  /** Whether this item is selected */
  selected?: boolean;
  
  /** Callback when item clicked */
  onClick?: () => void;
}
```

### WorkoutControls

Start/stop/pause controls for workouts.

```typescript
interface WorkoutControlsProps {
  /** Current workout state */
  state: WodBlockState;
  
  /** Control callbacks */
  onStart: () => void;
  onStop: () => void;
  onPause: () => void;
  onResume: () => void;
  onReset?: () => void;
  
  /** Whether controls are disabled */
  disabled?: boolean;
  
  /** Size variant */
  size?: 'small' | 'medium' | 'large';
  
  /** Layout orientation */
  orientation?: 'horizontal' | 'vertical';
}
```

### ClockViewZone

View zone displaying workout clock.

```typescript
interface ClockViewZoneProps {
  /** Monaco editor instance */
  editor: monaco.editor.IStandaloneCodeEditor;
  
  /** Block this zone belongs to */
  block: WodBlock;
  
  /** Callback when zone should be removed */
  onRemove?: () => void;
  
  /** Height of zone (default: auto) */
  height?: number;
  
  /** Whether to show debug borders */
  debug?: boolean;
}
```

### ResultsViewZone

View zone displaying workout results.

```typescript
interface ResultsViewZoneProps {
  /** Monaco editor instance */
  editor: monaco.editor.IStandaloneCodeEditor;
  
  /** Block this zone belongs to */
  block: WodBlock;
  
  /** Results to display */
  results: WorkoutResults;
  
  /** Callback when zone should be removed */
  onRemove?: () => void;
  
  /** Height of zone (default: auto) */
  height?: number;
  
  /** Whether to show debug borders */
  debug?: boolean;
}
```

### ResultsTable

Component displaying workout metrics.

```typescript
interface ResultsTableProps {
  /** Results data */
  results: WorkoutResults;
  
  /** Whether to show detailed metrics */
  detailed?: boolean;
  
  /** Custom CSS class */
  className?: string;
  
  /** Callback for export action */
  onExport?: () => void;
}
```

### MarkdownToolbar

Basic markdown formatting toolbar.

```typescript
interface MarkdownToolbarProps {
  /** Monaco editor instance */
  editor: monaco.editor.IStandaloneCodeEditor | null;
  
  /** Callback when WOD block should be inserted */
  onInsertWodBlock?: () => void;
  
  /** Whether toolbar is visible */
  visible?: boolean;
  
  /** Position preference */
  position?: 'top' | 'bottom' | 'floating';
}
```

## Hook Interfaces

### useWodBlocks

Hook for detecting and managing WOD blocks.

```typescript
function useWodBlocks(
  editor: monaco.editor.IStandaloneCodeEditor | null,
  content: string,
  options?: UseWodBlocksOptions
): UseWodBlocksResult;

interface UseWodBlocksOptions {
  /** Debounce delay for detection (default: 300ms) */
  debounceMs?: number;
  
  /** Whether to auto-parse blocks */
  autoParse?: boolean;
  
  /** Parse delay after detection (default: 500ms) */
  parseDelayMs?: number;
}

interface UseWodBlocksResult {
  /** All detected blocks */
  blocks: WodBlock[];
  
  /** Currently active block (based on cursor) */
  activeBlock: WodBlock | null;
  
  /** Get block by ID */
  getBlock: (id: string) => WodBlock | undefined;
  
  /** Update block content */
  updateBlock: (id: string, content: string) => void;
  
  /** Trigger re-detection */
  redetect: () => void;
  
  /** Whether detection is in progress */
  detecting: boolean;
}
```

### useBlockParser

Hook for parsing WOD block content.

```typescript
function useBlockParser(
  block: WodBlock | null,
  options?: UseBlockParserOptions
): UseBlockParserResult;

interface UseBlockParserOptions {
  /** Debounce delay (default: 500ms) */
  debounceMs?: number;
  
  /** Whether to auto-parse on content change */
  autoParse?: boolean;
}

interface UseBlockParserResult {
  /** Parsed statements */
  statements: ICodeStatement[];
  
  /** Parse errors */
  errors: ParseError[];
  
  /** Parse status */
  status: 'idle' | 'parsing' | 'success' | 'error';
  
  /** Trigger manual parse */
  parse: () => void;
  
  /** Clear parse results */
  clear: () => void;
}
```

### useBlockRuntime

Hook for managing workout runtime.

```typescript
function useBlockRuntime(
  block: WodBlock | null,
  options?: UseBlockRuntimeOptions
): UseBlockRuntimeResult;

interface UseBlockRuntimeOptions {
  /** Whether to auto-cleanup on unmount */
  autoCleanup?: boolean;
  
  /** Tick interval for clock updates (ms, default: 100) */
  tickInterval?: number;
}

interface UseBlockRuntimeResult {
  /** Runtime instance (null if not started) */
  runtime: ScriptRuntime | null;
  
  /** Current runtime state */
  state: WodBlockState;
  
  /** Control methods */
  start: () => void;
  stop: () => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
  
  /** Current elapsed time (ms) */
  elapsedTime: number;
  
  /** Whether runtime is active */
  isRunning: boolean;
  
  /** Collected results (available after completion) */
  results: WorkoutResults | null;
}
```

### useMonacoWidget

Generic hook for managing Monaco widgets.

```typescript
function useMonacoWidget<P = any>(
  editor: monaco.editor.IStandaloneCodeEditor | null,
  widgetFactory: WidgetFactory<P>,
  props: P,
  enabled: boolean
): UseMonacoWidgetResult;

type WidgetFactory<P> = (
  editor: monaco.editor.IStandaloneCodeEditor,
  props: P
) => monaco.editor.IContentWidget | monaco.editor.IOverlayWidget;

interface UseMonacoWidgetResult {
  /** Whether widget is currently mounted */
  mounted: boolean;
  
  /** Update widget props */
  updateProps: (props: any) => void;
  
  /** Manually trigger widget layout */
  layout: () => void;
}
```

### useViewZone

Hook for managing Monaco view zones.

```typescript
function useViewZone(
  editor: monaco.editor.IStandaloneCodeEditor | null,
  config: ViewZoneConfig,
  enabled: boolean
): UseViewZoneResult;

interface ViewZoneConfig {
  /** Line number to insert zone after */
  afterLineNumber: number;
  
  /** Height in pixels (or 'auto') */
  height: number | 'auto';
  
  /** Content to render */
  render: (container: HTMLElement) => React.ReactNode;
  
  /** Cleanup callback */
  onDispose?: () => void;
  
  /** Position update callback */
  onPositionChange?: (top: number) => void;
}

interface UseViewZoneResult {
  /** Zone ID (null if not mounted) */
  zoneId: string | null;
  
  /** Whether zone is mounted */
  mounted: boolean;
  
  /** Update zone configuration */
  updateConfig: (config: Partial<ViewZoneConfig>) => void;
  
  /** Force zone layout */
  layout: () => void;
}
```

## Context API

### MarkdownEditorContext

Global context for editor state and operations.

```typescript
interface MarkdownEditorContext {
  /** Monaco editor instance */
  editor: monaco.editor.IStandaloneCodeEditor | null;
  
  /** All WOD blocks */
  blocks: Map<string, WodBlock>;
  
  /** Currently active block ID */
  activeBlockId: string | null;
  
  /** Block operations */
  registerBlock: (block: WodBlock) => void;
  unregisterBlock: (blockId: string) => void;
  updateBlock: (blockId: string, updates: Partial<WodBlock>) => void;
  getBlock: (blockId: string) => WodBlock | undefined;
  
  /** Workout operations */
  startWorkout: (blockId: string) => void;
  stopWorkout: (blockId: string) => void;
  pauseWorkout: (blockId: string) => void;
  resumeWorkout: (blockId: string) => void;
  
  /** UI preferences */
  showOverlays: boolean;
  setShowOverlays: (show: boolean) => void;
  showInlineViews: boolean;
  setShowInlineViews: (show: boolean) => void;
}

// Provider component
function MarkdownEditorProvider(props: {
  children: React.ReactNode;
  editor?: monaco.editor.IStandaloneCodeEditor | null;
}): JSX.Element;

// Hook to access context
function useMarkdownEditor(): MarkdownEditorContext;
```

## Utility Functions

### Block Detection

```typescript
/**
 * Detect all WOD blocks in markdown content
 */
function detectWodBlocks(content: string): WodBlock[];

/**
 * Find which block contains a given line number
 */
function findBlockAtLine(
  blocks: WodBlock[],
  lineNumber: number
): WodBlock | null;

/**
 * Extract WOD block content (without backticks)
 */
function extractBlockContent(
  content: string,
  startLine: number,
  endLine: number
): string;

/**
 * Insert new WOD block at cursor position
 */
function insertWodBlock(
  editor: monaco.editor.IStandaloneCodeEditor,
  template?: string
): void;
```

### Content Synchronization

```typescript
/**
 * Update WOD block content in editor
 */
function updateBlockContent(
  editor: monaco.editor.IStandaloneCodeEditor,
  block: WodBlock,
  newContent: string
): void;

/**
 * Replace entire WOD block (including backticks)
 */
function replaceBlock(
  editor: monaco.editor.IStandaloneCodeEditor,
  block: WodBlock,
  newContent: string
): void;

/**
 * Get current editor line for block
 */
function getBlockLines(
  editor: monaco.editor.IStandaloneCodeEditor,
  block: WodBlock
): { startLine: number; endLine: number };
```

### Widget Helpers

```typescript
/**
 * Create React content widget
 */
function createReactContentWidget(
  editor: monaco.editor.IStandaloneCodeEditor,
  id: string,
  component: React.ComponentType<any>,
  props: any
): monaco.editor.IContentWidget;

/**
 * Create React overlay widget
 */
function createReactOverlayWidget(
  editor: monaco.editor.IStandaloneCodeEditor,
  id: string,
  component: React.ComponentType<any>,
  props: any
): monaco.editor.IOverlayWidget;

/**
 * Create React view zone
 */
function createReactViewZone(
  editor: monaco.editor.IStandaloneCodeEditor,
  config: ViewZoneConfig
): string;
```

## Type Exports

All interfaces should be exported from a central location:

```typescript
// src/markdown-editor/types/index.ts
export type {
  // Core types
  WodBlock,
  WodBlockState,
  WorkoutResults,
  WorkoutMetric,
  ParseError,
  
  // Component props
  MarkdownEditorProps,
  WodBlockManagerProps,
  ContextOverlayProps,
  ContextPanelProps,
  FragmentEditorProps,
  WorkoutControlsProps,
  ClockViewZoneProps,
  ResultsViewZoneProps,
  ResultsTableProps,
  MarkdownToolbarProps,
  
  // Hook types
  UseWodBlocksOptions,
  UseWodBlocksResult,
  UseBlockParserOptions,
  UseBlockParserResult,
  UseBlockRuntimeOptions,
  UseBlockRuntimeResult,
  UseMonacoWidgetResult,
  UseViewZoneResult,
  ViewZoneConfig,
  
  // Context types
  MarkdownEditorContext,
};
```

## Backward Compatibility

All new types should avoid conflicts with existing types:

```typescript
// No changes to existing types
import { ICodeStatement } from '../CodeStatement';
import { IScript } from '../WodScript';
import { ScriptRuntime } from '../runtime/ScriptRuntime';

// New types use distinct names
interface WodBlock { /* ... */ }  // Not IWodBlock to avoid confusion
interface ParseError { /* ... */ }  // Already exists in some form, ensure compatibility
```

## Testing Considerations

Types should be designed for easy testing:

```typescript
// Mock-friendly interfaces
interface MockableWodBlock extends Partial<WodBlock> {
  id: string;
  content: string;
  startLine: number;
  endLine: number;
}

// Test helpers
function createMockBlock(overrides?: Partial<WodBlock>): WodBlock;
function createMockEditor(): monaco.editor.IStandaloneCodeEditor;
```

## Documentation

All exported types should have JSDoc comments:

```typescript
/**
 * Represents a single WOD block within a markdown document.
 * 
 * @example
 * ```typescript
 * const block: WodBlock = {
 *   id: 'block-1',
 *   startLine: 5,
 *   endLine: 10,
 *   content: '(21-15-9)\n  Thrusters 95lb\n  Pullups',
 *   state: 'parsed'
 * };
 * ```
 */
interface WodBlock {
  // ...
}
```
