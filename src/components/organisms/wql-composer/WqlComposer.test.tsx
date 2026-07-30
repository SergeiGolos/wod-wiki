/**
 * WqlComposer — shared omni command bar (issue #829).
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
 */

import { useState } from 'react';
import { afterEach, describe, expect, it, mock } from 'bun:test';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

import { WqlComposer, type WqlValidationState } from './WqlComposer';
import { defaultClauses, type QueryClause } from './queryClauses';

afterEach(cleanup);

const emptyTagClause = (): QueryClause[] => [
  ...defaultClauses(),
  { id: 'c-tag', type: 'tag', label: 'Tag', value: '', inputType: 'select', placeholder: 'Pick tag...' },
];

describe('WqlComposer', () => {
  it('renders token pills and shows placeholder guidance for empty clauses', () => {
    render(<WqlComposer initialClauses={emptyTagClause()} />);

    // Valued pills show prefix + value
    expect(screen.getByTestId('token-slot-target').textContent).toContain('note');
    expect(screen.getByTestId('token-slot-scope').textContent).toContain('journal');

    // Empty pill falls back to the placeholder guidance text
    expect(screen.getByTestId('token-slot-tag').textContent).toContain('tags: [tag]');
  });

  it('emits wql, validation, and AST callbacks on mount', () => {
    const onWqlChange = mock((_wql: string) => {});
    const onValidationChange = mock((_s: WqlValidationState) => {});
    const onAstChange = mock((_ast: unknown) => {});

    render(
      <WqlComposer
        onWqlChange={onWqlChange}
        onValidationChange={onValidationChange}
        onAstChange={onAstChange}
      />,
    );

    expect(onWqlChange).toHaveBeenCalledWith('find:note in journal last 2w');
    expect(onValidationChange).toHaveBeenCalledWith({ valid: true });
    expect(onAstChange).toHaveBeenCalled();
    const ast = onAstChange.mock.calls[0][0] as any;
    expect(ast.target).toBe('note');
    expect(ast.scope).toBe('journal');
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
    expect(onWqlChange).toHaveBeenLastCalledWith('find:note{text:Fran} in journal last 2w');
  });

  it('supports keyboard-only option selection: Enter opens, Up/Down cycles, Enter selects, Escape dismisses', () => {
    render(<WqlComposer />);

    const target = screen.getByTestId('token-slot-target');
    target.focus();

    // Enter opens the popover and moves focus into it
    fireEvent.keyDown(target, { key: 'Enter' });
    const popover = screen.getByTestId('clause-popover-target');
    expect(document.activeElement).toBe(popover);

    // ArrowDown then Enter selects the second option ("block")
    fireEvent.keyDown(document.activeElement as Element, { key: 'ArrowDown' });
    fireEvent.keyDown(document.activeElement as Element, { key: 'Enter' });
    expect(screen.getByTestId('token-slot-target').textContent).toContain('block');

    // Re-open and Escape dismisses
    fireEvent.keyDown(target, { key: 'Enter' });
    expect(screen.queryByTestId('clause-popover-target')).not.toBeNull();
    fireEvent.keyDown(document.activeElement as Element, { key: 'Escape' });
    expect(screen.queryByTestId('clause-popover-target')).toBeNull();
  });

  it('does not loop when consumers pass inline change handlers', () => {
    // Maximum update depth would blow up if the emit effect depended on
    // callback identity.
    function Harness() {
      const [ast, setAst] = useState<unknown>(null);
      return (
        <>
          <WqlComposer onAstChange={a => setAst(a)} />
          <span data-testid="ast-kind">{ast ? (ast as any).target : 'none'}</span>
        </>
      );
    }
    render(<Harness />);
    expect(screen.getByTestId('ast-kind').textContent).toBe('note');
  });

  it('keeps every slot pill tabbable for Tab / Shift+Tab traversal', () => {
    render(<WqlComposer />);
    for (const testid of ['token-slot-target', 'token-slot-scope', 'token-slot-time']) {
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
});
