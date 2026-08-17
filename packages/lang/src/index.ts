/**
 * @wod-wiki/lang
 * Whiteboard Language parser, JIT compiler, runtime, and dialect execution.
 */

import { Metric, MetricContainer, CodeStatement, OutputStatement, type StoredOutputStatement } from '@wod-wiki/core';

export interface ParseOptions {
  dialect?: string;
  strict?: boolean;
}

export interface ParsedScript {
  statements: CodeStatement[];
  raw: string;
}

/**
 * Headless parse seam over raw script input.
 */
export function parseScript(text: string, options: ParseOptions = {}): ParsedScript {
  const lines = text.split('\n');
  const statements = lines
    .map((line, idx) => ({ line: idx + 1, text: line.trim(), raw: line, dialect: options.dialect }))
    .filter((stmt) => stmt.text.length > 0)
    .map((stmt) => new CodeStatement(stmt.line, stmt.text, stmt.raw, stmt.dialect));

  return {
    statements,
    raw: text,
  };
}

export interface ExecutionResult {
  outputs: OutputStatement[];
  metrics: MetricContainer;
}

export class ScriptRuntime {
  constructor(private readonly script: ParsedScript) {}

  execute(): ExecutionResult {
    const metrics = new MetricContainer();
    const outputs = this.script.statements.map((stmt) => {
      // Basic number extraction for demonstration/scaffolding
      const match = stmt.text.match(/^(\d+)\s*(.*)$/);
      const outputMetrics: Metric[] = [];
      if (match) {
        const val = Number(match[1]);
        const name = match[2].trim() || 'count';
        const metric = new Metric(name, 'reps', val, 'reps', 'parsed', 'set');
        outputMetrics.push(metric);
        metrics.add(metric);
      }
      return new OutputStatement(stmt, outputMetrics);
    });

    return { outputs, metrics };
  }
}

/**
 * Converts a live output statement to a persistence-friendly stored output statement.
 */
export function toStoredOutputStatement(output: OutputStatement): StoredOutputStatement {
  return {
    line: output.statement.line,
    text: output.statement.text,
    dialect: output.statement.dialect,
    metrics: output.metrics.map((m) => ({
      name: m.name,
      type: m.type,
      value: m.value,
      unit: m.unit,
    })),
    timestamp: output.timestamp,
  };
}

export function computeWorkloadRollups(outputs: StoredOutputStatement[]): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const out of outputs) {
    for (const m of out.metrics) {
      const num = typeof m.value === 'number' ? m.value : Number(m.value);
      if (!isNaN(num)) {
        totals[m.name] = (totals[m.name] || 0) + num;
      }
    }
  }
  return totals;
}
