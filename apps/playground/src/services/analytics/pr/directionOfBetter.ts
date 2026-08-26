export type MetricDirection = 'higher' | 'lower';

const LOWER_IS_BETTER_METRICS = new Set<string>([
  'elapsed',
  'pace',
  'duration',
]);

const HIGHER_IS_BETTER_METRICS = new Set<string>([
  'tis',
  'totalVolume',
  'totalReps',
  'totalDistance',
  'metMinutes',
  'power',
  'sessionLoad',
  'resistance',
]);

const customRegistry = new Map<string, MetricDirection>();

export function registerMetricDirection(metricKey: string, direction: MetricDirection): void {
  customRegistry.set(metricKey, direction);
}

export function getMetricDirection(metricKey: string): MetricDirection {
  if (customRegistry.has(metricKey)) {
    return customRegistry.get(metricKey)!;
  }
  if (LOWER_IS_BETTER_METRICS.has(metricKey)) {
    return 'lower';
  }
  if (HIGHER_IS_BETTER_METRICS.has(metricKey)) {
    return 'higher';
  }
  return 'higher';
}

export function isBetterValue(metricKey: string, newValue: number, previousBest: number): boolean {
  const direction = getMetricDirection(metricKey);
  if (direction === 'lower') {
    return newValue < previousBest;
  }
  return newValue > previousBest;
}
