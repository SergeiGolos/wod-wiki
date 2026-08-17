/**
 * @wod-wiki/core
 * Shared data vocabulary for Whiteboard Language & WQL engine.
 */

export type MetricType = 'reps' | 'weight' | 'time' | 'distance' | 'calories' | 'custom';

export type Origin = 'parsed' | 'computed' | 'derived';

export type MetricAction = 'add' | 'set' | 'accumulate' | 'none';

export interface IMetricSource {
  readonly name: string;
  readonly type: MetricType;
  readonly value: number | string;
  readonly unit?: string;
  readonly origin?: Origin;
  readonly action?: MetricAction;
}

export class Metric implements IMetricSource {
  constructor(
    public readonly name: string,
    public readonly type: MetricType,
    public readonly value: number | string,
    public readonly unit?: string,
    public readonly origin: Origin = 'parsed',
    public readonly action: MetricAction = 'set'
  ) {}

  toNumber(): number {
    if (typeof this.value === 'number') return this.value;
    const parsed = Number(this.value);
    return isNaN(parsed) ? 0 : parsed;
  }
}

export interface MetricContainerOptions {
  ownerId?: string;
  strict?: boolean;
}

export class MetricContainer {
  private metrics = new Map<string, Metric>();

  constructor(
    public readonly ownerId?: string,
    public readonly options: MetricContainerOptions = {}
  ) {}

  add(metric: Metric): void {
    this.metrics.set(metric.name, metric);
  }

  get(name: string): Metric | undefined {
    return this.metrics.get(name);
  }

  getAll(): Metric[] {
    return Array.from(this.metrics.values());
  }

  has(name: string): boolean {
    return this.metrics.has(name);
  }

  get size(): number {
    return this.metrics.size;
  }

  clear(): void {
    this.metrics.clear();
  }
}

export class TimeSpan {
  constructor(
    public readonly totalSeconds: number
  ) {}

  static fromMinutes(minutes: number): TimeSpan {
    return new TimeSpan(minutes * 60);
  }

  static fromSeconds(seconds: number): TimeSpan {
    return new TimeSpan(seconds);
  }

  get minutes(): number {
    return Math.floor(this.totalSeconds / 60);
  }

  get seconds(): number {
    return this.totalSeconds % 60;
  }

  toString(): string {
    const mins = String(this.minutes).padStart(2, '0');
    const secs = String(this.seconds).padStart(2, '0');
    return `${mins}:${secs}`;
  }
}

export interface ICodeStatement {
  readonly line: number;
  readonly text: string;
  readonly raw: string;
  readonly dialect?: string;
}

export class CodeStatement implements ICodeStatement {
  constructor(
    public readonly line: number,
    public readonly text: string,
    public readonly raw: string,
    public readonly dialect?: string
  ) {}
}

export interface IOutputStatement {
  readonly statement: ICodeStatement;
  readonly metrics: IMetricSource[];
  readonly timestamp?: number;
}

export class OutputStatement implements IOutputStatement {
  constructor(
    public readonly statement: ICodeStatement,
    public readonly metrics: IMetricSource[] = [],
    public readonly timestamp: number = Date.now()
  ) {}
}

/**
 * Persistence shape interfaces (stored output statements, results, notes)
 */
export interface StoredOutputStatement {
  line: number;
  text: string;
  dialect?: string;
  metrics: Array<{
    name: string;
    type: string;
    value: number | string;
    unit?: string;
  }>;
  timestamp?: number;
}

export interface WorkoutResult {
  id: string;
  workoutId: string;
  date: string;
  durationSeconds?: number;
  completed: boolean;
  score?: string | number;
  notes?: string;
  outputs?: StoredOutputStatement[];
}

export interface WorkoutResults {
  results: WorkoutResult[];
  lastUpdated?: string;
}

export interface Note {
  id: string;
  title: string;
  body: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface BlockIndexRow {
  blockId: string;
  noteId: string;
  dialect: string;
  content: string;
  lineStart: number;
  lineEnd: number;
}

export interface AnalyticsDataPoint {
  key: string;
  value: number;
  unit?: string;
  timestamp: number;
  tags?: Record<string, string>;
}
