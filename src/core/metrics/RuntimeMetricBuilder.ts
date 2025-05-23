import { BlockKey } from "../BlockKey";
import { JitStatement } from "../JitStatement";
import { MetricValue } from "../MetricValue";
import { RuntimeMetric } from "../RuntimeMetric";

/**
 * A builder class for constructing RuntimeMetric objects.
 * Simplifies the process of collecting and organizing fragments from statements.
 */
export class RuntimeMetricBuilder {
  private statements: JitStatement[] = [];

  /**
   * Adds a statement to the builder for metric extraction.
   * 
   * @param statement The JitStatement to add
   * @returns The builder instance for chaining
   */
  public addStatement(statement: JitStatement): RuntimeMetricBuilder {
    this.statements.push(statement);
    return this;
  }

  /**
   * Adds multiple statements to the builder.
   * 
   * @param statements An array of JitStatements to add
   * @returns The builder instance for chaining
   */
  public addStatements(statements: JitStatement[]): RuntimeMetricBuilder {
    this.statements.push(...statements);
    return this;
  }

  /**
   * Builds metrics from the collected statements.
   * Extracts effort, repetitions, distance, and resistance information.
   * 
   * @param blockKey The BlockKey to use for accessing indexed fragments
   * @returns An array of RuntimeMetric objects
   */
  public build(blockKey: BlockKey): RuntimeMetric[] {
    const metrics: RuntimeMetric[] = [];

    for (const statement of this.statements) {
      const metric: RuntimeMetric = {
        sourceId: statement.id?.toString() ?? "unknown",
        effort: this.getEffortName(statement, blockKey),
        values: this.extractMetricValues(statement, blockKey)
      };

      metrics.push(metric);
    }

    return metrics;
  }

  /**
   * Extracts metric values from a statement for the given blockKey.
   * 
   * @param statement The statement to extract values from
   * @param blockKey The block key to use for indexing
   * @returns An array of MetricValue objects
   */
  private extractMetricValues(statement: JitStatement, blockKey: BlockKey): MetricValue[] {
    const values: MetricValue[] = [];

    // Extract repetitions
    const repFragment = statement.repetition(blockKey);
    if (repFragment && repFragment.reps !== undefined) {
      values.push({
        type: "repetitions",
        value: repFragment.reps,
        unit: "reps"
      });
    }

    // Extract resistance
    const resistanceFragment = statement.resistance(blockKey);
    if (resistanceFragment && resistanceFragment.value !== undefined) {
      values.push({
        type: "resistance",
        value: Number(resistanceFragment.value),
        unit: resistanceFragment.units || "kg"
      });
    }

    // Extract distance
    const distanceFragment = statement.distance(blockKey);
    if (distanceFragment && distanceFragment.value !== undefined) {
      values.push({
        type: "distance",
        value: Number(distanceFragment.value),
        unit: distanceFragment.units || "m"
      });
    }

    return values;
  }

  /**
   * Gets a meaningful effort name from a statement.
   * 
   * @param statement The statement to extract the effort name from
   * @param blockKey The block key to use for indexing
   * @returns A string representing the effort name
   */
  private getEffortName(statement: JitStatement, blockKey: BlockKey): string {
    // Try to get the effort name from an effort fragment
    const effortFragment = statement.effort(blockKey);
    if (effortFragment && effortFragment.effort) {
      return effortFragment.effort;
    }

    // Fall back to using the statement's string representation
    const sourceText = statement.toString();
    if (sourceText && sourceText !== "[object Object]") {
      return sourceText.slice(0, 20);
    }

    // Last resort: generic name with ID
    return `Exercise ${statement.id}`;
  }
}