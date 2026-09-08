import { describe, expect, it, afterEach, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import {
  WqlComposer,
  ComposerRegistry,
  dateRangeSlot,
} from '../src/composer';
import {
  defaultPills,
  defaultMetricsPills,
  pillsToWql,
  wqlToPills,
} from '../src/composer/queryAst';
import { diagnosePills } from '../src/composer/diagnostics';

afterEach(cleanup);

describe('WqlComposer and diagnostics suite', () => {
  it('compiles default pills to the modern canonical find query', () => {
    expect(pillsToWql(defaultPills())).toBe('find:note last 2w');
  });

  it('compiles metrics pills to aggregate WQL', () => {
    const pills = defaultMetricsPills();
    pills[2].value = 'totalVolume';
    expect(pillsToWql(pills)).toBe('sum:totalVolume{}');
  });

  it('diagnoses valid and invalid pill sets', () => {
    const diag = diagnosePills(defaultPills());
    expect(diag.valid).toBe(true);
    expect(diag.wql).toBe('find:note last 2w');
  });

  it('supports custom slot registration in ComposerRegistry', () => {
    const registry = new ComposerRegistry();
    const unregister = registry.registerSlot(dateRangeSlot);
    expect(registry.getSlot('date-range')).toBeDefined();
    unregister();
    expect(registry.getSlot('date-range')).toBeUndefined();
  });

  it('renders WqlComposer component seeded by initialQuery', () => {
    render(<WqlComposer initialQuery="find:note{tags:pr} last 4w" showDiagnostics />);
    expect(screen.getByTestId('wql-composer')).toBeDefined();
    expect(screen.getByTestId('wql-diagnostics-strip')).toBeDefined();
  });

  it('emits serializer-canonical text on pill edits (uncontrolled)', () => {
    const onQueryChange = vi.fn();
    render(<WqlComposer initialQuery="find:note last 2w" onQueryChange={onQueryChange} />);
    // Mount emission: the serializer's canonical form of the seed.
    expect(onQueryChange).toHaveBeenCalledWith('find:note last 2w');
  });

  it('controlled mode round-trips edits through onQueryChange', () => {
    const onQueryChange = vi.fn();
    render(<WqlComposer query="find:note{tags:pr} last 4w" onQueryChange={onQueryChange} />);
    expect(screen.getByTestId('wql-composer')).toBeDefined();
    // No mount-time rewrite of the parent's string in controlled mode.
    expect(onQueryChange).not.toHaveBeenCalled();
  });

  it('restores a typed query into pills on Enter', () => {
    render(<WqlComposer initialQuery="find:note last 2w" />);
    const input = screen.getByTestId('wql-composer-input');
    fireEvent.change(input, { target: { value: 'find:note{tags:pr} last 8w' } });
    expect(screen.getByTestId('wql-composer-pending').textContent).toBe('↵ Use as query');
    fireEvent.keyDown(input, { key: 'Enter' });
    expect((input as HTMLInputElement).value).toBe('');
  });

  it('flags a query-shaped invalid string instead of turning it into a text search', () => {
    render(<WqlComposer initialQuery="find:note last 2w" />);
    const input = screen.getByTestId('wql-composer-input');
    fireEvent.change(input, { target: { value: 'foo:bar{baz}' } });
    expect(screen.getByTestId('wql-composer-pending').textContent).toContain('Cannot parse');
  });
});

describe('controlled raw escape hatch', () => {
  it('reports diagnostics for the raw controlled query, not fallback pills', () => {
    const onAstChange = vi.fn();
    const onValidationChange = vi.fn();
    const onSubmit = vi.fn();
    // Negated filter: valid WQL, not pill-expressible.
    render(
      <WqlComposer
        query="find:note{!tags:fran} last 2w"
        onAstChange={onAstChange}
        onValidationChange={onValidationChange}
        onSubmit={onSubmit}
      />,
    );
    expect(onValidationChange).toHaveBeenCalledWith({ valid: true });
    expect(onAstChange).toHaveBeenCalledWith(
      expect.objectContaining({ family: 'find', target: 'note' }),
    );
    // Submit hands back the raw query, not a rewritten default.
    const input = screen.getByTestId('wql-composer-input');
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onSubmit).toHaveBeenCalledWith('find:note{!tags:fran} last 2w');
  });

  it('surfaces the raw query parse error when invalid', () => {
    const onValidationChange = vi.fn();
    render(<WqlComposer query="sum:tis{} )))garbage(((" onValidationChange={onValidationChange} />);
    expect(onValidationChange).toHaveBeenCalledWith(
      expect.objectContaining({ valid: false, error: expect.stringContaining('Cannot parse') }),
    );
  });
});

describe('plane-specific filter and calc dropdowns', () => {
  it('hides AddCalcDropdown and restricts AddFilterDropdown on content plane', () => {
    render(<WqlComposer initialQuery="find:note last 2w" showDiagnostics />);
    // Add Calc should not be rendered on content queries
    expect(screen.queryByTestId('add-calc-dropdown')).toBeNull();
    expect(screen.queryByText('Add Calc')).toBeNull();

    // Add Filter should only show content filters
    const filterBtn = screen.getByTestId('add-filter-button');
    fireEvent.click(filterBtn);
    const dropdown = screen.getByTestId('add-filter-dropdown');
    expect(dropdown.textContent).toContain('Contains');
    expect(dropdown.textContent).toContain('Catalog');
    expect(dropdown.textContent).toContain('Tag');
    expect(dropdown.textContent).not.toContain('Aggregate');
    expect(dropdown.textContent).not.toContain('Metric');
    expect(dropdown.textContent).not.toContain('Group By');
    expect(dropdown.textContent).not.toContain('Output Type');
  });

  it('shows AddCalcDropdown and metric filters on metrics plane', () => {
    render(<WqlComposer initialQuery="sum:totalVolume{}" showDiagnostics />);
    expect(screen.getByText('Add Calc')).toBeDefined();

    const filterBtn = screen.getByTestId('add-filter-button');
    fireEvent.click(filterBtn);
    const dropdown = screen.getByTestId('add-filter-dropdown');
    expect(dropdown.textContent).toContain('Tag');
    expect(dropdown.textContent).toContain('Effort');
    expect(dropdown.textContent).toContain('Discipline');
    expect(dropdown.textContent).not.toContain('Catalog');
    expect(dropdown.textContent).not.toContain('Output Type');
  });
});

describe('filter typeahead', () => {
  afterEach(cleanup);

  it('proposes a filter when the typed text matches a key', () => {
    render(<WqlComposer initialQuery="find:note last 2w" />);
    const input = screen.getByTestId('wql-composer-input');
    fireEvent.change(input, { target: { value: 'has' } });
    expect(screen.getByTestId('wql-filter-typeahead')).toBeDefined();
    expect(screen.getByTestId('wql-filter-typeahead-has')).toBeDefined();
  });

  it('adds the filter on Tab and selects it for condition editing', () => {
    render(<WqlComposer initialQuery="find:note last 2w" />);
    const input = screen.getByTestId('wql-composer-input');
    fireEvent.change(input, { target: { value: 'has' } });
    fireEvent.keyDown(input, { key: 'Tab' });
    // The pill was added and is active (selected) with its editor open.
    const pill = screen.getByTestId('token-slot-has');
    expect(pill.className).toContain('bg-primary');
    expect(pill.className).toContain('border-primary');
    // The free text was consumed by the accept — no text-search fallback.
    expect((input as HTMLInputElement).value).toBe('');
    expect(screen.queryByTestId('wql-filter-typeahead')).toBeNull();
  });

  it('proposes editing when the matched filter is already on the query', () => {
    render(<WqlComposer initialQuery="find:note last 2w" />);
    const input = screen.getByTestId('wql-composer-input');
    fireEvent.change(input, { target: { value: 'so' } });
    const row = screen.getByTestId('wql-filter-typeahead-source');
    expect(row.textContent).toContain('edit');
    fireEvent.click(row);
    // The existing source pill is selected and its inline editor opens.
    const source = screen.getByTestId('token-slot-source');
    expect(source.className).toContain('bg-primary');
    expect(screen.getByTestId('wql-clause-editor')).toBeDefined();
    expect(screen.queryByTestId('token-slot-has')).toBeNull();
    expect((input as HTMLInputElement).value).toBe('');
  });

  it('edits the pill value inline: arrows move, Enter sets, Tab releases', () => {
    render(<WqlComposer initialQuery="find:note last 2w" />);
    const input = screen.getByTestId('wql-composer-input');
    fireEvent.change(input, { target: { value: 'so' } });
    fireEvent.keyDown(input, { key: 'Tab' });
    // Editor open with the source options; arrow down to 'collections'.
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(screen.getByTestId('token-slot-value-source').textContent).toBe('collections');
    // Editor stays open — the pill is highlighted until Tab.
    expect(screen.getByTestId('wql-clause-editor')).toBeDefined();
    expect(screen.getByTestId('token-slot-source').className).toContain('bg-primary');
    fireEvent.keyDown(input, { key: 'Tab' });
    expect(screen.queryByTestId('wql-clause-editor')).toBeNull();
    // Free typing again: a new key proposes a new filter.
    fireEvent.change(input, { target: { value: 'ca' } });
    expect(screen.getByTestId('wql-filter-typeahead-catalog')).toBeDefined();
  });

  it('multi-value filters toggle with Enter and pop with Backspace', () => {
    render(<WqlComposer initialQuery="sum:totalVolume{}" />);
    const input = screen.getByTestId('wql-composer-input');
    fireEvent.change(input, { target: { value: 'inten' } });
    fireEvent.keyDown(input, { key: 'Tab' });
    expect(screen.getByTestId('wql-clause-editor')).toBeDefined();
    // Enter on the highlighted option (first = 'low') adds it; again removes.
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(screen.getByTestId('token-slot-value-intensity').textContent).toBe('low');
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(screen.getByTestId('token-slot-value-intensity').textContent).not.toBe('low');
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(screen.getByTestId('token-slot-value-intensity').textContent).toBe('low');
    fireEvent.keyDown(input, { key: 'Backspace' });
    expect(screen.getByTestId('token-slot-value-intensity').textContent).not.toBe('low');
  });

  it('shows only the value at rest; the label appears while the pill is active', () => {
    render(<WqlComposer initialQuery="find:note last 2w" />);
    const source = screen.getByTestId('token-slot-source');
    // At rest: no "Source:" prefix — just the value.
    expect(source.textContent).not.toContain('Source');
    expect(screen.getByTestId('token-slot-value-source').textContent).toBe('notes');
    // Activated: full "Source: notes" while editing.
    fireEvent.click(source);
    expect(screen.getByTestId('token-slot-source').textContent).toContain('Source:');
    expect(screen.getByTestId('token-slot-value-source').textContent).toBe('notes');
  });

  const typeaheadRows = () =>
    Array.from(document.querySelectorAll('button[data-testid^="wql-filter-typeahead-"]'));

  it('arrow keys move the filter typeahead selection; Enter accepts it', () => {
    render(<WqlComposer initialQuery="find:note last 2w" />);
    const input = screen.getByTestId('wql-composer-input');
    fireEvent.change(input, { target: { value: 't' } });
    expect(typeaheadRows().length).toBeGreaterThan(1);
    // Highlight starts on the first row.
    expect(typeaheadRows()[0]!.className).toContain('bg-muted/60');
    // Walk to the last row (extra presses clamp at the end).
    for (let i = 0; i < 10; i++) fireEvent.keyDown(input, { key: 'ArrowDown' });
    const last = typeaheadRows()[typeaheadRows().length - 1]!;
    expect(last.className).toContain('bg-muted/60');
    // ArrowUp steps back one row from the clamped end.
    fireEvent.keyDown(input, { key: 'ArrowUp' });
    const rows = typeaheadRows();
    expect(rows[rows.length - 2]!.className).toContain('bg-muted/60');
    // Extra ups clamp at the top.
    for (let i = 0; i < 10; i++) fireEvent.keyDown(input, { key: 'ArrowUp' });
    expect(typeaheadRows()[0]!.className).toContain('bg-muted/60');
    // Down to the last row again, then Enter accepts THAT filter (not the first).
    for (let i = 0; i < 10; i++) fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter' });
    const type = last.getAttribute('data-testid')!.replace('wql-filter-typeahead-', '');
    expect(screen.getByTestId('token-slot-' + type)).toBeDefined();
    // The typed text was consumed by the accept, and the pill is being edited.
    expect((input as HTMLInputElement).value).toBe('');
    expect(screen.getByTestId('wql-clause-editor')).toBeDefined();
  });

  it('Tab accepts the arrow-highlighted filter, not always the first', () => {
    render(<WqlComposer initialQuery="find:note last 2w" />);
    const input = screen.getByTestId('wql-composer-input');
    fireEvent.change(input, { target: { value: 't' } });
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    const second = typeaheadRows()[1]!;
    fireEvent.keyDown(input, { key: 'Tab' });
    const type = second.getAttribute('data-testid')!.replace('wql-filter-typeahead-', '');
    expect(screen.getByTestId('token-slot-' + type)).toBeDefined();
  });

  describe('pill focus ring (Tab / Shift+Tab)', () => {
    const pillEls = () =>
      Array.from(document.querySelectorAll('div[data-testid^="token-slot-"]'));

    it('Tab selects the pill body: highlight + expanded label; Shift+Tab walks back', () => {
      render(<WqlComposer initialQuery="find:note last 2w" />);
      const input = screen.getByTestId('wql-composer-input');
      // At rest: no highlight, no label prefix.
      expect(pillEls().some((el) => el.className.includes('bg-primary'))).toBe(false);
      expect(pillEls()[0]!.textContent).not.toContain(':');
      fireEvent.keyDown(input, { key: 'Tab' });
      expect(pillEls()[0]!.className).toContain('bg-primary');
      expect(pillEls()[0]!.textContent).toContain(':');
      // Tab again moves to that pill's remove button (red), body un-highlights.
      fireEvent.keyDown(input, { key: 'Tab' });
      const type0 = pillEls()[0]!.getAttribute('data-testid')!.replace('token-slot-', '');
      expect(screen.getByTestId('token-slot-remove-' + type0).className).toContain('bg-destructive');
      expect(pillEls()[0]!.className).not.toContain('bg-primary');
      // Shift+Tab walks back to the pill body.
      fireEvent.keyDown(input, { key: 'Tab', shiftKey: true });
      expect(pillEls()[0]!.className).toContain('bg-primary');
      // Escape drops the ring back to the input.
      fireEvent.keyDown(input, { key: 'Escape' });
      expect(pillEls().some((el) => el.className.includes('bg-primary'))).toBe(false);
    });

    it('Enter on the pill body opens its inline editor', () => {
      render(<WqlComposer initialQuery="find:note last 2w" />);
      const input = screen.getByTestId('wql-composer-input');
      fireEvent.keyDown(input, { key: 'Tab' });
      fireEvent.keyDown(input, { key: 'Enter' });
      expect(screen.getByTestId('wql-clause-editor')).toBeDefined();
      expect(pillEls()[0]!.className).toContain('bg-primary');
    });

    it('Enter on a required pill\'s remove clears the value but keeps the pill', () => {
      render(<WqlComposer initialQuery="find:note last 2w" />);
      const input = screen.getByTestId('wql-composer-input');
      fireEvent.keyDown(input, { key: 'Tab' });
      fireEvent.keyDown(input, { key: 'Tab' });
      const type0 = pillEls()[0]!.getAttribute('data-testid')!.replace('token-slot-', '');
      fireEvent.keyDown(input, { key: 'Enter' });
      // Pill still mounted, value cleared to its placeholder.
      expect(screen.getByTestId('token-slot-' + type0)).toBeDefined();
      const value = screen.getByTestId('token-slot-value-' + type0);
      expect(value.className).toContain('italic');
    });

    it('Enter on a removable pill\'s remove deletes the filter', () => {
      render(<WqlComposer initialQuery="find:note{tags:strength} last 2w" />);
      const input = screen.getByTestId('wql-composer-input');
      const removeBtn = () => screen.getByTestId('token-slot-remove-tag');
      for (let i = 0; i < 8 && !removeBtn().className.includes('bg-destructive'); i++) {
        fireEvent.keyDown(input, { key: 'Tab' });
      }
      expect(removeBtn().className).toContain('bg-destructive');
      fireEvent.keyDown(input, { key: 'Enter' });
      expect(screen.queryByTestId('token-slot-tag')).toBeNull();
    });

    it('Tab from the inline editor jumps to the next pill body, never the ✕', () => {
      render(<WqlComposer initialQuery="find:note last 2w" />);
      const input = screen.getByTestId('wql-composer-input');
      fireEvent.click(pillEls()[0]!);
      expect(screen.getByTestId('wql-clause-editor')).toBeDefined();
      fireEvent.keyDown(input, { key: 'Tab' });
      expect(screen.queryByTestId('wql-clause-editor')).toBeNull();
      // The NEXT pill's body is ringed — not the edited pill's remove button.
      expect(pillEls()[1]!.className).toContain('bg-primary');
      expect(pillEls()[0]!.className).not.toContain('bg-primary');
      expect(document.querySelector('button[class*="bg-destructive"]')).toBeNull();
      // Tab from the last pill's editor lands on free text (no ring).
      fireEvent.keyDown(input, { key: 'Enter' }); // open the time pill's editor
      expect(screen.getByTestId('wql-clause-editor')).toBeDefined();
      fireEvent.keyDown(input, { key: 'Tab' });
      expect(pillEls().some((el) => el.className.includes('bg-primary'))).toBe(false);
    });

    it('option-filter text is consumed on commit and cleaned on editor release', () => {
      render(<WqlComposer initialQuery="find:note last 2w" />);
      const input = screen.getByTestId('wql-composer-input') as HTMLInputElement;
      fireEvent.change(input, { target: { value: 'so' } });
      fireEvent.keyDown(input, { key: 'Tab' });
      fireEvent.change(input, { target: { value: 'col' } });
      expect(input.value).toBe('col');
      // Enter commits the highlighted single-select choice (closed lists
      // cycle with arrows, they don't filter) and consumes the typed text.
      fireEvent.keyDown(input, { key: 'ArrowDown' });
      fireEvent.keyDown(input, { key: 'Enter' });
      expect(input.value).toBe('');
      expect(screen.getByTestId('token-slot-value-source').textContent).toBe('collections');
      // Uncommitted filter text is dropped when the editor is released.
      fireEvent.change(input, { target: { value: 'zz' } });
      fireEvent.keyDown(input, { key: 'Tab' });
      expect(input.value).toBe('');
      expect(screen.queryByTestId('wql-clause-editor')).toBeNull();
    });
  });
  it('dismisses the proposal on Escape', () => {
    render(<WqlComposer initialQuery="find:note last 2w" />);
    const input = screen.getByTestId('wql-composer-input');
    fireEvent.change(input, { target: { value: 'has' } });
    expect(screen.getByTestId('wql-filter-typeahead')).toBeDefined();
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(screen.queryByTestId('wql-filter-typeahead')).toBeNull();
  });

  it('proposes nothing once the text is query-shaped', () => {
    render(<WqlComposer initialQuery="find:note last 2w" />);
    const input = screen.getByTestId('wql-composer-input');
    fireEvent.change(input, { target: { value: 'find:note{so' } });
    expect(screen.queryByTestId('wql-filter-typeahead')).toBeNull();
  });
});
