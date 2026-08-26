import {
  OutputStatement,
  MetricContainer,
  type IOutputStatement,
  type StoredOutputStatement,
  type IMetric,
} from '@bitcobblers/wod-wiki-core';
import { getHints } from '../metrics/hints';

/**
 * Convert a live IOutputStatement into a StoredOutputStatement.
 *
 * Normalises non-serialisable types (`Set` → `string[]`, `MetricContainer` → `IMetric[]`)
 * so the result survives a JSON / IndexedDB round-trip without data loss.
 */
export function toStoredOutputStatement(output: IOutputStatement | OutputStatement): StoredOutputStatement {
  const metrics: IMetric[] = output.metrics instanceof MetricContainer
    ? output.metrics.toArray()
    : Array.isArray(output.metrics)
      ? (output.metrics as IMetric[])
      : (output.metrics as any)?.toArray
        ? (output.metrics as any).toArray()
        : [];

  const hints = getHints(output);

  return {
    id: output.id,
    line: (output as any).line ?? (output as any).statement?.line,
    text: (output as any).text ?? (output as any).statement?.text,
    dialect: (output as any).dialect ?? (output as any).statement?.dialect,
    outputType: output.outputType,
    timeSpan: output.timeSpan ? { started: output.timeSpan.started, ended: output.timeSpan.ended } : undefined,
    metrics,
    hints: hints.length > 0 ? hints : undefined,
    sourceBlockKey: output.sourceBlockKey,
    stackLevel: output.stackLevel,
    parent: output.parent,
    sourceStatementId: output.sourceStatementId,
    completionReason: output.completionReason,
  };
}
