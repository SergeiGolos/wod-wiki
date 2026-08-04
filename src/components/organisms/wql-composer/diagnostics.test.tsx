/**
 * Live WQL validation + diagnostics strip (issue #832, #838; decisions #826, #836).
 *
 * Asserts:
 *   1. diagnoseClauses: valid default clauses → valid, AST summary carries
 *      source-derived target/scope/time window.
 *   2. diagnoseClauses: a clause whose fragment breaks the parse is reported
 *      as the offending clause (where join, tag filter, time window).
 *   3. Composer renders the diagnostics strip by default: green valid badge
 *      for a parseable query, red badge with the parser's error message for
 *      an invalid one, and the offending slot pill flagged aria-invalid.
 *   4. Valid find queries show source-derived target/scope/window/join in the strip;
 *      valid aggregate queries show agg/metric/dims/rollup/unit/join chips.
 *   5. Stage counts from the `execute` executor display live for valid queries,
 *      discriminated by query kind, debounced; invalid queries never execute.
 *   6. showDiagnostics={false} hides the strip.
 */

import { afterEach, describe, expect, it, mock } from 'bun:test';
import { cleanup, render, screen, waitFor } from '@testing-library/react';

import { WqlComposer } from './WqlComposer';
import { diagnoseClauses, summarizeAggregate, summarizeFind } from './diagnostics';
import { defaultClauses, type QueryClause } from './queryClauses';
import { parseQuery } from '@/services/analytics/query/wql';
import type { AnyParsedQuery, ParsedQuery, ParsedFindQuery, FindQueryResult, QueryResult } from '@/services/analytics/query';
import { composerRegistry } from './ComposerRegistry';
import { dateRangeSlot } from './dateRangeSlot';

afterEach(cleanup);

const whereClause = (value: string): QueryClause => ({
  id: 'c-where',
  type: 'where',
  label: 'Metric Join',
  value,
  inputType: 'freetext',
  placeholder: 'sum:totalVolume{} > 5000',
});

const tagClause = (value: string): QueryClause => ({
  id: 'c-tag',
  type: 'tag',
  label: 'Tag',
  value,
  inputType: 'select',
  placeholder: 'Pick tag...',
});

const timeClause = (value: string): QueryClause => ({
  id: 'c-time',
  type: 'time',
  label: 'Time Window',
  value,
  inputType: 'select',
  placeholder: 'Time range',
});

const rollupClause = (value: string): QueryClause => ({
  id: 'c-rollup',
  type: 'rollup',
  label: 'Rollup',
  value,
  inputType: 'select',
  placeholder: '1d or 1w',
});

const findResult = (matched: number, selected: number): FindQueryResult => ({
  parsed: {} as FindQueryResult['parsed'],
  notes: [],
  blocks: [],
  stages: { selected, matched },
});

const aggregateResult = (selected: number, buckets: number, aggregated: number, groups: number): QueryResult => ({
  parsed: {} as QueryResult['parsed'],
  series: [],
  matched: [],
  stages: { selected, buckets, aggregated, groups },
});

describe('diagnoseClauses', () => {
  it('accepts the default clauses and summarizes target, scope, and window', () => {
    const d = diagnoseClauses(defaultClauses());
    expect(d.valid).toBe(true);
    expect(d.error).toBeUndefined();
    expect(d.offendingClauseId).toBeUndefined();

    const summary = summarizeFind(d.ast as ParsedFindQuery);
    expect(summary.target).toBe('note');
    expect(summary.scope).toBe('all');
    expect(summary.window).toBe('last 2w');
    expect(summary.join).toBeUndefined();
  });

  it('flags the where clause when its join fragment fails to parse', () => {
    const d = diagnoseClauses([...defaultClauses(), whereClause('garbage')]);
    expect(d.valid).toBe(false);
    expect(d.error).toContain('Cannot parse join');
    expect(d.offendingClauseId).toBe('c-where');
  });

  it('flags a filter clause whose value breaks the brace syntax', () => {
    const d = diagnoseClauses([...defaultClauses(), tagClause('bad value')]);
    expect(d.valid).toBe(false);
    expect(d.offendingClauseId).toBe('c-tag');
  });

  it('flags the time clause when its window is not a valid duration', () => {
    const d = diagnoseClauses([timeClause('2x')]);
    expect(d.valid).toBe(false);
    expect(d.offendingClauseId).toBe('c-time');
  });

  it('summarizes the metric join for a valid cross-store query', () => {
    const d = diagnoseClauses([...defaultClauses(), whereClause('sum:totalVolume{} > 5000')]);
    expect(d.valid).toBe(true);
    const summary = summarizeFind(d.ast as ParsedFindQuery);
    expect(summary.join).toBe('sum:totalVolume > 5000');
  });

  it('keeps the parser error and probe attribution when a custom slot also fails validation', () => {
    // Regression: a custom slot's semantic error must not mask the parser's
    // message nor steal the offending-slot highlight from the clause whose
    // fragment actually broke the parse.
    const unregister = composerRegistry.registerSlot(dateRangeSlot);
    try {
      const clauses = [
        ...defaultClauses(),
        whereClause('garbage'),
        { id: 'c-daterange', type: 'date-range', label: dateRangeSlot.label, value: '2026-07-15_2026-07-01', inputType: 'freetext' as const, placeholder: dateRangeSlot.placeholder },
      ];
      const d = diagnoseClauses(clauses);
      expect(d.valid).toBe(false);
      expect(d.error).toContain('Cannot parse join');
      expect(d.offendingClauseId).toBe('c-where');
    } finally {
      unregister();
    }
  });

  it('does not flag a healthy Time=All slot when another clause breaks the parse', () => {
    // Regression: 'all' compiles to no time fragment (clausesToWql), so its
    // probe must be skipped — probing `find:note last all` fails and would
    // steal the highlight from the actual offender.
    const clauses = [
      ...defaultClauses().map(c => (c.type === 'time' ? { ...c, value: 'all' } : c)),
      whereClause('garbage'),
    ];
    const d = diagnoseClauses(clauses);
    expect(d.valid).toBe(false);
    expect(d.offendingClauseId).toBe('c-where');
  });

  it('does not flag any clause when every fragment parses alone', () => {
    // Sanity: probing is opt-in evidence — a valid query has no offender.
    const d = diagnoseClauses(defaultClauses());
    expect(d.offendingClauseId).toBeUndefined();
  });

  it('summarizes a valid aggregate query', () => {
    const d = diagnoseClauses([
      { id: 'c-source', type: 'source', label: 'Source', value: 'metrics', inputType: 'select', placeholder: '' },
      { id: 'c-agg', type: 'agg', label: 'Aggregate', value: 'avg', inputType: 'select', placeholder: '' },
      { id: 'c-metric', type: 'metric', label: 'Metric', value: 'tis', inputType: 'select', placeholder: '' },
      { id: 'c-groupby', type: 'groupby', label: 'Group By', value: 'week', inputType: 'select', placeholder: '' },
      rollupClause('1w'),
      { id: 'c-unit', type: 'unit', label: 'Unit', value: 'kg', inputType: 'freetext', placeholder: '' },
      whereClause('find:note{tags:competition} in journal'),
    ]);
    expect(d.valid).toBe(true);
    const summary = summarizeAggregate(d.ast as ParsedQuery);
    expect(summary.agg).toBe('avg');
    expect(summary.metric).toBe('tis');
    expect(summary.dims).toBe('week');
    expect(summary.rollup).toBe('1w');
    expect(summary.unit).toBe('kg');
    expect(summary.join).toBe('find:note');
  });

  it('flags the rollup clause when an invalid period is supplied on the metrics plane', () => {
    const d = diagnoseClauses([
      { id: 'c-source', type: 'source', label: 'Source', value: 'metrics', inputType: 'select', placeholder: '' },
      { id: 'c-agg', type: 'agg', label: 'Aggregate', value: 'sum', inputType: 'select', placeholder: '' },
      { id: 'c-metric', type: 'metric', label: 'Metric', value: 'totalVolume', inputType: 'select', placeholder: '' },
      rollupClause('1m'),
    ]);
    expect(d.valid).toBe(false);
    expect(d.offendingClauseId).toBe('c-rollup');
  });
});

describe('summarizeFind', () => {
  it('formats window and join from the parsed AST', () => {
    const ast = parseQuery('find:block in collections last 4d where avg:tis{} >= 2.5') as ParsedFindQuery;
    const summary = summarizeFind(ast);
    expect(summary.target).toBe('block');
    expect(summary.scope).toBe('collections');
    expect(summary.window).toBe('last 4d');
    expect(summary.join).toBe('avg:tis >= 2.5');
  });
});

describe('summarizeAggregate', () => {
  it('formats aggregate summary from the parsed AST', () => {
    const ast = parseQuery('sum:totalVolume{discipline:strength} by {week}.rollup(1w) in kg where find:note{tags:PR}');
    const summary = summarizeAggregate(ast as ParsedQuery);
    expect(summary.agg).toBe('sum');
    expect(summary.metric).toBe('totalVolume');
    expect(summary.dims).toBe('week');
    expect(summary.rollup).toBe('1w');
    expect(summary.unit).toBe('kg');
    expect(summary.join).toBe('find:note');
  });
});

describe('WqlComposer diagnostics strip', () => {
  it('shows a valid badge for the default query', () => {
    render(<WqlComposer />);
    const badge = screen.getByTestId('wql-validity-badge');
    expect(badge.textContent?.toLowerCase()).toContain('valid');
    expect(badge.getAttribute('data-valid')).toBe('true');
  });

  it('shows a red badge with the parser error and flags the offending slot', () => {
    render(<WqlComposer clauses={[...defaultClauses(), whereClause('garbage')]} onClausesChange={() => {}} />);

    const badge = screen.getByTestId('wql-validity-badge');
    expect(badge.getAttribute('data-valid')).toBe('false');
    expect(badge.textContent).toContain('Cannot parse join');

    // The offending slot pill is visually flagged, and the strip names it.
    expect(screen.getByTestId('token-slot-where').getAttribute('aria-invalid')).toBe('true');
    expect(screen.getByTestId('wql-diagnostics').textContent).toContain('Metric Join');

    // Healthy slots stay unflagged.
    expect(screen.getByTestId('token-slot-source').getAttribute('aria-invalid')).toBeNull();
  });

  it('shows target, scope, window, and join in the strip for valid find queries', () => {
    render(
      <WqlComposer
        clauses={[...defaultClauses(), whereClause('sum:totalVolume{} > 5000')]}
        onClausesChange={() => {}}
      />,
    );
    const strip = screen.getByTestId('wql-ast-summary');
    expect(strip.textContent).toContain('note');
    expect(strip.textContent).toContain('all');
    expect(strip.textContent).toContain('last 2w');
    expect(strip.textContent).toContain('sum:totalVolume > 5000');
  });

  it('shows aggregate summary chips for a valid aggregate query', () => {
    render(
      <WqlComposer
        clauses={[
          { id: 'c-source', type: 'source', label: 'Source', value: 'metrics', inputType: 'select', placeholder: '' },
          { id: 'c-agg', type: 'agg', label: 'Aggregate', value: 'sum', inputType: 'select', placeholder: '' },
          { id: 'c-metric', type: 'metric', label: 'Metric', value: 'totalVolume', inputType: 'select', placeholder: '' },
          { id: 'c-groupby', type: 'groupby', label: 'Group By', value: 'week', inputType: 'select', placeholder: '' },
          rollupClause('1w'),
        ]}
        onClausesChange={() => {}}
      />,
    );

    expect(screen.getByTestId('wql-summary-agg').textContent).toContain('sum');
    expect(screen.getByTestId('wql-summary-metric').textContent).toContain('totalVolume');
    expect(screen.getByTestId('wql-summary-dims').textContent).toContain('week');
    expect(screen.getByTestId('wql-summary-rollup').textContent).toContain('1w');
  });

  it('displays live stage counts from execute for valid find queries', async () => {
    const execute = mock(async (_ast: AnyParsedQuery) => findResult(3, 10) as FindQueryResult | QueryResult);
    render(<WqlComposer execute={execute} debounceMs={10} />);

    await waitFor(() => expect(execute).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(screen.getByTestId('wql-stage-counts').textContent).toContain('3 of 10 notes matched'),
    );
  });

  it('displays live aggregate stage counts from execute for valid aggregate queries', async () => {
    const execute = mock(async (_ast: AnyParsedQuery) => aggregateResult(10, 4, 4, 2) as FindQueryResult | QueryResult);
    render(
      <WqlComposer
        clauses={[
          { id: 'c-source', type: 'source', label: 'Source', value: 'metrics', inputType: 'select', placeholder: '' },
          { id: 'c-agg', type: 'agg', label: 'Aggregate', value: 'sum', inputType: 'select', placeholder: '' },
          { id: 'c-metric', type: 'metric', label: 'Metric', value: 'totalVolume', inputType: 'select', placeholder: '' },
          { id: 'c-groupby', type: 'groupby', label: 'Group By', value: 'week', inputType: 'select', placeholder: '' },
        ]}
        execute={execute}
        debounceMs={10}
      />,
    );

    await waitFor(() => expect(execute).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(screen.getByTestId('wql-stage-counts').textContent).toContain('2 groups · 4 buckets · 4 aggregated'),
    );
  });

  it('flags an invalid rollup pill for an aggregate query with a bad period', () => {
    render(
      <WqlComposer
        clauses={[
          { id: 'c-source', type: 'source', label: 'Source', value: 'metrics', inputType: 'select', placeholder: '' },
          { id: 'c-agg', type: 'agg', label: 'Aggregate', value: 'sum', inputType: 'select', placeholder: '' },
          { id: 'c-metric', type: 'metric', label: 'Metric', value: 'totalVolume', inputType: 'select', placeholder: '' },
          { id: 'c-groupby', type: 'groupby', label: 'Group By', value: 'week', inputType: 'select', placeholder: '' },
          rollupClause('1m'),
        ]}
        onClausesChange={() => {}}
      />,
    );

    expect(screen.getByTestId('token-slot-rollup').getAttribute('aria-invalid')).toBe('true');
  });

  it('never executes invalid queries and clears stale counts', async () => {
    const execute = mock(async (_ast: AnyParsedQuery) => findResult(3, 10) as FindQueryResult | QueryResult);
    const { rerender } = render(
      <WqlComposer clauses={defaultClauses()} onClausesChange={() => {}} execute={execute} debounceMs={10} />,
    );
    await waitFor(() => expect(screen.getByTestId('wql-stage-counts')).not.toBeNull());

    rerender(
      <WqlComposer
        clauses={[...defaultClauses(), whereClause('garbage')]}
        onClausesChange={() => {}}
        execute={execute}
        debounceMs={10}
      />,
    );
    await waitFor(() => expect(screen.queryByTestId('wql-stage-counts')).toBeNull());
    expect(execute).toHaveBeenCalledTimes(1);
  });

  it('debounces execution across rapid clause changes', async () => {
    const execute = mock(async (_ast: AnyParsedQuery) => findResult(1, 1) as FindQueryResult | QueryResult);
    const { rerender } = render(
      <WqlComposer clauses={defaultClauses()} onClausesChange={() => {}} execute={execute} debounceMs={50} />,
    );
    rerender(
      <WqlComposer
        clauses={[...defaultClauses(), tagClause('fran')]}
        onClausesChange={() => {}}
        execute={execute}
        debounceMs={50}
      />,
    );
    await waitFor(() => expect(execute).toHaveBeenCalledTimes(1));
    // The debounced run sees the latest AST, not the intermediate one.
    expect((execute.mock.calls[0][0] as ParsedFindQuery).filters.some(f => f.key === 'tags')).toBe(true);
  });

  it('hides the strip when showDiagnostics is false', () => {
    render(<WqlComposer showDiagnostics={false} />);
    expect(screen.queryByTestId('wql-diagnostics')).toBeNull();
  });
});
