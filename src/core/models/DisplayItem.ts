/**
 * DisplayItem.ts - Display configuration types for workout visualization
 * 
 * Contains visual configuration types used across all display components.
 * The IDisplayItem interface has been eliminated in Phase 5 — all rendering
 * now goes through IFragmentSource directly.
 *
 * @see docs/FragmentOverhaul.md - Phase 5: Eliminate IDisplayItem
 */

import { FragmentOrigin } from './CodeFragment';

/**
 * Status of a display entry in the execution lifecycle
 */
export type DisplayStatus = 'pending' | 'active' | 'completed' | 'failed' | 'skipped';

/**
 * Visual size configurations for display components
 */
export type VisualizerSize = 'compact' | 'normal' | 'focused';

/**
 * Filter configuration for fragments within display entries
 */
export interface VisualizerFilter {
  /** Only show fragments with these origins. If undefined, show all. */
  allowedOrigins?: FragmentOrigin[];
  /** Hide fragments of these types (overrides allowedOrigins) */
  typeOverrides?: Record<string, boolean>;
  /** Hide specific named fragments (overrides everything) */
  nameOverrides?: Record<string, boolean>;
}
