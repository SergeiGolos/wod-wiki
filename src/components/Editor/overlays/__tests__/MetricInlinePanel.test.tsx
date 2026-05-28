import { afterEach, describe, expect, it, mock } from 'bun:test';
import { cleanup, render, screen } from '@testing-library/react';
import { MetricType } from '@/core/models/Metric';
import type { IMetric } from '@/core/models/Metric';
import type { ICodeStatement } from '@/core/models/CodeStatement';
import type { EditorSection } from '../../extensions/section-state';

// Mock the cursor-focus-panel module before importing the component
mock.module('../../extensions/cursor-focus-panel', () => ({
  getCursorFocusState: mock(() => null),
}));

const { MetricInlinePanel } = await import('../MetricInlinePanel');
const { getCursorFocusState } = await import('../../extensions/cursor-focus-panel');

function makeStatement(metrics: IMetric[]): ICodeStatement {
  return {
    id: 'test-stmt',
    line: 1,
    raw: 'test',
    metrics,
    tags: [],
  } as unknown as ICodeStatement;
}

function makeSection(): EditorSection {
  return {
    id: 'test-section',
    type: 'wod',
    from: 0,
    to: 20,
    contentFrom: 5,
    contentTo: 15,
    startLine: 1,
    endLine: 2,
  };
}

function createMockView() {
  return {
    coordsAtPos: () => ({ bottom: 100, left: 0 }),
    contentDOM: {
      getBoundingClientRect: () => ({ left: 0, width: 500 }),
    },
    state: {} as any,
  };
}

describe('MetricInlinePanel ADR-0009 regressions', () => {
  afterEach(() => {
    cleanup();
    (getCursorFocusState as any).mockClear?.();
  });

  it('renders custom metric chips inline', () => {
    const view = createMockView();
    const statement = makeStatement([
      { type: MetricType.Custom, value: 'Zone 2', image: 'Zone 2', origin: 'parser' } as IMetric,
    ]);
    const section = makeSection();

    (getCursorFocusState as any).mockReturnValue({
      section,
      statement,
      cursorLine: 1,
      lineFrom: 0,
      lineTo: 10,
      focusedMetric: null,
    });

    render(<MetricInlinePanel view={view as any} cursorVersion={1} />);

    expect(screen.getByText('custom')).toBeDefined();
    expect(screen.getByText('Zone 2')).toBeDefined();
  });

  it('renders calculated metric chips inline', () => {
    const view = createMockView();
    const statement = makeStatement([
      { type: MetricType.Calculated, value: 420, image: '420', origin: 'runtime' } as IMetric,
    ]);
    const section = makeSection();

    (getCursorFocusState as any).mockReturnValue({
      section,
      statement,
      cursorLine: 1,
      lineFrom: 0,
      lineTo: 10,
      focusedMetric: null,
    });

    render(<MetricInlinePanel view={view as any} cursorVersion={1} />);

    expect(screen.getByText('calculated')).toBeDefined();
    expect(screen.getByText('420')).toBeDefined();
  });

  it('does NOT filter out custom or calculated metrics', () => {
    const view = createMockView();
    const statement = makeStatement([
      { type: MetricType.Custom, value: 'A', origin: 'parser' } as IMetric,
      { type: MetricType.Calculated, value: 100, origin: 'runtime' } as IMetric,
      { type: MetricType.Rep, value: 10, origin: 'parser' } as IMetric,
    ]);
    const section = makeSection();

    (getCursorFocusState as any).mockReturnValue({
      section,
      statement,
      cursorLine: 1,
      lineFrom: 0,
      lineTo: 10,
      focusedMetric: null,
    });

    render(<MetricInlinePanel view={view as any} cursorVersion={1} />);

    expect(screen.getByText('custom')).toBeDefined();
    expect(screen.getByText('calculated')).toBeDefined();
    expect(screen.getByText('Reps')).toBeDefined();
  });

  it('filters out Sound and System metrics only', () => {
    const view = createMockView();
    const statement = makeStatement([
      { type: MetricType.Sound, value: 'beep', origin: 'runtime' } as IMetric,
      { type: MetricType.System, value: 'tick', origin: 'runtime' } as IMetric,
      { type: MetricType.Rep, value: 10, origin: 'parser' } as IMetric,
    ]);
    const section = makeSection();

    (getCursorFocusState as any).mockReturnValue({
      section,
      statement,
      cursorLine: 1,
      lineFrom: 0,
      lineTo: 10,
      focusedMetric: null,
    });

    render(<MetricInlinePanel view={view as any} cursorVersion={1} />);

    expect(screen.getByText('Reps')).toBeDefined();
    // Sound and System should not appear as chips
    expect(screen.queryByText('Sound')).toBeNull();
    expect(screen.queryByText('System')).toBeNull();
  });

  it('falls back to generic styling for unknown metric types in chips', () => {
    const view = createMockView();
    const statement = makeStatement([
      { type: 'totally-unknown', value: 'X', origin: 'parser' } as IMetric,
    ]);
    const section = makeSection();

    (getCursorFocusState as any).mockReturnValue({
      section,
      statement,
      cursorLine: 1,
      lineFrom: 0,
      lineTo: 10,
      focusedMetric: null,
    });

    render(<MetricInlinePanel view={view as any} cursorVersion={1} />);

    // Should still render the chip even though type is unknown
    expect(screen.getByText('totally-unknown')).toBeDefined();
    expect(screen.getByText('X')).toBeDefined();
  });

  it('renders "No metrics on this line" when only Sound/System are present', () => {
    const view = createMockView();
    const statement = makeStatement([
      { type: MetricType.Sound, value: 'beep', origin: 'runtime' } as IMetric,
    ]);
    const section = makeSection();

    (getCursorFocusState as any).mockReturnValue({
      section,
      statement,
      cursorLine: 1,
      lineFrom: 0,
      lineTo: 10,
      focusedMetric: null,
    });

    render(<MetricInlinePanel view={view as any} cursorVersion={1} />);

    expect(screen.getByText('No metrics on this line')).toBeDefined();
  });
});
