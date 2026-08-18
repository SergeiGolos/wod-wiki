import { describe, expect, it, afterEach } from 'bun:test';
import { cleanup, render, screen } from '@testing-library/react';
import {
  WqlComposer,
  ComposerRegistry,
  clausesToWql,
  defaultClauses,
  defaultMetricsClauses,
  diagnoseClauses,
  dateRangeSlot,
} from '../src/composer';

afterEach(cleanup);

describe('WqlComposer and diagnostics suite', () => {
  it('compiles default clauses to WQL find query', () => {
    const clauses = defaultClauses();
    const wql = clausesToWql(clauses);
    expect(wql).toBe('find:note in journal');
  });

  it('compiles metrics clauses to aggregate WQL', () => {
    const clauses = defaultMetricsClauses();
    clauses[2].value = 'totalVolume';
    const wql = clausesToWql(clauses);
    expect(wql).toBe('sum:totalVolume{}');
  });

  it('diagnoses valid and invalid clauses', () => {
    const valid = defaultClauses();
    expect(diagnoseClauses(valid).valid).toBe(true);
  });

  it('supports custom slot registration in ComposerRegistry', () => {
    const registry = new ComposerRegistry();
    const unregister = registry.registerSlot(dateRangeSlot);
    expect(registry.getSlot('date-range')).toBeDefined();
    unregister();
    expect(registry.getSlot('date-range')).toBeUndefined();
  });

  it('renders WqlComposer component', () => {
    render(<WqlComposer initialClauses={defaultClauses()} showDiagnostics />);
    expect(screen.getByTestId('wql-composer')).toBeDefined();
    expect(screen.getByTestId('wql-diagnostics-strip')).toBeDefined();
  });
});
