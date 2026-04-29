/**
 * Shared helpers for dialect metric testing.
 *
 * Usage:
 *   const { statement, registry } = parseWithDialect('EMOM (20)', 'crossfit');
 *   const display = statement.getDisplayMetrics();
 *   const raw     = statement.rawMetrics;
 */

import { MdTimerRuntime } from '../../parser/md-timer';
import { ICodeStatement } from '../../core/models/CodeStatement';
import { DialectRegistry } from '../../services/DialectRegistry';
import { IMetric, MetricType } from '../../core/models/Metric';
import { CrossFitDialect } from '../CrossFitDialect';
import { CardioDialect } from '../CardioDialect';
import { YogaDialect } from '../YogaDialect';
import { HabitsDialect } from '../HabitsDialect';

// ──────────────────────────────────────────────────────────
// Dialect factory
// ──────────────────────────────────────────────────────────

const DIALECT_MAP: Record<string, () => DialectRegistry> = {
  crossfit: () => {
    const r = new DialectRegistry();
    r.register(new CrossFitDialect());
    return r;
  },
  cardio: () => {
    const r = new DialectRegistry();
    r.register(new CardioDialect());
    return r;
  },
  yoga: () => {
    const r = new DialectRegistry();
    r.register(new YogaDialect());
    return r;
  },
  habits: () => {
    const r = new DialectRegistry();
    r.register(new HabitsDialect());
    return r;
  },
  none: () => new DialectRegistry(),
};

// ──────────────────────────────────────────────────────────
// Core fixture runner
// ──────────────────────────────────────────────────────────

export interface DialectFixtureResult {
  /** Primary (first) statement after dialect processing */
  statement: ICodeStatement;
  /** All statements from the parse */
  statements: ICodeStatement[];
  /** The registry that was used */
  registry: DialectRegistry;
}

/**
 * Parse a wod block through the dialect pipeline.
 *
 * @param block   Raw wod block text (multiline OK)
 * @param dialect One of: 'crossfit' | 'cardio' | 'yoga' | 'habits' | 'none'
 */
export function parseWithDialect(
  block: string,
  dialect: keyof typeof DIALECT_MAP = 'crossfit',
): DialectFixtureResult {
  const runtime = new MdTimerRuntime();
  const script = runtime.read(block);

  if (!script.statements.length) {
    throw new Error(`No statements parsed from block:\n${block}`);
  }

  const registry = DIALECT_MAP[dialect]();
  registry.processAll(script.statements as ICodeStatement[]);

  return {
    statement: script.statements[0] as ICodeStatement,
    statements: script.statements as ICodeStatement[],
    registry,
  };
}

// ──────────────────────────────────────────────────────────
// Assertion helpers
// ──────────────────────────────────────────────────────────

/** Returns all raw metrics of a given type (includes suppressed). */
export function rawMetricsOfType(stmt: ICodeStatement, type: MetricType): IMetric[] {
  return stmt.metrics.filter(m => m.type === type);
}

/** Returns the display metrics of a given type (suppressed items hidden). */
export function displayMetricsOfType(stmt: ICodeStatement, type: MetricType): IMetric[] {
  return stmt.getDisplayMetrics().filter(m => m.type === type);
}

/** Assert a metric of given type, origin, and value exists in raw metrics. */
export function expectRawMetric(
  stmt: ICodeStatement,
  type: MetricType,
  origin: string,
  value?: unknown,
): IMetric {
  const found = rawMetricsOfType(stmt, type).find(
    m => m.origin === origin && (value === undefined || m.value === value),
  );
  if (!found) {
    const raw = JSON.stringify(rawMetricsOfType(stmt, type), null, 2);
    throw new Error(
      `Expected raw metric { type: ${type}, origin: ${origin}${value !== undefined ? `, value: ${value}` : ''} }\n` +
      `Actual metrics of type ${type}:\n${raw}`,
    );
  }
  return found;
}

/** Assert a metric appears in display output. */
export function expectDisplayMetric(
  stmt: ICodeStatement,
  type: MetricType,
  value?: unknown,
): IMetric {
  const found = displayMetricsOfType(stmt, type).find(
    m => value === undefined || m.value === value,
  );
  if (!found) {
    const display = JSON.stringify(stmt.getDisplayMetrics(), null, 2);
    throw new Error(
      `Expected display metric { type: ${type}${value !== undefined ? `, value: ${value}` : ''} }\n` +
      `Actual display metrics:\n${display}`,
    );
  }
  return found;
}

/** Assert a metric type is NOT present in display output (may still exist in raw). */
export function expectNotDisplayed(stmt: ICodeStatement, type: MetricType): void {
  const found = displayMetricsOfType(stmt, type);
  if (found.length > 0) {
    throw new Error(
      `Expected metric type ${type} to be suppressed from display, ` +
      `but found ${found.length} display metric(s): ${JSON.stringify(found)}`,
    );
  }
}

/** Pretty-print raw metrics for fixture capture / debugging. */
export function snapshotMetrics(stmt: ICodeStatement): object {
  return {
    raw: stmt.metrics.map(m => ({
      type: m.type,
      value: m.value,
      origin: m.origin,
      action: m.action,
      unit: m.unit,
    })),
    display: stmt.getDisplayMetrics().map(m => ({
      type: m.type,
      value: m.value,
      origin: m.origin,
    })),
    hints: stmt.hints ? Array.from(stmt.hints) : [],
  };
}
