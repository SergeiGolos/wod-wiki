import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useQueryComposerState } from './useQueryComposerState';

describe('useQueryComposerState', () => {
  it('initializes with default query state when empty', () => {
    const { result } = renderHook(() => useQueryComposerState(''));
    expect(result.current.agg).toBe('sum');
    expect(result.current.metric).toBe('totalVolume');
    expect(result.current.filters).toEqual([]);
    expect(result.current.groupBy).toBe('');
    expect(result.current.rollup).toBe('');
    expect(result.current.query).toBe('sum:totalVolume{}');
  });

  it('parses initial WQL query correctly', () => {
    const { result } = renderHook(() =>
      useQueryComposerState('avg:tis{effort:thruster,!discipline:recovery} by {week}.rollup(1w)'),
    );
    expect(result.current.agg).toBe('avg');
    expect(result.current.metric).toBe('tis');
    expect(result.current.filters).toEqual([
      { key: 'effort', value: 'thruster', negate: false },
      { key: 'discipline', value: 'recovery', negate: true },
    ]);
    expect(result.current.groupBy).toBe('week');
    expect(result.current.rollup).toBe('1w');
    expect(result.current.streamGrain).toBe('summary');
    expect(result.current.humanTranslation).toContain('average of time-in-motion (seconds)');
  });

  it('updates query string when setters are called', () => {
    const onChange = vi.fn();
    const { result } = renderHook(() => useQueryComposerState('sum:totalVolume{}', onChange));

    act(() => {
      result.current.setAgg('avg');
    });
    expect(result.current.query).toBe('avg:totalVolume{}');
    expect(onChange).toHaveBeenLastCalledWith('avg:totalVolume{}');

    act(() => {
      result.current.setMetric('tis');
    });
    expect(result.current.query).toBe('avg:tis{}');

    act(() => {
      result.current.addFilter({ key: 'discipline', value: 'strength', negate: false });
    });
    expect(result.current.query).toBe('avg:tis{discipline:strength}');

    act(() => {
      result.current.setGroupBy('week');
    });
    expect(result.current.query).toBe('avg:tis{discipline:strength} by {week}');

    act(() => {
      result.current.setRollup('1w');
    });
    expect(result.current.query).toBe('avg:tis{discipline:strength} by {week}.rollup(1w)');
  });

  it('updates visual state when raw query setQuery is called', () => {
    const { result } = renderHook(() => useQueryComposerState('sum:totalVolume{}'));

    act(() => {
      result.current.setQuery('last:sessionLoad{note:benchmark} by {session}');
    });

    expect(result.current.agg).toBe('last');
    expect(result.current.metric).toBe('sessionLoad');
    expect(result.current.filters).toEqual([{ key: 'note', value: 'benchmark', negate: false }]);
    expect(result.current.groupBy).toBe('session');
    expect(result.current.rollup).toBe('');
  });

  it('identifies stream grain correctly', () => {
    const { result: summaryResult } = renderHook(() => useQueryComposerState('sum:totalVolume{}'));
    expect(summaryResult.current.streamGrain).toBe('summary');

    const { result: rollupResult } = renderHook(() => useQueryComposerState('avg:calc.acwr{}.rollup(1d)'));
    expect(rollupResult.current.streamGrain).toBe('rollup');

    const { result: segmentResult } = renderHook(() => useQueryComposerState('avg:pace{}'));
    expect(segmentResult.current.streamGrain).toBe('segment');
  });
});
