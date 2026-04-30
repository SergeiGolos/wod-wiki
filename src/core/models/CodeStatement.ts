import { CodeMetadata } from "./CodeMetadata";
import { IMetric, MetricType } from "./Metric";
import { MetricContainer } from "./MetricContainer";
import { IMetricSource, MetricFilter } from "../contracts/IMetricSource";

export interface ICodeStatement extends IMetricSource {
  id: number;
  parent?: number;
  children: number[][];
  exerciseId?: string;
  metrics: MetricContainer;
  isLeaf?: boolean;
  meta: CodeMetadata;
  metricMeta: Map<IMetric, CodeMetadata>;

  // Semantic hints from dialect processing
  hints?: Set<string>;
}

export abstract class CodeStatement implements ICodeStatement, IMetricSource {
  abstract id: number;
  abstract parent?: number;
  abstract children: number[][];
  abstract meta: CodeMetadata;
  abstract metrics: MetricContainer;
  abstract metricMeta: Map<IMetric, CodeMetadata>;
  abstract isLeaf?: boolean;

  // ── IMetricSource ─────────────────────────────────────────────

  hasMetric(type: MetricType): boolean {
    return this.metricContainer.hasMetric(type);
  }

  getDisplayMetrics(filter?: MetricFilter): IMetric[] {
    return this.metricContainer.getDisplayMetrics(filter);
  }

  getMetric(type: MetricType): IMetric | undefined {
    return this.metricContainer.getMetric(type);
  }

  getAllMetricsByType(type: MetricType): IMetric[] {
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
  meta: CodeMetadata = { line: 0, columnStart: 0, columnEnd: 0, startOffset: 0, endOffset: 0, length: 0, raw: '' } as any;
  private _metrics: MetricContainer = MetricContainer.empty();
  metricMeta: Map<IMetric, CodeMetadata> = new Map();
  isLeaf?: boolean;
  hints?: Set<string>;

  get metrics(): MetricContainer {
    return this._metrics;
  }

  set metrics(metrics: MetricContainer | IMetric[]) {
    // Always clone on assignment so ParsedCodeStatement owns its handoff container.
    this._metrics = MetricContainer.from(metrics, this.id);
  }

  constructor(init?: Partial<ParsedCodeStatement>) {
    super();
    Object.assign(this, init);
    this.metrics = MetricContainer.from(this._metrics, this.id);
    // Ensure metricMeta is initialized if not provided in init
    if (!this.metricMeta) {
      this.metricMeta = new Map();
    }
  }
}
