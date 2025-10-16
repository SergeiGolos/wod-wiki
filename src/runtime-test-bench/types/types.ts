// Runtime Test Bench UI - TypeScript Utility Types
// Generated from data-model.md
// Contains type aliases, enums, and utility types

import { ExecutionStatus, BlockType, BlockStatus, MemoryType, MemoryGrouping, Theme } from './interfaces';

// ============================================================================
// TYPE ALIASES (re-exported for convenience)
// ============================================================================

export type { ExecutionStatus, BlockType, BlockStatus, MemoryType, MemoryGrouping, Theme };

// ============================================================================
// ADDITIONAL UTILITY TYPES
// ============================================================================

/**
 * Highlight source for cross-panel highlighting system
 */
export type HighlightSource =
  | 'editor'
  | 'stack'
  | 'memory'
  | 'compilation';

/**
 * Compilation panel tab types
 */
export type CompilationTab = 'output' | 'errors';

/**
 * Theme color palette interface
 */
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

/**
 * Performance metrics for runtime operations
 */
export interface PerformanceMetrics {
  snapshotCreationTime: number;    // ms
  renderTime: number;               // ms
  memoryUsage?: number;             // MB
  frameRate?: number;               // fps
}

/**
 * Cursor position in editor
 */
export interface CursorPosition {
  line: number;
  column: number;
  offset?: number;
}

/**
 * Log entry levels for compilation panel
 */
export type LogLevel = 'info' | 'success' | 'warning' | 'error';

/**
 * Memory entry value types (for type guards)
 */
export type MemoryValue = string | number | boolean | object | null | undefined;

/**
 * Block hierarchy depth levels
 */
export type BlockDepth = number; // 0 = root, 1+ = nested

/**
 * Execution event types for event queue
 */
export type ExecutionEventType =
  | 'step'
  | 'run'
  | 'pause'
  | 'reset'
  | 'error'
  | 'complete';

/**
 * Component status types
 */
export type ComponentStatus =
  | 'idle'
  | 'loading'
  | 'success'
  | 'error'
  | 'disabled';

/**
 * Panel layout modes for responsive design
 */
export type LayoutMode =
  | 'desktop'    // 1920px+ - full grid layout
  | 'tablet'     // 768px-1919px - stacked layout
  | 'mobile';    // <768px - tabbed layout

/**
 * Keyboard shortcut definitions
 */
export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
  action: string;
  description: string;
}

/**
 * Search filter options for memory panel
 */
export interface MemoryFilter {
  text?: string;
  types?: MemoryType[];
  owners?: string[];
  caseSensitive?: boolean;
}

/**
 * Sort options for memory and stack panels
 */
export type SortDirection = 'asc' | 'desc';

export interface SortOption {
  field: string;
  direction: SortDirection;
}

/**
 * Export format options
 */
export type ExportFormat = 'json' | 'csv' | 'txt';

/**
 * Validation result types
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * API response wrapper
 */
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  status: 'success' | 'error' | 'loading';
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Default theme colors matching prototype design
 */
export const DEFAULT_THEME_COLORS: ThemeColors = {
  primary: '#FFA500',
  backgroundDark: '#282c34',
  panelBackground: '#3c4049',
  textColor: '#abb2bf',
  success: '#98c379',
  error: '#e06c75',
  info: '#61afef',
  backgroundLight: '#ffffff',
  warning: '#d19a66',
};

/**
 * Maximum event queue size to prevent memory leaks
 */
export const MAX_EVENT_QUEUE_SIZE = 100;

/**
 * Font size constraints
 */
export const FONT_SIZE_MIN = 8;
export const FONT_SIZE_MAX = 24;
export const FONT_SIZE_DEFAULT = 14;

/**
 * Performance targets (milliseconds)
 */
export const PERFORMANCE_TARGETS = {
  UI_UPDATE: 50,      // Max UI update time
  ADAPTER_OPERATION: 10, // Max adapter operation time
  SCRIPT_PARSING: 2000,  // Max script parsing time
} as const;

/**
 * Breakpoint definitions for responsive design
 */
export const BREAKPOINTS = {
  mobile: 768,
  tablet: 1024,
  desktop: 1920,
} as const;

/**
 * Default keyboard shortcuts
 */
export const DEFAULT_KEYBOARD_SHORTCUTS: KeyboardShortcut[] = [
  { key: 'Space', action: 'step', description: 'Step execution' },
  { key: 'Enter', ctrl: true, action: 'run', description: 'Run execution' },
  { key: 'r', ctrl: true, action: 'reset', description: 'Reset execution' },
  { key: 'F5', action: 'run', description: 'Run execution' },
  { key: 'F10', action: 'step-over', description: 'Step over' },
  { key: 'F11', action: 'step-into', description: 'Step into' },
  { key: 'F5', shift: true, action: 'restart', description: 'Restart execution' },
  { key: 'f', ctrl: true, action: 'find', description: 'Find in memory' },
  { key: '/', ctrl: true, action: 'command', description: 'Command palette' },
];

// ============================================================================
// TYPE GUARDS
// ============================================================================

/**
 * Type guard for ExecutionStatus
 */
export function isExecutionStatus(value: string): value is ExecutionStatus {
  return ['idle', 'executing', 'paused', 'completed', 'error'].includes(value);
}

/**
 * Type guard for BlockType
 */
export function isBlockType(value: string): value is BlockType {
  return ['workout', 'group', 'timer', 'rounds', 'effort', 'exercise', 'custom'].includes(value);
}

/**
 * Type guard for BlockStatus
 */
export function isBlockStatus(value: string): value is BlockStatus {
  return ['pending', 'active', 'running', 'complete', 'error'].includes(value);
}

/**
 * Type guard for MemoryType
 */
export function isMemoryType(value: string): value is MemoryType {
  return ['metric', 'timer-state', 'loop-state', 'group-state', 'handler', 'span', 'unknown'].includes(value);
}

/**
 * Type guard for MemoryGrouping
 */
export function isMemoryGrouping(value: string): value is MemoryGrouping {
  return ['owner', 'type', 'none'].includes(value);
}

/**
 * Type guard for Theme
 */
export function isTheme(value: string): value is Theme {
  return ['light', 'dark', 'system'].includes(value);
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Validates font size is within acceptable range
 */
export function validateFontSize(size: number): boolean {
  return size >= FONT_SIZE_MIN && size <= FONT_SIZE_MAX;
}

/**
 * Clamps font size to valid range
 */
export function clampFontSize(size: number): number {
  return Math.max(FONT_SIZE_MIN, Math.min(FONT_SIZE_MAX, size));
}

/**
 * Gets layout mode based on screen width
 */
export function getLayoutMode(width: number): LayoutMode {
  if (width < BREAKPOINTS.mobile) return 'mobile';
  if (width < BREAKPOINTS.tablet) return 'tablet';
  return 'desktop';
}

/**
 * Formats performance metrics for display
 */
export function formatPerformanceMetrics(metrics: PerformanceMetrics): string {
  const parts = [];
  if (metrics.snapshotCreationTime) {
    parts.push(`Snapshot: ${metrics.snapshotCreationTime}ms`);
  }
  if (metrics.renderTime) {
    parts.push(`Render: ${metrics.renderTime}ms`);
  }
  if (metrics.memoryUsage) {
    parts.push(`Memory: ${metrics.memoryUsage}MB`);
  }
  return parts.join(', ');
}