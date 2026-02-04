/**
 * Fragment to Display Metric Converter
 * 
 * Transforms ICodeFragment arrays into IDisplayMetric format for the Clock UI.
 * This decouples the display layer from the RuntimeMetric type, allowing
 * the UI to work directly with fragments.
 * 
 * Part of Phase 1 metrics consolidation: Fragment-based architecture.
 */

import { ICodeFragment, FragmentType } from '../../core/models/CodeFragment';
import { IDisplayMetric } from '../types/DisplayTypes';
import { MetricBehavior } from '../../types/MetricBehavior';

/**
 * Convert a single ICodeFragment to IDisplayMetric for display rendering.
 * 
 * @param fragment The code fragment to convert
 * @returns IDisplayMetric for UI rendering
 */
export function fragmentToDisplayMetric(fragment: ICodeFragment): IDisplayMetric {
  // Use the fragment's image if available, otherwise construct from value and type
  const displayImage = fragment.image || formatFragmentValue(fragment);
  
  return {
    type: fragment.fragmentType,
    value: fragment.value as string | number,
    image: displayImage,
    unit: getFragmentUnit(fragment),
    isActive: fragment.origin === 'tracked',
  };
}

/**
 * Convert an array of ICodeFragment to IDisplayMetric[] for display rendering.
 * Optionally filter by behavior (e.g., only show Collected or Recorded metrics).
 * 
 * @param fragments Array of code fragments (can be flat or nested)
 * @param behaviorFilter Optional filter to include only specific behaviors
 * @returns Array of display metrics
 * 
 * @example
 * ```typescript
 * // Get all collected and recorded metrics for display
 * const displayMetrics = fragmentsToDisplayMetrics(
 *   block.fragments,
 *   [MetricBehavior.Collected, MetricBehavior.Recorded]
 * );
 * ```
 */
export function fragmentsToDisplayMetrics(
  fragments: ICodeFragment[] | ICodeFragment[][],
  behaviorFilter?: MetricBehavior[]
): IDisplayMetric[] {
  // Flatten if nested
  const flat = Array.isArray(fragments[0]) 
    ? (fragments as ICodeFragment[][]).flat()
    : (fragments as ICodeFragment[]);
  
  // Filter by behavior if specified
  let filtered = flat;
  if (behaviorFilter && behaviorFilter.length > 0) {
    filtered = flat.filter(f => 
      f.behavior && behaviorFilter.includes(f.behavior)
    );
  }
  
  // Convert to display metrics
  return filtered.map(fragmentToDisplayMetric);
}

/**
 * Get displayable metrics from fragments, excluding script-defined values.
 * This is useful for showing only user-collected or runtime-recorded metrics.
 * 
 * @param fragments Array of code fragments
 * @returns Display metrics for collected/recorded values only
 */
export function getCollectedDisplayMetrics(
  fragments: ICodeFragment[] | ICodeFragment[][]
): IDisplayMetric[] {
  return fragmentsToDisplayMetrics(fragments, [
    MetricBehavior.Collected,
    MetricBehavior.Recorded,
  ]);
}

/**
 * Format a fragment's value for display.
 * Handles different fragment types appropriately.
 * 
 * @param fragment The fragment to format
 * @returns Formatted string value
 */
function formatFragmentValue(fragment: ICodeFragment): string {
  if (fragment.value === undefined || fragment.value === null) {
    return '';
  }
  
  const value = fragment.value;
  
  // Handle different fragment types
  switch (fragment.fragmentType) {
    case FragmentType.Timer:
      // Format time values (assume milliseconds)
      if (typeof value === 'number') {
        return formatDuration(value);
      }
      return String(value);
      
    case FragmentType.Rep:
      return `${value} reps`;
      
    case FragmentType.Resistance:
      return `${value}`;
      
    case FragmentType.Distance:
      return `${value}`;
      
    case FragmentType.Rounds:
      return `Round ${value}`;
      
    case FragmentType.Effort:
    case FragmentType.Action:
      return String(value);
      
    default:
      return String(value);
  }
}

/**
 * Get the unit string for a fragment based on its type.
 * 
 * @param fragment The fragment
 * @returns Unit string or empty string
 */
function getFragmentUnit(fragment: ICodeFragment): string | undefined {
  switch (fragment.fragmentType) {
    case FragmentType.Rep:
      return 'reps';
    case FragmentType.Resistance:
      return 'lbs'; // Default, should ideally come from fragment metadata
    case FragmentType.Distance:
      return 'm';
    case FragmentType.Rounds:
      return 'rounds';
    default:
      return undefined;
  }
}

/**
 * Format a duration in milliseconds to MM:SS or HH:MM:SS format.
 * 
 * @param ms Duration in milliseconds
 * @returns Formatted time string
 */
function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}
