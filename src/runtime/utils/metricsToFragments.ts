/**
 * Shared utility for managing ICodeFragment arrays and labels.
 * 
 * This utility is used by multiple UI components:
 * - RuntimeEventLog (sectioned log view)
 * - RuntimeHistoryPanel (tree view)
 * - AnalyticsLayout (timeline/graphs)
 */

import { ICodeFragment, FragmentType } from '../../core/models/CodeFragment';
import { MetricValue } from '../models/RuntimeMetric';

/**
 * Mapping from internal metric types to FragmentType for display.
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
 */
export function metricToFragment(metric: MetricValue): ICodeFragment {
  const fragmentType = METRIC_TO_FRAGMENT_TYPE[metric.type] || FragmentType.Text;

  // Strip 'effort:' or 'action:' prefix from unit if present
  let unit = metric.unit || '';
  if (unit.startsWith('effort:')) {
    unit = unit.substring(7);
  } else if (unit.startsWith('action:')) {
    unit = unit.substring(7);
  }

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
