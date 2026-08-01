/**
 * WqlComposer — shared omni command bar (issue #829, #838).
 *
 * Asserts:
 *   1. Renders token-slot pills with placeholder guidance for empty clauses.
 *   2. Public callbacks fire on mount and on change: onWqlChange,
 *      onValidationChange, onAstChange, onClausesChange.
 *   3. Typing text + Enter appends a `text:` clause and emits updated WQL.
 *   4. Keyboard-only interaction: Enter opens the clause popover, Up/Down
 *      cycles options, Enter selects, Escape dismisses.
 *   5. Pills are tabbable (Tab / Shift+Tab slot traversal).
 *   6. Controlled mode: clauses prop wins, onClausesChange is the only write path.
 *   7. Source-pivot model: metrics plane renders agg/metric pills and emits
 *      aggregate WQL; AddFilter menu is plane-aware; pivoting drops content-only
 *      clauses while preserving shared filters.
 */

import { useState } from 'react';
import { afterEach, describe, expect, it, mock } from 'bun:test';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

import { WqlComposer, type WqlValidationState } from './WqlComposer';
import { defaultClauses, type QueryClause } from './queryClauses';
import { isFindQuery, type AnyParsedQuery } from '@/services/analytics/query/wql';

afterEach(cleanup);

const emptyTagClause = (): QueryClause[] => [
  ...defaultClauses(),
  { id: 'c-tag', type: 'tag', label: 'Tag', value: '', inputType: 'select', placeholder: 'Pick tag...' },
];

const metricsClauses = (): QueryClause[] => [
  { id: 'c-source', type: 'source', label: 'Source', value: 'metrics', inputType: 'select', placeholder: 'journal, notes, metrics…' },
  { id: 'c-agg', type: 'agg', label: 'Aggregate', value: 'sum', inputType: 'select', placeholder: 'sum, avg…' },
  { id: 'c-metric', type: 'metric', label: 'Metric', value: 'totalVolume', inputType: 'select', placeholder: 'totalVolume, reps…' },
];

describe('WqlComposer pending-text preview (#854)', () => {
  it('previews a single word as a text chip and commits it on Enter', () => {
    render(<WqlComposer />)
    const input = screen.getByTestId('wql-composer-input')
    fireEvent.change(input, { target: { value: 'squat' } })

    expect(screen.getByTestId('wql-composer-pending').textContent).toContain('Search text: squat')

    fireEvent.keyDown(input, { key: 'Enter' })
    expect(screen.getByTestId('token-slot-text').textContent).toContain('squat')
    expect((input as HTMLInputElement).value).toBe('')
    expect(screen.queryByTestId('wql-composer-pending')).toBeNull()
  })

  it('previews a valid WQL query and adopts it wholesale on Enter', () => {
    render(<WqlComposer />)
    const input = screen.getByTestId('wql-composer-input')
    fireEvent.change(input, { target: { value: 'find:note{tags:strength} in all' } })

    expect(screen.getByTestId('wql-composer-pending').textContent).toContain('Use as query')

    fireEvent.keyDown(input, { key: 'Enter' })
    // Clauses replaced, not a text chip appended.
    expect(screen.getByTestId('token-slot-tag').textContent).toContain('strength')
    expect(screen.queryByTestId('token-slot-text')).toBeNull()
    expect((input as HTMLInputElement).value).toBe('')
  })

  it('flags garbage inline and refuses to commit it', () => {
    render(<WqlComposer />)
    const input = screen.getByTestId('wql-composer-input')
    fireEvent.change(input, { target: { value: ')))' } })

    const hint = screen.getByTestId('wql-composer-pending')
    expect(hint.getAttribute('role')).toBe('alert')
    expect(hint.textContent).toContain('No searchable text')

    fireEvent.keyDown(input, { key: 'Enter' })
    // No chip, text kept — nothing silently discarded.
    expect(screen.queryByTestId('token-slot-text')).toBeNull()
    expect((input as HTMLInputElement).value).toBe(')))')
  })

  it('flags multi-word text honestly instead of emitting invalid WQL', () => {
    render(<WqlComposer />)
    const input = screen.getByTestId('wql-composer-input')
    fireEvent.change(input, { target: { value: 'hello world' } })

    expect(screen.getByTestId('wql-composer-pending').textContent).toContain('Multi-word text')
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(screen.queryByTestId('token-slot-text')).toBeNull()
  })

  it("surfaces the parser's own message for composer-shaped but invalid WQL", () => {
    render(<WqlComposer />)
    const input = screen.getByTestId('wql-composer-input')
    // Salvage-restorable (composer shape) but grammar-invalid (space in filter).
    fireEvent.change(input, { target: { value: 'find:note{text:hello world} in all' } })

    const hint = screen.getByTestId('wql-composer-pending')
    expect(hint.getAttribute('role')).toBe('alert')
    expect(hint.textContent).not.toContain('Multi-word text')
  })

  it('auto-removes an unfilled placeholder chip when its popover is dismissed', () => {
    render(<WqlComposer initialClauses={emptyTagClause()} />)
    const pill = screen.getByTestId('token-slot-tag')
    fireEvent.click(pill)
    expect(screen.getByTestId('clause-popover-tag')).toBeDefined()

    fireEvent.keyDown(document.activeElement as Element, { key: 'Escape' })
    expect(screen.queryByTestId('token-slot-tag')).toBeNull()
  })

  it('keeps a filled chip when its popover is dismissed', () => {
    const filled = emptyTagClause().map(c => (c.type === 'tag' ? { ...c, value: 'strength' } : c))
    render(<WqlComposer initialClauses={filled} />)
    const pill = screen.getByTestId('token-slot-tag')
    fireEvent.click(pill)
    fireEvent.keyDown(document.activeElement as Element, { key: 'Escape' })
    expect(screen.getByTestId('token-slot-tag')).toBeDefined()
  })

  it('offers a visible commit row for typed free text in an open slot popover', () => {
    const onClausesChange = mock((_c: QueryClause[]) => {})
    const clauses: QueryClause[] = [
      ...defaultClauses(),
      { id: 'c-text', type: 'text', label: 'Contains', value: '', inputType: 'freetext', placeholder: 'Search text...' },
    ]
    render(<WqlComposer clauses={clauses} onClausesChange={onClausesChange} />)
    fireEvent.click(screen.getByTestId('token-slot-text'))

    // Typing in the popover filter offers a committable row, not a dead-end.
    const filterInput = screen.getByTestId('clause-popover-text').querySelector('input')!
    fireEvent.change(filterInput, { target: { value: 'squat' } })
    const commitRow = screen.getByTestId('clause-commit-typed-text')
    expect(commitRow.textContent).toContain('squat')

    fireEvent.click(commitRow)
    const lastCall = onClausesChange.mock.calls[onClausesChange.mock.calls.length - 1]![0] as QueryClause[]
    expect(lastCall.find(c => c.type === 'text')?.value).toBe('squat')
  })
});

describe('WqlComposer', () => {
  it('renders token pills and shows placeholder guidance for empty clauses', () => {
    render(<WqlComposer initialClauses={emptyTagClause()} />);

    // Valued pills show prefix + value
    expect(screen.getByTestId('token-slot-source').textContent).toContain('notes');
    expect(screen.getByTestId('token-slot-time').textContent).toContain('last 2w');

    // Empty pill falls back to the placeholder guidance text
    expect(screen.getByTestId('token-slot-tag').textContent).toContain('tags: [tag]');
  });

  it('emits wql, validation, and AST callbacks on mount', () => {
    const onWqlChange = mock((_wql: string) => {});
    const onValidationChange = mock((_s: WqlValidationState) => {});
    const onAstChange = mock((_ast: AnyParsedQuery) => {});

    render(
      <WqlComposer
        onWqlChange={onWqlChange}
        onValidationChange={onValidationChange}
        onAstChange={onAstChange}
      />,
    );

    expect(onWqlChange).toHaveBeenCalledWith('find:note in all last 2w');
    expect(onValidationChange).toHaveBeenCalledWith({ valid: true });
    expect(onAstChange).toHaveBeenCalled();
    const ast = onAstChange.mock.calls[0][0];
    expect(isFindQuery(ast)).toBe(true);
    if (isFindQuery(ast)) {
      expect(ast.target).toBe('note');
      expect(ast.scope).toBe('all');
    }
  });

  it('appends a text clause via free-text input + Enter and fires onClausesChange', () => {
    const onClausesChange = mock((_c: QueryClause[]) => {});
    const onWqlChange = mock((_wql: string) => {});
    render(<WqlComposer onClausesChange={onClausesChange} onWqlChange={onWqlChange} />);

    const input = screen.getByTestId('wql-composer-input');
    fireEvent.change(input, { target: { value: 'Fran' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onClausesChange).toHaveBeenCalledTimes(1);
    const next = onClausesChange.mock.calls[0][0];
    expect(next[next.length - 1]?.type).toBe('text');
    expect(next[next.length - 1]?.value).toBe('Fran');

    // Uncontrolled path: internal state advanced → WQL re-emitted with the filter.
    expect(onWqlChange).toHaveBeenLastCalledWith('find:note{text:Fran} in all last 2w');
  });

  it('supports keyboard-only option selection: Enter opens, Up/Down cycles, Enter selects, Escape dismisses', () => {
    render(<WqlComposer />);

    const source = screen.getByTestId('token-slot-source');
    source.focus();

    // Enter opens the popover and moves focus into it
    fireEvent.keyDown(source, { key: 'Enter' });
    const popover = screen.getByTestId('clause-popover-source');
    expect(document.activeElement).toBe(popover);

    // ArrowDown then Enter selects the second option ("collections")
    fireEvent.keyDown(document.activeElement as Element, { key: 'ArrowDown' });
    fireEvent.keyDown(document.activeElement as Element, { key: 'Enter' });
    expect(screen.getByTestId('token-slot-source').textContent).toContain('collections');

    // Re-open and Escape dismisses
    fireEvent.keyDown(source, { key: 'Enter' });
    expect(screen.queryByTestId('clause-popover-source')).not.toBeNull();
    fireEvent.keyDown(document.activeElement as Element, { key: 'Escape' });
    expect(screen.queryByTestId('clause-popover-source')).toBeNull();
  });

  it('does not loop when consumers pass inline change handlers', () => {
    // Maximum update depth would blow up if the emit effect depended on
    // callback identity.
    function Harness() {
      const [ast, setAst] = useState<AnyParsedQuery | null>(null);
      return (
        <>
          <WqlComposer onAstChange={a => setAst(a)} />
          <span data-testid="ast-kind">{ast && isFindQuery(ast) ? ast.target : 'none'}</span>
        </>
      );
    }
    render(<Harness />);
    expect(screen.getByTestId('ast-kind').textContent).toBe('note');
  });

  it('keeps every slot pill tabbable for Tab / Shift+Tab traversal', () => {
    render(<WqlComposer />);
    for (const testid of ['token-slot-source', 'token-slot-time']) {
      expect(screen.getByTestId(testid).getAttribute('tabindex')).toBe('0');
    }
  });

  it('controlled mode renders the clauses prop and reports changes through onClausesChange', () => {
    const clauses = defaultClauses();
    const onClausesChange = mock((_c: QueryClause[]) => {});
    render(<WqlComposer clauses={clauses} onClausesChange={onClausesChange} />);

    // Remove the time clause via its pill remove button
    fireEvent.click(screen.getByTestId('token-slot-remove-time'));
    expect(onClausesChange).toHaveBeenCalledTimes(1);
    const next = onClausesChange.mock.calls[0][0];
    expect(next.find(c => c.type === 'time')).toBeUndefined();
    // Controlled: the pill still renders because the prop did not change.
    expect(screen.getByTestId('token-slot-time')).not.toBeNull();
  });

  it('fires onSubmit with the composed WQL on Enter when no free text is pending', () => {
    const onSubmit = mock((_wql: string) => {});
    render(<WqlComposer initialClauses={metricsClauses()} onSubmit={onSubmit} />);

    const input = screen.getByTestId('wql-composer-input');
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith('sum:totalVolume');
  });

  it('Enter with pending free text commits a text clause instead of submitting', () => {
    const onSubmit = mock((_wql: string) => {});
    render(<WqlComposer onSubmit={onSubmit} />);

    const input = screen.getByTestId('wql-composer-input');
    fireEvent.change(input, { target: { value: 'fran' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByTestId('token-slot-text').textContent).toContain('fran');
  });
});

describe('WqlComposer source-pivot analytics plane', () => {
  it('seeds and renders aggregate head pills when source=metrics', () => {
    render(<WqlComposer initialClauses={metricsClauses()} />);

    expect(screen.getByTestId('token-slot-source').textContent).toContain('metrics');
    expect(screen.getByTestId('token-slot-agg').textContent).toContain('sum');
    expect(screen.getByTestId('token-slot-metric').textContent).toContain('totalVolume');
  });

  it('composes aggregate WQL from agg + metric pills', () => {
    const onWqlChange = mock((_wql: string) => {});
    render(<WqlComposer initialClauses={metricsClauses()} onWqlChange={onWqlChange} />);

    expect(onWqlChange).toHaveBeenCalledWith('sum:totalVolume');
  });

  it('pivots to metrics when the source pill is changed, dropping time/where and seeding agg/metric', () => {
    const onClausesChange = mock((_c: QueryClause[]) => {});
    const clauses: QueryClause[] = [
      { id: 'c-source', type: 'source', label: 'Source', value: 'notes', inputType: 'select', placeholder: '' },
      { id: 'c-time', type: 'time', label: 'Time Window', value: 'last 2w', inputType: 'select', placeholder: '' },
      { id: 'c-where', type: 'where', label: 'Metric Join', value: 'sum:totalVolume{} > 5000', inputType: 'freetext', placeholder: '' },
      { id: 'c-tag', type: 'tag', label: 'Tag', value: 'hero', inputType: 'select', placeholder: '' },
    ];
    render(<WqlComposer clauses={clauses} onClausesChange={onClausesChange} />);

    fireEvent.click(screen.getByTestId('token-slot-source'));
    const popover = screen.getByTestId('clause-popover-source');

    // Select metrics from the source options.
    const option = Array.from(popover.querySelectorAll('button')).find(b => b.textContent?.toLowerCase().includes('metrics'));
    expect(option).not.toBeUndefined();
    fireEvent.click(option!);

    expect(onClausesChange).toHaveBeenCalledTimes(1);
    const next = onClausesChange.mock.calls[0][0] as QueryClause[];

    // Source became metrics, head seeded.
    expect(next.find(c => c.type === 'source')?.value).toBe('metrics');
    expect(next.find(c => c.type === 'agg')?.value).toBe('sum');
    expect(next.find(c => c.type === 'metric')?.value).toBe('');

    // Content-only clauses are dropped, shared tag filter survives.
    expect(next.find(c => c.type === 'time')).toBeUndefined();
    expect(next.find(c => c.type === 'where')).toBeUndefined();
    expect(next.find(c => c.type === 'tag')?.value).toBe('hero');
  });

  it('removes source/agg/metric pills when no remove button is rendered', () => {
    render(<WqlComposer initialClauses={metricsClauses()} />);
    expect(screen.queryByTestId('token-slot-remove-source')).toBeNull();
    expect(screen.queryByTestId('token-slot-remove-agg')).toBeNull();
    expect(screen.queryByTestId('token-slot-remove-metric')).toBeNull();
  });

  it('shows a filter input for metric selection but not for source selection', () => {
    render(<WqlComposer initialClauses={metricsClauses()} />);

    fireEvent.click(screen.getByTestId('token-slot-source'));
    expect(screen.getByTestId('clause-popover-source').querySelector('input')).toBeNull();
    fireEvent.keyDown(document.activeElement as Element, { key: 'Escape' });

    fireEvent.click(screen.getByTestId('token-slot-metric'));
    expect(screen.getByTestId('clause-popover-metric').querySelector('input')).not.toBeNull();
  });

  it('shows metrics-only filter options in AddFilter when on the metrics plane', () => {
    render(<WqlComposer />);
    fireEvent.click(screen.getByTestId('add-filter-btn'));

    expect(screen.getByText('Time Window')).toBeTruthy();
    expect(screen.getByText('Metric Join')).toBeTruthy();

    expect(screen.queryByText('Group By')).toBeNull();
    expect(screen.queryByText('Rollup')).toBeNull();
    expect(screen.queryByText('Unit')).toBeNull();
  });
});
