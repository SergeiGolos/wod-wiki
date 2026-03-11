import { CodeMetadata } from "./CodeMetadata";
import { IMetric, MetricType } from "./Metric";
import { IMetricSource, MetricFilter } from "../contracts/IMetricSource";
import { resolveMetricPrecedence, ORIGIN_PRECEDENCE } from "../utils/metricPrecedence";

export interface ICodeStatement {
  id: number;
  parent?: number;
  children: number[][];
  metrics: IMetric[];
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
  abstract metrics: IMetric[];
  abstract metricMeta: Map<IMetric, CodeMetadata>;
  abstract isLeaf?: boolean;

  // ── IMetricSource ─────────────────────────────────────────────

  hasMetric(type: MetricType): boolean {
    return this.metrics.some(f => f.type === type);
  }

  getDisplayMetrics(filter?: MetricFilter): IMetric[] {
    return resolveMetricPrecedence([...this.metrics], filter);
  }

  getMetric(type: MetricType): IMetric | undefined {
    const all = this.getAllMetricsByType(type);
    return all.length > 0 ? all[0] : undefined;
  }

  getAllMetricsByType(type: MetricType): IMetric[] {
    const ofType = this.metrics.filter(f => f.type === type);
    if (ofType.length === 0) return [];

    // Sort by precedence (highest first = lowest rank number first)
    return [...ofType].sort((a, b) => {
      const rankA = ORIGIN_PRECEDENCE[a.origin ?? 'parser'] ?? 3;
      const rankB = ORIGIN_PRECEDENCE[b.origin ?? 'parser'] ?? 3;
      return rankA - rankB;
    });
  }

  get rawMetrics(): IMetric[] {
    return [...this.metrics];
  }
}

export class ParsedCodeStatement extends CodeStatement {
  id: number = 0;
  parent?: number;
  children: number[][] = [];
  meta: CodeMetadata = { line: 0, columnStart: 0, columnEnd: 0, startOffset: 0, endOffset: 0, length: 0, raw: '' } as any;
  metrics: IMetric[] = [];
  metricMeta: Map<IMetric, CodeMetadata> = new Map();
  isLeaf?: boolean;
  hints?: Set<string>;

  constructor(init?: Partial<ParsedCodeStatement>) {
    super();
    Object.assign(this, init);
    // Ensure metricMeta is initialized if not provided in init
    if (!this.metricMeta) {
      this.metricMeta = new Map();
    }
  }
}

