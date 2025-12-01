/**
 * Shared utility for converting RuntimeMetric arrays to ICodeFragment arrays.
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
import { SpanMetrics } from '../models/ExecutionSpan';

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
 * Convert SpanMetrics to ICodeFragment array.
 * 
 * This handles the unified SpanMetrics format from ExecutionSpan,
 * supporting both typed metric properties and legacy RuntimeMetric arrays.
 * 
 * @param metrics SpanMetrics object from ExecutionSpan
 * @param label Fallback label if no metrics
 * @param type Block type for fallback fragment
 * @returns Array of ICodeFragment for display
 */
export function spanMetricsToFragments(
  metrics: SpanMetrics,
  label: string,
  type: string
): ICodeFragment[] {
  const fragments: ICodeFragment[] = [];
  
  // Target Reps - show FIRST (before exercise name) for formats like "21x Pushup"
  // Only show if this is an effort-type entry with targetReps
  if (metrics.targetReps !== undefined && metrics.exerciseId) {
    // Show as "21x" format when there's an exercise
    fragments.push({
      type: 'repetitions',
      fragmentType: FragmentType.Rep,
      value: metrics.targetReps,
      image: `${metrics.targetReps}x`
    });
  }
  
  // Exercise name - primary identifier for effort blocks
  if (metrics.exerciseId) {
    fragments.push({
      type: 'effort',
      fragmentType: FragmentType.Effort,
      value: metrics.exerciseId,
      image: metrics.exerciseId
    });
  }
  
  // Type indicator (Timer, Rounds, etc.) - only if no exercise
  if (!metrics.exerciseId && type) {
    const typeStr = type.charAt(0).toUpperCase() + type.slice(1);
    fragments.push({
      type: type.toLowerCase(),
      fragmentType: FragmentType.Action,
      value: typeStr,
      image: typeStr
    });
    
    // Show targetReps for non-exercise types (rounds container showing rep scheme)
    if (metrics.targetReps !== undefined) {
      fragments.push({
        type: 'repetitions',
        fragmentType: FragmentType.Rep,
        value: metrics.targetReps,
        image: `${metrics.targetReps} reps`
      });
    }
  }
  
  // Current Reps - show current/target format if tracking progress
  if (metrics.reps && metrics.reps.value !== undefined) {
    let repsImage = `${metrics.reps.value}${metrics.reps.unit || ' reps'}`;
    if (metrics.targetReps !== undefined && metrics.reps.value !== metrics.targetReps) {
      repsImage = `${metrics.reps.value}/${metrics.targetReps}`;
    }
    fragments.push({
      type: 'repetitions',
      fragmentType: FragmentType.Rep,
      value: metrics.reps.value,
      image: repsImage
    });
  }
  
  // Weight
  if (metrics.weight && metrics.weight.value !== undefined) {
    fragments.push({
      type: 'resistance',
      fragmentType: FragmentType.Resistance,
      value: metrics.weight.value,
      image: `${metrics.weight.value} ${metrics.weight.unit || 'lb'}`
    });
  }
  
  // Distance
  if (metrics.distance && metrics.distance.value !== undefined) {
    fragments.push({
      type: 'distance',
      fragmentType: FragmentType.Distance,
      value: metrics.distance.value,
      image: `${metrics.distance.value} ${metrics.distance.unit || 'm'}`
    });
  }
  
  // Duration (for completed spans)
  if (metrics.duration && metrics.duration.value !== undefined) {
    const seconds = Math.floor(metrics.duration.value / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    const timeStr = minutes > 0 
      ? `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
      : `${seconds}s`;
    fragments.push({
      type: 'time',
      fragmentType: FragmentType.Timer,
      value: metrics.duration.value,
      image: timeStr
    });
  }
  
  // Rounds info
  if (metrics.currentRound !== undefined) {
    const roundText = metrics.totalRounds 
      ? `${metrics.currentRound}/${metrics.totalRounds}`
      : `Round ${metrics.currentRound}`;
    fragments.push({
      type: 'rounds',
      fragmentType: FragmentType.Rounds,
      value: metrics.currentRound,
      image: roundText
    });
  }
  
  // Rep scheme
  if (metrics.repScheme && metrics.repScheme.length > 0) {
    fragments.push({
      type: 'repScheme',
      fragmentType: FragmentType.Rounds,
      value: metrics.repScheme.join('-'),
      image: metrics.repScheme.join('-')
    });
  }
  
  // Calories
  if (metrics.calories && metrics.calories.value !== undefined) {
    fragments.push({
      type: 'calories',
      fragmentType: FragmentType.Distance,
      value: metrics.calories.value,
      image: `${metrics.calories.value} cal`
    });
  }
  
  // Fall back to legacy metrics if present
  if (fragments.length === 0 && metrics.legacyMetrics && metrics.legacyMetrics.length > 0) {
    return metricsToFragments(metrics.legacyMetrics);
  }
  
  // Fall back to label if no fragments
  if (fragments.length === 0) {
    return [createLabelFragment(label, type)];
  }
  
  return fragments;
}
