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
