import { ITimerRuntime } from "../ITimerRuntime";
import { RuntimeMetric } from "../RuntimeMetric";
import { JitStatement } from "../JitStatement";
import { BlockKey } from "../BlockKey";
import { MetricValue } from "../MetricValue";

/**
 * Unified class for building metrics for runtime blocks.
 * Uses the latest fragment applyToMetric logic for extensibility and round-awareness.
 */
export class RuntimeBlockMetrics {
  private statements: JitStatement[] = [];

  constructor(statements?: JitStatement[]) {
    if (statements) this.statements = statements;
  }

  /**
   * Adds one or more statements to the builder.
   */
  public addStatements(statements: JitStatement[]): this {
    this.statements.push(...statements);
    return this;
  }

  /**
   * Builds metrics from the collected statements.
   * Extracts all metric values using applyToMetric on each fragment.
   * @param blockKey The BlockKey to use for fragment indexing
   */
  public build(blockKey: BlockKey): RuntimeMetric[] {
    const metrics: RuntimeMetric[] = [];
    for (const statement of this.statements) {
      const metric: RuntimeMetric = {
        sourceId: statement.id?.toString() ?? "unknown",
        effort: this.getEffortName(statement, blockKey),
        values: RuntimeBlockMetrics.extractMetricValues(statement, blockKey)
      };
      metrics.push(metric);
    }
    return metrics;
  }

  /**
   * Static utility for building metrics from a runtime and statements array.
   * @param runtime The timer runtime
   * @param sources Array of JitStatements
   */
  public static buildMetrics(runtime: ITimerRuntime, sources: JitStatement[]): RuntimeMetric[] {
    const blockKey: BlockKey = runtime.blockKey;
    return new RuntimeBlockMetrics(sources).build(blockKey);
  }

  /**
   * Extracts all metric values from a statement using applyToMetric on each fragment.
   * Passes round context to each fragment.
   */
  public static extractMetricValues(statement: JitStatement, blockKey: BlockKey): MetricValue[] {
    const values: MetricValue[] = [];
    // Determine round context
    const roundFragment = statement.round(blockKey);
    const currentRound = roundFragment?.count;
    // Iterate all fragments and apply
    for (const fragment of statement.fragments) {
      if (typeof fragment.applyToMetric === "function") {
        const metric: { values: MetricValue[] } = { values: [] };
        fragment.applyToMetric(metric, currentRound);
        if (metric.values.length > 0) values.push(...metric.values);
      }
    }
    return values;
  }

  /**
   * Gets a meaningful effort name from a statement.
   */
  private getEffortName(statement: JitStatement, blockKey: BlockKey): string {
    const effortFragment = statement.effort(blockKey);
    if (effortFragment && effortFragment.effort) return effortFragment.effort;
    const sourceText = statement.toString();
    if (sourceText && sourceText !== "[object Object]") return sourceText.slice(0, 20);
    return `Exercise ${statement.id}`;
  }
}