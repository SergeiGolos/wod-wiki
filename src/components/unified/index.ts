/**
 * Unified Visualization Components
 * 
 * Provides consistent display for workout data regardless of source:
 * - Parsed statements (ICodeStatement implements IFragmentSource)
 * - Runtime blocks (DisplayFragmentMemory implements IFragmentSource)
 * - Execution history (IOutputStatement implements IFragmentSource)
 * - Synthetic data (SimpleFragmentSource wraps ICodeFragment[])
 * 
 * All rendering goes through IFragmentSource — no IDisplayItem adapter layer.
 *
 * @see docs/FragmentOverhaul.md - Phase 5: Eliminate IDisplayItem
 */

// Components
export { FragmentSourceRow, type FragmentSourceRowProps, type FragmentSourceStatus, type FragmentSourceEntry } from './FragmentSourceRow';
export { FragmentSourceList, type FragmentSourceListProps } from './FragmentSourceList';

// Re-export display configuration types
export {
  type DisplayStatus,
  type VisualizerSize,
  type VisualizerFilter,
} from '@/core/models/DisplayItem';
