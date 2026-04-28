// Fragment visual styling utilities for visualization
// Contains both color mapping and icon mapping for metrics types

export type MetricType = 
  | 'time' 
  | 'rep' 
  | 'effort' 
  | 'distance' 
  | 'rounds' 
  | 'action' 
  | 'increment' 
  | 'lap' 
  | 'text' 
  | 'resistance'
  | 'duration'
  | 'spans'
  | 'elapsed'
  | 'total'
  | 'system-time'
  | 'metric'
  | 'rest';

export type FragmentColorMap = {
  readonly [key in MetricType]: string;
};

/**
 * Color classes for each metrics type.
 * Uses CSS-variable-backed Tailwind `metric-*` utilities so colors
 * automatically switch between Mineral (light) and Arctic Frost (dark)
 * via the `--metric-*` CSS variables defined in index.css.
 */
export const metricColorMap: FragmentColorMap = {
  time:        'bg-metric-time/15 border-metric-time/40 text-metric-time',
  rep:         'bg-metric-rep/15 border-metric-rep/40 text-metric-rep',
  effort:      'bg-metric-effort/15 border-metric-effort/40 text-metric-effort',
  distance:    'bg-metric-distance/15 border-metric-distance/40 text-metric-distance',
  rounds:      'bg-metric-rounds/15 border-metric-rounds/40 text-metric-rounds',
  action:      'bg-metric-action/15 border-metric-action/40 text-metric-action',
  increment:   'bg-metric-rounds/10 border-metric-rounds/35 text-metric-rounds',
  lap:         'bg-metric-rep/10 border-metric-rep/35 text-metric-rep',
  text:        'bg-muted border-border text-muted-foreground',
  resistance:  'bg-metric-resistance/15 border-metric-resistance/40 text-metric-resistance',
  duration:    'bg-metric-time/10 border-metric-time/30 text-metric-time',
  spans:       'bg-metric-distance/10 border-metric-distance/30 text-metric-distance',
  elapsed:     'bg-metric-time/12 border-metric-time/28 text-metric-time',
  total:       'bg-muted border-border text-foreground',
  'system-time': 'bg-muted/60 border-border/60 text-muted-foreground',
  metric:      'bg-metric-effort/10 border-metric-effort/30 text-metric-effort',
  // Rest blocks use a muted treatment to distinguish them from active work sets (UX-04)
  rest:        'bg-muted/70 border-muted-foreground/30 text-muted-foreground',
};

/**
 * Detects whether a metric represents a rest period.
 *
 * Rest blocks (e.g. `* :90 Rest`) are parsed as `effort` metrics whose value
 * is the word "Rest". They should be rendered with the rest icon/colors so
 * they are visually distinct from work sets. See issue UX-04.
 */
function isRestMetric(type: string, value?: string): boolean {
  if (type.toLowerCase() !== 'effort' || !value) return false;
  return value.trim().toLowerCase() === 'rest';
}

/**
 * Get color classes for a metrics type
 * @param type - Fragment type string (case-insensitive)
 * @param value - Optional metric value; used to detect rest indicators on
 *   `effort` metrics so they can be styled distinctly from work sets.
 * @returns Tailwind CSS color classes for the type
 */
export function getMetricColorClasses(type: string, value?: string): string {
  if (isRestMetric(type, value)) {
    return metricColorMap.rest;
  }

  const normalizedType = type.toLowerCase() as MetricType;

  // Return mapped color or fallback for unknown types
  return metricColorMap[normalizedType] || 'bg-gray-200 border-gray-300 text-gray-800 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100';
}

/**
 * Icon/emoji map for each metrics type
 */
const metricIconMap: Record<string, string> = {
  'time': '⏱️',
  'duration': '⏱️',
  'rounds': '🔄',
  'resistance': '💪',
  'weight': '💪',
  'distance': '📏',
  'action': '▶️',
  'rest': '⏸️',
  'effort': '🏃',
  'increment': '↕️',
  'text': '📝',
  'elapsed': '⏱️',
  'spans': '📊',
  'total': '🕐',
  'system-time': '🖥️',
  'metric': '📈',
};

/**
 * Get icon/emoji for a metrics type
 * @param type - Fragment type string (case-insensitive)
 * @param value - Optional metric value; used to detect rest indicators on
 *   `effort` metrics so they can be shown with the rest icon (⏸️) instead
 *   of the running figure used for work sets (UX-04).
 * @returns Emoji icon for the type, or null if no icon is defined
 */
export function getMetricIcon(type: string, value?: string): string | null {
  if (isRestMetric(type, value)) {
    return metricIconMap.rest;
  }
  return metricIconMap[type.toLowerCase()] || null;
}
