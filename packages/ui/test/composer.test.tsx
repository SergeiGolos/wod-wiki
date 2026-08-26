import { describe, expect, it, afterEach  } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import {
  WqlComposer,
  ComposerRegistry,
  clausesToWql,
  wqlToClauses,
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
    // Canonical contract: notes scope compiles `in all`, time clause rides along.
    expect(wql).toBe('find:note in all last 2w');
  });

  it('compiles metrics clauses to aggregate WQL', () => {
    const clauses = defaultMetricsClauses();
    clauses[2].value = 'totalVolume';
    const wql = clausesToWql(clauses);
    // Canonical contract: empty filter braces are omitted.
    expect(wql).toBe('sum:totalVolume');
  });

  it('diagnoses valid and invalid clauses', () => {
    const valid = defaultClauses();
    const diag = diagnoseClauses(valid);
    expect(diag.valid).toBe(true);
    expect(diag.wql).toBe('find:note in all last 2w');
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

  it('rejects duplicate-suffix queries instead of truncating (C3)', () => {
    expect(wqlToClauses('find:note{tags:pr} in journal in feeds')).toBeNull();
  });

  it('rejects windowed aggregates — the metrics plane has no time slot (C1)', () => {
    // Otherwise apply would rewrite `sum:tis{} last 6w` as `sum:tis{}`,
    // silently deleting the window.
    expect(wqlToClauses('sum:tis{} last 6w')).toBeNull();
    expect(wqlToClauses('sum:tis{} from 2026-01-01')).toBeNull();
  });
});
