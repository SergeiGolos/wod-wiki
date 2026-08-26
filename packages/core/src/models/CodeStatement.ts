import { CodeMetadata } from './CodeMetadata';
import { IMetric, MetricType } from './Metric';
import { MetricContainer } from './MetricContainer';
import type { IMetricSource, MetricFilter } from '../contracts/IMetricSource';

export interface ICodeStatement extends IMetricSource {
  id: number;
  parent?: number;
  children: number[][];
  exerciseId?: string;
  metrics: MetricContainer;
  isLeaf?: boolean;
  meta: CodeMetadata;
  metricMeta: Map<IMetric, CodeMetadata>;
  line?: number;
  text?: string;
  raw?: string;
  dialect?: string;
}

export abstract class CodeStatement implements ICodeStatement, IMetricSource {
  abstract id: number;
  abstract parent?: number;
  abstract children: number[][];
  abstract meta: CodeMetadata;
  abstract metrics: MetricContainer;
  abstract metricMeta: Map<IMetric, CodeMetadata>;
  abstract isLeaf?: boolean;
  exerciseId?: string;
  line?: number;
  text?: string;
  raw?: string;
  dialect?: string;

  // ── IMetricSource ─────────────────────────────────────────────

  hasMetric(type: MetricType | string): boolean {
    return this.metricContainer.hasMetric(type);
  }

  getDisplayMetrics(filter?: MetricFilter): IMetric[] {
    return this.metricContainer.getDisplayMetrics(filter);
  }

  getMetric(type: MetricType | string): IMetric | undefined {
    return this.metricContainer.getMetric(type);
  }

  getAllMetricsByType(type: MetricType | string): IMetric[] {
    return this.metricContainer.getAllMetricsByType(type);
  }

  get rawMetrics(): IMetric[] {
    return this.metricContainer.rawMetrics;
  }

  private get metricContainer(): MetricContainer {
    return this.metrics instanceof MetricContainer
      ? this.metrics
      : MetricContainer.from(this.metrics as unknown as IMetric[], this.id);
  }
}

export class ParsedCodeStatement extends CodeStatement {
  id: number = 0;
  parent?: number;
  children: number[][] = [];
  meta: CodeMetadata = new CodeMetadata(0, 0, 0, 0);
  private _metrics: MetricContainer = MetricContainer.empty();
  metricMeta: Map<IMetric, CodeMetadata> = new Map();
  isLeaf?: boolean;

  get metrics(): MetricContainer {
    return this._metrics;
  }

  set metrics(metrics: MetricContainer | IMetric[]) {
    this._metrics = MetricContainer.from(metrics, this.id);
  }

  constructor(init?: Partial<ParsedCodeStatement>) {
    super();
    if (init) {
      Object.assign(this, init);
      if (init.metrics) {
        this.metrics = MetricContainer.from(init.metrics, this.id);
      }
      if (!this.metricMeta) {
        this.metricMeta = new Map();
      }
    }
  }
}
