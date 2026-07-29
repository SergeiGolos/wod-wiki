import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import {
  AnalyticsUnitPreference,
  useAnalyticsUnitPreference,
  ANALYTICS_UNIT_STORAGE_KEY,
  DEFAULT_ANALYTICS_UNIT,
  getEffectiveAnalyticsUnit,
  getDashboardEffectiveUnit,
} from './useAnalyticsUnitPreference';

afterEach(() => {
  cleanup();
  localStorage.clear();
});

beforeEach(() => {
  localStorage.clear();
});

function CurrentUnit() {
  const { unit } = useAnalyticsUnitPreference();
  return <span data-testid="current-unit">{unit}</span>;
}

describe('useAnalyticsUnitPreference', () => {
  it('defaults to kg when no preference is stored', () => {
    render(<CurrentUnit />);
    expect(screen.getByTestId('current-unit').textContent).toBe('kg');
  });

  it('reads the persisted preference', () => {
    localStorage.setItem(ANALYTICS_UNIT_STORAGE_KEY, 'lb');
    render(<CurrentUnit />);
    expect(screen.getByTestId('current-unit').textContent).toBe('lb');
  });

  it('ignores invalid stored values', () => {
    localStorage.setItem(ANALYTICS_UNIT_STORAGE_KEY, 'oz');
    render(<CurrentUnit />);
    expect(screen.getByTestId('current-unit').textContent).toBe(DEFAULT_ANALYTICS_UNIT);
  });
});

describe('AnalyticsUnitPreference', () => {
  it('renders kg and lb buttons and toggles the stored preference', () => {
    render(<AnalyticsUnitPreference />);
    const kg = screen.getByText('kg');
    const lb = screen.getByText('lb');
    expect(kg).toBeDefined();
    expect(lb).toBeDefined();
    expect(kg.className).toContain('bg-primary');
    expect(lb.className).not.toContain('bg-primary');

    fireEvent.click(lb);
    expect(localStorage.getItem(ANALYTICS_UNIT_STORAGE_KEY)).toBe('lb');
    expect(lb.className).toContain('bg-primary');
    expect(kg.className).not.toContain('bg-primary');
  });

  it('reflects an externally provided unit without changing storage', () => {
    localStorage.setItem(ANALYTICS_UNIT_STORAGE_KEY, 'lb');
    render(<AnalyticsUnitPreference unit="kg" />);
    expect(screen.getByText('kg').className).toContain('bg-primary');
    expect(screen.getByText('lb').className).not.toContain('bg-primary');
    expect(localStorage.getItem(ANALYTICS_UNIT_STORAGE_KEY)).toBe('lb');
  });

  it('disables the toggle and shows a hint when the unit is forced by a directive', () => {
    render(<AnalyticsUnitPreference unit="kg" forced />);
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBe(2);
    for (const button of buttons) {
      expect((button as HTMLButtonElement).disabled).toBe(true);
      expect(button.className).toContain('cursor-not-allowed');
    }
    expect(screen.getByText('unit set by query')).toBeDefined();
    expect(screen.getByText('kg').className).toContain('bg-primary');
  });
});

describe('getEffectiveAnalyticsUnit', () => {
  it('overrides the preference with an active kg directive', () => {
    const result = getEffectiveAnalyticsUnit('sum:totalVolume{} by {effort} in kg', 'lb');
    expect(result).toEqual({ unit: 'kg', forced: true });
  });

  it('overrides the preference with an active lb directive', () => {
    const result = getEffectiveAnalyticsUnit('sum:totalVolume{} in lb', 'kg');
    expect(result).toEqual({ unit: 'lb', forced: true });
  });

  it('falls back to the preference when no directive is present', () => {
    expect(getEffectiveAnalyticsUnit('sum:totalVolume{} by {effort}', 'lb')).toEqual({ unit: 'lb', forced: false });
    expect(getEffectiveAnalyticsUnit('sum:totalVolume{}', 'kg')).toEqual({ unit: 'kg', forced: false });
  });

  it('falls back to the preference for non-toggleable directives', () => {
    expect(getEffectiveAnalyticsUnit('sum:totalReps{} in reps', 'kg')).toEqual({ unit: 'kg', forced: false });
  });
});

describe('getDashboardEffectiveUnit', () => {
  it('forces the unit when all widgets share the same kg/lb directive', () => {
    const queries = [
      { key: 'a', query: 'sum:totalVolume{} in kg' },
      { key: 'b', query: 'sum:totalVolume{} by {effort} in kg' },
    ];
    expect(getDashboardEffectiveUnit(queries, 'lb')).toEqual({ unit: 'kg', forced: true });
  });

  it('falls back to the preference when no widgets have a directive', () => {
    expect(getDashboardEffectiveUnit([{ key: 'a', query: 'sum:totalVolume{}' }], 'lb')).toEqual({
      unit: 'lb',
      forced: false,
    });
  });

  it('falls back to the preference when directives are mixed', () => {
    const queries = [
      { key: 'a', query: 'sum:totalVolume{} in kg' },
      { key: 'b', query: 'sum:totalVolume{} in lb' },
    ];
    expect(getDashboardEffectiveUnit(queries, 'lb')).toEqual({ unit: 'lb', forced: false });
  });

  it('ignores non-toggleable directives', () => {
    const queries = [
      { key: 'a', query: 'sum:totalReps{} in reps' },
      { key: 'b', query: 'sum:totalVolume{} in kg' },
    ];
    expect(getDashboardEffectiveUnit(queries, 'lb')).toEqual({ unit: 'kg', forced: true });
  });
});
