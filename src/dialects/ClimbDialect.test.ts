import { describe, it, expect } from 'bun:test';
import { ClimbDialect, ClimbMetricType } from './ClimbDialect';
import { parseWithDialect, rawMetricsOfType, statementHasHint } from './__tests__/dialect-test-helpers';

describe('ClimbDialect', () => {
  const dialect = new ClimbDialect();

  it('has dialect metadata', () => {
    expect(dialect.id).toBe('climb');
    expect(dialect.name).toBe('Climb Dialect');
  });

  it('recognizes indoor bouldering route grade send type and attempts', () => {
    const { statement } = parseWithDialect('[The Shield] V7 redpoint @12 // engage core before crux reach', 'climb');

    expect(statementHasHint(statement, 'domain.climb')).toBe(true);
    expect(statementHasHint(statement, 'climb.bouldering')).toBe(true);
    expect(statementHasHint(statement, 'behavior.grade_based')).toBe(true);
    expect(statementHasHint(statement, 'behavior.attempt_based')).toBe(true);

    expect(rawMetricsOfType(statement, ClimbMetricType.RouteName as any)[0]?.value).toBe('The Shield');
    expect(rawMetricsOfType(statement, ClimbMetricType.SendType as any)[0]?.value).toBe('redpoint');
    expect(rawMetricsOfType(statement, ClimbMetricType.AttemptCount as any)[0]?.value).toBe(12);
    expect(rawMetricsOfType(statement, ClimbMetricType.Grade as any)[0]?.value).toEqual({
      raw: 'V7',
      system: 'v-scale',
      normalizedRank: 7,
    });
  });

  it('reconstructs YDS grades split across parser rep and effort metrics', () => {
    const { statement } = parseWithDialect('[Black Magic] 5.11d redpoint @4 // crux at bolt 6', 'climb');

    expect(statementHasHint(statement, 'domain.climb')).toBe(true);
    expect(statementHasHint(statement, 'climb.sport')).toBe(true);
    expect(rawMetricsOfType(statement, ClimbMetricType.HighPoint as any)[0]?.value).toBe('bolt 6');
    expect(rawMetricsOfType(statement, ClimbMetricType.Grade as any)[0]?.value).toEqual({
      raw: '5.11d',
      system: 'yds',
      normalizedRank: 11.75,
    });
  });

  it('recognizes Fontainebleau grades split across parser rep and effort metrics', () => {
    const { statement } = parseWithDialect('[Purple Pinch] 7A flash @1', 'climb');

    expect(statementHasHint(statement, 'climb.bouldering')).toBe(true);
    expect(rawMetricsOfType(statement, ClimbMetricType.SendType as any)[0]?.value).toBe('flash');
    expect(rawMetricsOfType(statement, ClimbMetricType.Grade as any)[0]?.value).toEqual({
      raw: '7A',
      system: 'font',
    });
  });

  it('normalizes common send aliases', () => {
    const { statement } = parseWithDialect('[Warmup Slab] V2 OS @1', 'climb');

    expect(rawMetricsOfType(statement, ClimbMetricType.SendType as any)[0]?.value).toBe('onsight');
  });

  it('does not mark unrelated workout lines as climbing', () => {
    const { statement } = parseWithDialect('10 Pullups', 'climb');

    expect(statementHasHint(statement, 'domain.climb')).toBe(false);
    expect(statement.metrics.filter(metric => metric.origin === 'dialect')).toHaveLength(0);
  });
});
