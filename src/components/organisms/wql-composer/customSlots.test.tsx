/**
 * Custom slot integration — ComposerRegistry × WqlComposer (issue #830).
 *
 * Asserts:
 *   1. A registered custom slot appears in the composer's add-filter menu.
 *   2. Adding it renders a token pill with placeholder guidance; opening the
 *      pill hosts the custom editor widget (date-range picker demo).
 *   3. The editor's value flows through formatValue onto the clause and the
 *      wqlGenerator fragment composes into WQL that parseQuery accepts
 *      alongside the built-in clauses.
 *   4. The slot's validate feeds the composer's onValidationChange.
 *   5. clauseToWql compiles custom fragments and round-trips through
 *      parseQuery (unit-level).
 */

import { afterEach, describe, expect, it, mock } from 'bun:test';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';

import { composerRegistry } from './ComposerRegistry';
import { dateRangeSlot } from './dateRangeSlot';
import { WqlComposer, type WqlValidationState } from './WqlComposer';
import { clauseToWql, defaultClauses, type QueryClause } from './queryClauses';
import { parseQuery, isFindQuery } from '@/services/analytics/query/wql';

let unregister: (() => void) | undefined;

const registerDemo = () => {
  unregister?.();
  unregister = composerRegistry.registerSlot(dateRangeSlot);
};

afterEach(() => {
  unregister?.();
  unregister = undefined;
  cleanup();
});

const dateRangeClause = (value: string): QueryClause => ({
  id: 'c-daterange',
  type: 'date-range',
  label: dateRangeSlot.label,
  value,
  inputType: 'freetext',
  placeholder: dateRangeSlot.placeholder,
});

describe('custom slot plugin architecture', () => {
  it('clauseToWql compiles a custom fragment that parseQuery accepts', () => {
    registerDemo();
    const clause = dateRangeClause('2026-07-01_2026-07-15');

    expect(clauseToWql(clause)).toEqual({ filterStr: 'daterange:2026-07-01_2026-07-15' });

    const wql = 'find:note{tags:PR, daterange:2026-07-01_2026-07-15} in journal last 2w where sum:totalVolume{} > 5000';
    const ast = parseQuery(wql);
    expect(ast.error).toBeUndefined();
    expect(isFindQuery(ast)).toBe(true);
    if (isFindQuery(ast)) {
      expect(ast.filters.map(f => f.key)).toEqual(['tags', 'daterange']);
      expect(ast.filters[1].values[0].value).toBe('2026-07-01_2026-07-15');
      expect(ast.join).toBeDefined();
    }
  });

  it('emits no fragment for an empty or unparseable custom clause', () => {
    registerDemo();
    expect(clauseToWql(dateRangeClause(''))).toEqual({});
    expect(clauseToWql(dateRangeClause('not-a-range'))).toEqual({});
  });

  it('lists the registered slot in the add-filter menu and adds a placeholder pill', () => {
    registerDemo();
    const onClausesChange = mock((_c: QueryClause[]) => {});
    render(<WqlComposer onClausesChange={onClausesChange} />);

    fireEvent.click(screen.getByTestId('add-filter-btn'));
    const item = screen.getByText('Date Range');
    expect(item).not.toBeNull();

    fireEvent.click(item);
    const next = onClausesChange.mock.calls[0][0];
    const added = next[next.length - 1];
    expect(added.type).toBe('date-range');
    expect(added.value).toBe('');
  });

  it('renders the custom editor in the pill popover and commits a typed value', () => {
    registerDemo();
    const onWqlChange = mock((_wql: string) => {});
    const onValidationChange = mock((_s: WqlValidationState) => {});
    render(
      <WqlComposer
        initialClauses={[...defaultClauses(), dateRangeClause('')]}
        onWqlChange={onWqlChange}
        onValidationChange={onValidationChange}
      />,
    );

    // Empty pill shows the slot's placeholder guidance.
    const pill = screen.getByTestId('token-slot-date-range');
    expect(pill.textContent).toContain('daterange: [start_end]');

    // Open the popover → custom editor widget renders.
    fireEvent.click(pill);
    expect(screen.getByTestId('date-range-editor')).not.toBeNull();

    // Pick a range and apply.
    fireEvent.change(screen.getByTestId('date-range-start'), { target: { value: '2026-07-01' } });
    fireEvent.change(screen.getByTestId('date-range-end'), { target: { value: '2026-07-15' } });
    fireEvent.click(screen.getByTestId('date-range-apply'));

    // Pill now shows the serialized value; popover closed.
    expect(screen.getByTestId('token-slot-date-range').textContent).toContain('2026-07-01_2026-07-15');
    expect(screen.queryByTestId('date-range-editor')).toBeNull();

    // Composed WQL carries the fragment and parses cleanly.
    const wql = onWqlChange.mock.calls[onWqlChange.mock.calls.length - 1][0];
    expect(wql).toBe('find:note{daterange:2026-07-01_2026-07-15} in journal last 2w');
    expect(parseQuery(wql).error).toBeUndefined();
    expect(onValidationChange).toHaveBeenLastCalledWith({ valid: true });
  });

  it('re-emits WQL when a slot registers after mount', () => {
    // Clause exists before registration: the pill renders via the fallback
    // meta and emits no fragment until the slot registers.
    const onWqlChange = mock((_wql: string) => {});
    render(
      <WqlComposer
        initialClauses={[...defaultClauses(), dateRangeClause('2026-07-01_2026-07-15')]}
        onWqlChange={onWqlChange}
      />,
    );
    expect(onWqlChange).toHaveBeenLastCalledWith('find:note in journal last 2w');

    act(() => registerDemo());
    expect(onWqlChange).toHaveBeenLastCalledWith(
      'find:note{daterange:2026-07-01_2026-07-15} in journal last 2w',
    );
  });

  it('surfaces the slot validator through onValidationChange', () => {
    registerDemo();
    const onValidationChange = mock((_s: WqlValidationState) => {});
    // End precedes start → validate reports an error.
    render(
      <WqlComposer
        initialClauses={[...defaultClauses(), dateRangeClause('2026-07-15_2026-07-01')]}
        onValidationChange={onValidationChange}
      />,
    );

    expect(onValidationChange).toHaveBeenLastCalledWith({
      valid: false,
      error: 'Date range end must not precede its start',
    });
  });
});
