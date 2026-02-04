/**
 * DisplayItem.ts - Unified display model for workout visualization
 * 
 * This interface represents any workout data (parsed statements, runtime blocks,
 * execution history) in a format optimized for consistent UI rendering.
 * 
 * Key principle: All visual data is represented as ICodeFragment[] arrays,
 * ensuring consistent color-coding and styling across all views.
 * 
 * @see docs/deep-dives/unified-visualization-system.md
 * 
 * Can represent:
 * - Parsed code statements (from parser)
 * - Active runtime blocks (from stack)
 * - Execution spans (from history)
 */

import { ICodeFragment, FragmentOrigin } from './CodeFragment';

/**
 * Status of a display item in the execution lifecycle
 */
export type DisplayStatus = 'pending' | 'active' | 'completed' | 'failed' | 'skipped';

/**
 * Visual size configurations for display components
 */
export type VisualizerSize = 'compact' | 'normal' | 'focused';

/**
 * Filter configuration for fragments within display items
 */
export interface VisualizerFilter {
  /** Only show fragments with these origins. If undefined, show all. */
  allowedOrigins?: FragmentOrigin[];
  /** Hide fragments of these types (overrides allowedOrigins) */
  typeOverrides?: Record<string, boolean>;
  /** Hide specific named fragments (overrides everything) */
  nameOverrides?: Record<string, boolean>;
}

/**
 * Source type indicator for debugging and tooltips
 */
export type DisplaySourceType = 'statement' | 'block' | 'span' | 'record';

export interface IDisplayItem {
  // === Identity ===
  /** Unique identifier */
  id: string;
  /** Parent item ID for hierarchy (null for root items) */
  parentId: string | null;

  // === Visual Content ===
  /** 
   * Fragments to display - THE KEY FIELD
   * 
   * All workout data ultimately becomes fragment arrays:
  * - Statements: already have fragments[]
  * - Blocks: carry fragments directly
  * - Spans: span.fragments.flat()
   */
  fragments: ICodeFragment[];

  /** Calculated duration (ms) */
  duration?: number;

  // === Layout ===
  /** Nesting depth for indentation (0 = root level) */
  depth: number;
  /** Whether this item should render as a section header */
  isHeader: boolean;
  /** Whether this item is part of a linked group (+ statements) */
  isLinked?: boolean;

  // === State ===
  /** Current execution status */
  status: DisplayStatus;

  // === Metadata ===
  /** Original data source type */
  sourceType: DisplaySourceType;
  /** Original source ID for linking back to source data */
  sourceId: string | number;

  // === Optional Timing ===
  /** Start timestamp (ms) */
  startTime?: number;
  /** End timestamp (ms) */
  endTime?: number;

  // === Optional Label ===
  /** Display label (fallback if fragments empty) */
  label?: string;
}

/**
 * Type guard to check if an item is active
 */
export function isActiveItem(item: IDisplayItem): boolean {
  return item.status === 'active';
}

/**
 * Type guard to check if an item is completed
 */
export function isCompletedItem(item: IDisplayItem): boolean {
  return item.status === 'completed' || item.status === 'failed' || item.status === 'skipped';
}

/**
 * Type guard to check if an item is pending
 */
export function isPendingItem(item: IDisplayItem): boolean {
  return item.status === 'pending';
}

/**
 * Type guard to check if an item is a header
 */
export function isHeaderItem(item: IDisplayItem): boolean {
  return item.isHeader;
}

/**
 * Calculate duration from start and end times
 */
export function calculateDuration(item: IDisplayItem): number | undefined {
  if (item.startTime !== undefined && item.endTime !== undefined) {
    return item.endTime - item.startTime;
  }
  return item.duration;
}
