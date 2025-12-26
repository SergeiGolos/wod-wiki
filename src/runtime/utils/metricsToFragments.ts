/**
 * Shared utility for converting RuntimeMetric arrays to ICodeFragment arrays.
 * Legacy bridge — prefer emitting fragments directly instead of metrics.
 * 
 * This utility is used by multiple UI components:
 * - RuntimeEventLog (sectioned log view)
 * - RuntimeHistoryPanel (tree view)
 * - AnalyticsLayout (timeline/graphs)
 * 
 * By centralizing this logic, we ensure consistent fragment display across all views.
 * 
 * Supports both:
 * - Legacy RuntimeMetric[] arrays
 * - New unified SpanMetrics objects
 */

import { ICodeFragment, FragmentType } from '../../core/models/CodeFragment';
import { MetricValue, RuntimeMetric } from '../RuntimeMetric';

/**
 * Mapping from MetricValue type to FragmentType for display
 */
const METRIC_TO_FRAGMENT_TYPE: Record<string, FragmentType> = {
  'repetitions': FragmentType.Rep,
  'resistance': FragmentType.Resistance,
  'distance': FragmentType.Distance,
  'timestamp': FragmentType.Timer,
  'rounds': FragmentType.Rounds,
  'time': FragmentType.Timer,
  'calories': FragmentType.Distance,
  'action': FragmentType.Action,
  'effort': FragmentType.Effort,
  'heart_rate': FragmentType.Text,
  'cadence': FragmentType.Text,
  'power': FragmentType.Text,
};

/**
 * Convert a single MetricValue to an ICodeFragment for display.
 * 
 * @param metric The metric value to convert
 * @returns ICodeFragment for visualization
 */
export function metricToFragment(metric: MetricValue): ICodeFragment {
  const fragmentType = METRIC_TO_FRAGMENT_TYPE[metric.type] || FragmentType.Text;

  // Strip 'effort:' or 'action:' prefix from unit if present
  let unit = metric.unit || '';
  if (unit.startsWith('effort:')) {
    unit = unit.substring(7); // Remove 'effort:' prefix
  } else if (unit.startsWith('action:')) {
    unit = unit.substring(7); // Remove 'action:' prefix
  }

  // For repetitions, if value is 0, just show the unit (e.g. "Pushups" instead of "0 Pushups")
  // This is cleaner for initial states where the count starts at 0.
  const shouldHideValue = metric.value === 0 && metric.type === 'repetitions';

  const displayValue = (metric.value !== undefined && !shouldHideValue)
    ? `${metric.value}${unit ? ' ' + unit : ''}`
    : unit;

  return {
    type: metric.type,
    fragmentType,
    value: metric.value,
    image: displayValue,
  };
}



/**
 * Convert RuntimeMetric array to ICodeFragment array for FragmentVisualizer.
 * 
 * This handles:
 * - Exercise name as effort fragment
 * - Each metric value as its corresponding fragment type
 * 
 * @param metrics Array of RuntimeMetric from ExecutionRecord
 * @returns Array of ICodeFragment for display
 */
export function metricsToFragments(metrics: RuntimeMetric[]): ICodeFragment[] {
  const fragments: ICodeFragment[] = [];

  for (const metric of metrics) {
    // Add exercise name as effort fragment
    if (metric.exerciseId) {
      fragments.push({
        type: 'effort',
        fragmentType: FragmentType.Effort,
        value: metric.exerciseId,
        image: metric.exerciseId,
      });
    }

    // Add each metric value as a fragment
    for (const value of metric.values) {
      fragments.push(metricToFragment(value));
    }
  }

  return fragments;
}

/**
 * Create a label fragment when no metrics are available.
 * Used as fallback when ExecutionRecord has no compiled metrics.
 * 
 * @param label The display label text
 * @param type The block type (timer, rounds, effort, etc.)
 * @returns ICodeFragment for visualization
 */
export function createLabelFragment(label: string, type: string): ICodeFragment {
  const typeMapping: Record<string, FragmentType> = {
    'timer': FragmentType.Timer,
    'rounds': FragmentType.Rounds,
    'effort': FragmentType.Effort,
    'group': FragmentType.Action,
    'interval': FragmentType.Timer,
    'amrap': FragmentType.Timer,
    'emom': FragmentType.Timer,
  };

  return {
    type: type.toLowerCase(),
    fragmentType: typeMapping[type.toLowerCase()] || FragmentType.Text,
    value: label,
    image: label,
  };
}

/**
 * Get fragments from ExecutionRecord, with fallback to label fragment.
 * 
 * @param metrics The metrics array from ExecutionRecord
 * @param label Fallback label if no metrics
 * @param type Block type for fallback fragment
 * @returns Array of ICodeFragment for display
 */
export function getFragmentsFromRecord(
  metrics: RuntimeMetric[] | undefined,
  label: string,
  type: string
): ICodeFragment[] {
  if (metrics && metrics.length > 0) {
    return metricsToFragments(metrics);
  }
  return [createLabelFragment(label, type)];
}



/**
 * Extract a human-readable label from an array of fragments.
 */
export function fragmentsToLabel(fragments: ICodeFragment[] | ICodeFragment[][]): string {
  const first = fragments[0];
  const flat = Array.isArray(first) ? (fragments as ICodeFragment[][]).flat() : (fragments as ICodeFragment[]);

  // Try to find an Effort or Action fragment first
  const primary = flat.find(f => f.fragmentType === FragmentType.Effort || f.fragmentType === FragmentType.Action);
  if (primary) return primary.image || primary.value?.toString() || 'Block';

  // Fallback to first fragment with an image
  const firstWithImage = flat.find(f => f.image);
  if (firstWithImage) return firstWithImage.image || 'Block';

  return 'Block';
}
