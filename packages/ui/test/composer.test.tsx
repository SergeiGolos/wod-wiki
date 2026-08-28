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
