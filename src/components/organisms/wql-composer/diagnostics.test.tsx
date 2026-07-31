/**
 * Live WQL validation + diagnostics strip (issue #832, decision #826).
 *
 * Asserts:
 *   1. diagnoseClauses: valid default clauses → valid, AST summary carries
 *      target / scope / time window / join.
 *   2. diagnoseClauses: a clause whose fragment breaks the parse is reported
 *      as the offending clause (where join, tag filter, time window).
 *   3. Composer renders the diagnostics strip by default: green valid badge
 *      for a parseable query, red badge with the parser's error message for
 *      an invalid one, and the offending slot pill flagged aria-invalid.
 *   4. Valid queries show target, scope, window, and join in the strip.
 *   5. Stage counts (matched/selected) from the executeFind executor display
 *      live for valid queries, debounced; invalid queries never execute.
 *   6. showDiagnostics={false} hides the strip.
 */

import { afterEach, describe, expect, it, mock } from 'bun:test';
import { cleanup, render, screen, waitFor } from '@testing-library/react';

import { WqlComposer } from './WqlComposer';
import { diagnoseClauses, summarizeFind } from './diagnostics';
import { defaultClauses, type QueryClause } from './queryClauses';
import { parseQuery } from '@/services/analytics/query/wql';
import type { ParsedFindQuery, FindQueryResult } from '@/services/analytics/query';
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

const findResult = (matched: number, selected: number): FindQueryResult => ({
  parsed: {} as FindQueryResult['parsed'],
  notes: [],
  blocks: [],
  stages: { selected, matched },
});

describe('diagnoseClauses', () => {
  it('accepts the default clauses and summarizes target, scope, and window', () => {
    const d = diagnoseClauses(defaultClauses());
    expect(d.valid).toBe(true);
    expect(d.error).toBeUndefined();
    expect(d.offendingClauseId).toBeUndefined();

    const summary = summarizeFind(d.ast as ParsedFindQuery);
    expect(summary.target).toBe('note');
    expect(summary.scope).toBe('journal');
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
    expect(screen.getByTestId('token-slot-target').getAttribute('aria-invalid')).toBeNull();
  });

  it('shows target, scope, window, and join in the strip for valid queries', () => {
    render(
      <WqlComposer
        clauses={[...defaultClauses(), whereClause('sum:totalVolume{} > 5000')]}
        onClausesChange={() => {}}
      />,
    );
    const strip = screen.getByTestId('wql-ast-summary');
    expect(strip.textContent).toContain('note');
    expect(strip.textContent).toContain('journal');
    expect(strip.textContent).toContain('last 2w');
    expect(strip.textContent).toContain('sum:totalVolume > 5000');
  });

  it('displays live stage counts from executeFind for valid queries', async () => {
    const executeFind = mock(async (_ast: ParsedFindQuery) => findResult(3, 10));
    render(<WqlComposer executeFind={executeFind} debounceMs={10} />);

    await waitFor(() => expect(executeFind).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(screen.getByTestId('wql-stage-counts').textContent).toContain('3 of 10 notes matched'),
    );
  });

  it('never executes invalid queries and clears stale counts', async () => {
    const executeFind = mock(async (_ast: ParsedFindQuery) => findResult(3, 10));
    const { rerender } = render(
      <WqlComposer clauses={defaultClauses()} onClausesChange={() => {}} executeFind={executeFind} debounceMs={10} />,
    );
    await waitFor(() => expect(screen.getByTestId('wql-stage-counts')).not.toBeNull());

    rerender(
      <WqlComposer
        clauses={[...defaultClauses(), whereClause('garbage')]}
        onClausesChange={() => {}}
        executeFind={executeFind}
        debounceMs={10}
      />,
    );
    await waitFor(() => expect(screen.queryByTestId('wql-stage-counts')).toBeNull());
    expect(executeFind).toHaveBeenCalledTimes(1);
  });

  it('debounces execution across rapid clause changes', async () => {
    const executeFind = mock(async (_ast: ParsedFindQuery) => findResult(1, 1));
    const { rerender } = render(
      <WqlComposer clauses={defaultClauses()} onClausesChange={() => {}} executeFind={executeFind} debounceMs={50} />,
    );
    rerender(
      <WqlComposer
        clauses={[...defaultClauses(), tagClause('fran')]}
        onClausesChange={() => {}}
        executeFind={executeFind}
        debounceMs={50}
      />,
    );
    await waitFor(() => expect(executeFind).toHaveBeenCalledTimes(1));
    // The debounced run sees the latest AST, not the intermediate one.
    expect((executeFind.mock.calls[0][0] as ParsedFindQuery).filters.some(f => f.key === 'tags')).toBe(true);
  });

  it('hides the strip when showDiagnostics is false', () => {
    render(<WqlComposer showDiagnostics={false} />);
    expect(screen.queryByTestId('wql-diagnostics')).toBeNull();
  });
});
