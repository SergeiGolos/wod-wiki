export interface IRuntimeStackTracker {
  recordMetric(category: string, name: string, value: number, unit: string): void;
}

