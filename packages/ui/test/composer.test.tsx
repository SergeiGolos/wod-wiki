import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { parseQuery } from '@bitcobblers/wod-wiki-wql';
import { WqlComposer } from '../src/composer/WqlComposer';

afterEach(cleanup);

describe('current visible draft actions', () => {
  it('first Run includes pending text without Enter or a debounce', () => {
    const submit = vi.fn();
    render(<WqlComposer initialQuery="find:note{source:journal}" onSubmit={submit} actionLabel="Run" />);
    fireEvent.change(screen.getByLabelText('Search text or WQL'), { target: { value: 'snatch' } });
    fireEvent.click(screen.getByRole('button', { name: /^Run$/ }));
    expect(parseQuery(submit.mock.calls[0][0]).filters).toEqual([
      { key: 'source', negate: false, values: [{ value: 'journal', wildcard: false }] },
      { key: 'text', negate: false, values: [{ value: 'snatch', wildcard: false }] },
    ]);
  });

  it('invalid exact input prevents both button and shortcut submission', () => {
    const submit = vi.fn();
    const change = vi.fn();
    render(<WqlComposer initialQuery="find:note" onSubmit={submit} onQueryChange={change} actionLabel="Apply" />);
    const input = screen.getByLabelText('Search text or WQL');
    fireEvent.change(input, { target: { value: 'find:note{tags:' } });
    expect(change).toHaveBeenLastCalledWith('find:note{tags:');
    fireEvent.click(screen.getByRole('button', { name: /^Apply$/ }));
    fireEvent.keyDown(input, { key: 'Enter', ctrlKey: true });
    expect(submit).not.toHaveBeenCalled();
    expect(screen.getAllByRole('alert')[0].textContent).toBeTruthy();
  });

  it('opening a picker emits no rewrite and starts without an active option', () => {
    const change = vi.fn();
    const query = 'find:segment{effort:snatch}  by {effort} in lb | limit 5';
    render(<WqlComposer initialQuery={query} onQueryChange={change} />);
    fireEvent.click(screen.getByTestId('token-slot-time'));
    expect(change).not.toHaveBeenCalled();
    expect(screen.getByTestId('wql-picker-search').getAttribute('aria-activedescendant')).toBeNull();
  });

  it('Tab remains native and never accepts a completion', () => {
    render(<WqlComposer initialQuery="find:note" />);
    const input = screen.getByLabelText('Search text or WQL');
    fireEvent.change(input, { target: { value: 'has' } });
    expect(fireEvent.keyDown(input, { key: 'Tab' })).toBe(true);
    expect(screen.queryByTestId('token-slot-has')).toBeNull();
  });

  it('explicit completion opens values without inserting an empty filter', () => {
    const change = vi.fn();
    render(<WqlComposer initialQuery="find:note" onQueryChange={change} />);
    fireEvent.click(screen.getByTestId('add-filter-button'));
    fireEvent.click(screen.getByTestId('wql-filter-typeahead-effort'));
    expect(screen.getByTestId('wql-clause-editor')).toBeDefined();
    expect(screen.queryByTestId('token-slot-effort')).toBeNull();
    expect(change).not.toHaveBeenCalled();
  });

  it('keyboard reaches the exact typed action when suggestions remain', () => {
    const change = vi.fn();
    render(<WqlComposer initialQuery="find:note" onQueryChange={change} />);
    fireEvent.click(screen.getByTestId('add-filter-button'));
    fireEvent.click(screen.getByTestId('wql-filter-typeahead-text'));
    const input = screen.getByTestId('wql-picker-search');
    fireEvent.change(input, { target: { value: 'my exact phrase' } });
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(input.getAttribute('aria-activedescendant')).toBeTruthy();
    fireEvent.keyDown(input, { key: 'Enter' });
    const last = change.mock.calls.at(-1);
    if (!last) throw new Error('Exact value did not update the draft');
    expect(parseQuery(last[0]).filters).toEqual([{ key: 'text', negate: false, values: [{ value: 'my exact phrase', wildcard: false }] }]);
  });

  it('external replacement discards pending text without replaying an edit', () => {
    const change = vi.fn();
    const { rerender } = render(<WqlComposer query="find:note" onQueryChange={change} />);
    fireEvent.change(screen.getByLabelText('Search text or WQL'), { target: { value: 'snatch' } });
    change.mockClear();
    rerender(<WqlComposer query="find:block{source:feeds}" onQueryChange={change} />);
    expect(screen.getByLabelText('Search text or WQL').getAttribute('value')).toBe('');
    expect(screen.getByTestId('token-slot-value-target').textContent).toBe('block');
    expect(change).not.toHaveBeenCalled();
  });

  it('returning to an echoed checkpoint clears pending text', () => {
    const change = vi.fn();
    const { rerender } = render(<WqlComposer query="find:note{source:collections}" onQueryChange={change} />);
    fireEvent.change(screen.getByLabelText('Search text or WQL'), { target: { value: 'fresh' } });
    rerender(<WqlComposer query={change.mock.calls.at(-1)![0]} onQueryChange={change} />);
    rerender(<WqlComposer query="find:note{source:collections}" onQueryChange={change} />);
    expect(screen.getByLabelText('Search text or WQL').getAttribute('value')).toBe('');
    expect(screen.queryByTestId('token-slot-text')).toBeNull();
  });

  it('Escape dismisses one picker level without reaching its host', () => {
    const host = vi.fn();
    render(<div onKeyDown={host}><WqlComposer initialQuery="find:note" /></div>);
    fireEvent.click(screen.getByTestId('token-slot-time'));
    fireEvent.keyDown(screen.getByTestId('wql-picker-search'), { key: 'Escape' });
    expect(screen.queryByTestId('wql-clause-editor')).toBeNull();
    expect(host).not.toHaveBeenCalled();
  });

  it('group toggles preserve multiple dimensions and their order', () => {
    const change = vi.fn();
    render(<WqlComposer initialQuery="sum:tis{} by {week, effort}" onQueryChange={change} />);
    fireEvent.click(screen.getByTestId('token-slot-groupby'));
    const input = screen.getByTestId('wql-picker-search');
    fireEvent.change(input, { target: { value: 'session' } });
    fireEvent.click(screen.getByRole('option', { name: /^session$/ }));
    const last = change.mock.calls.at(-1);
    if (!last) throw new Error('Grouping did not update');
    expect(parseQuery(last[0]).groupBy).toEqual(['week', 'effort', 'session']);
    fireEvent.click(screen.getByRole('button', { name: /^Done/ }));
    fireEvent.click(screen.getByTestId('token-slot-groupby'));
    expect(screen.getByTestId('token-slot-value-groupby').textContent).toContain('week|effort|session');
  });

  it('empty Backspace only focuses, then explicit chip removal can be undone', () => {
    const change = vi.fn();
    const query = 'find:note{tags:strength}';
    render(<WqlComposer initialQuery={query} onQueryChange={change} />);
    const input = screen.getByLabelText('Search text or WQL');
    input.focus();
    fireEvent.keyDown(input, { key: 'Backspace' });
    expect(document.activeElement).toBe(screen.getByTestId('token-slot-tag'));
    expect(change).not.toHaveBeenCalled();
    fireEvent.keyDown(document.activeElement!, { key: 'Delete' });
    expect(parseQuery(change.mock.calls.at(-1)![0]).filters).toEqual([]);
    fireEvent.click(screen.getByRole('button', { name: 'Undo removal' }));
    expect(change).toHaveBeenLastCalledWith(query);
  });

  it('requires confirmation before a kind pivot discards presentation pipes', () => {
    const change = vi.fn();
    const query = 'find:segment{effort:snatch} by {effort} in lb | limit 5';
    render(<WqlComposer initialQuery={query} onQueryChange={change} actionLabel="Run" />);
    fireEvent.click(screen.getByTestId('token-slot-kind'));
    fireEvent.click(screen.getByRole('option', { name: 'Measure' }));
    expect(screen.getByRole('alertdialog').textContent).toContain('Presentation pipes');
    expect(change).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.getByTestId('token-slot-value-pipes').textContent).toBe('limit 5');
    expect(change).not.toHaveBeenCalled();
  });

  it('Enter does not submit during IME composition', () => {
    const submit = vi.fn();
    render(<WqlComposer initialQuery="find:note" onSubmit={submit} />);
    fireEvent.keyDown(screen.getByLabelText('Search text or WQL'), { key: 'Enter', ctrlKey: true, isComposing: true });
    expect(submit).not.toHaveBeenCalled();
  });

  it('favorite choices change priority without excluding non-favorites', () => {
    render(<WqlComposer initialQuery="find:note{source:journal}" preferredChoices={['feeds']} />);
    fireEvent.click(screen.getByTestId('token-slot-source'));
    const options = screen.getAllByRole('option');
    expect(options[0].textContent).toContain('Feeds');
    expect(screen.getByRole('option', { name: /Collections/ })).toBeDefined();
    expect(screen.getByRole('option', { name: /Journal/ }).getAttribute('aria-selected')).toBe('true');
  });

  it('untouched unsupported or invalid seed remains in exact WQL text', () => {
    const query = 'find:note{tags:';
    const change = vi.fn();
    render(<WqlComposer initialQuery={query} onQueryChange={change} />);
    expect(screen.getByLabelText('WQL').textContent).toBe(query);
    expect(change).not.toHaveBeenCalled();
  });
});
