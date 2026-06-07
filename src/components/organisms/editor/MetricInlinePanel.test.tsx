import { afterEach, describe, expect, it, mock } from 'bun:test';
import { cleanup, render, screen } from '@testing-library/react';
import { MetricType } from '@/core/models/Metric';
import type { IMetric } from '@/core/models/Metric';
import type { ICodeStatement } from '@/core/models/CodeStatement';
import type { EditorSection } from '@/components/Editor/extensions/section-state';
import type { EditorView } from '@codemirror/view';
import type { EditorState } from '@codemirror/state';
import { MetricInlinePanel } from './MetricInlinePanel';

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
    state: {} as unknown as EditorState,
  };
}

describe('MetricInlinePanel ADR-0009 regressions', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders custom metric chips inline', () => {
    const view = createMockView();
    const statement = makeStatement([
      { type: MetricType.Custom, value: 'Zone 2', image: 'Zone 2', origin: 'parser' } as IMetric,
    ]);
    const section = makeSection();

    const getCursorFocusState = mock(() => ({
      section,
      statement,
      cursorLine: 1,
      lineFrom: 0,
      lineTo: 10,
      focusedMetric: null,
    }));

    render(<MetricInlinePanel view={view as unknown as EditorView} cursorVersion={1} getCursorFocusState={getCursorFocusState} />);

    expect(screen.getByText('custom')).toBeDefined();
    expect(screen.getByText('Zone 2')).toBeDefined();
  });

  it('renders calculated metric chips inline', () => {
    const view = createMockView();
    const statement = makeStatement([
      { type: MetricType.Calculated, value: 'RPE 8', image: 'RPE 8', origin: 'parser' } as IMetric,
    ]);
    const section = makeSection();

    const getCursorFocusState = mock(() => ({
      section,
      statement,
      cursorLine: 1,
      lineFrom: 0,
      lineTo: 10,
      focusedMetric: null,
    }));

    render(<MetricInlinePanel view={view as unknown as EditorView} cursorVersion={1} getCursorFocusState={getCursorFocusState} />);

    expect(screen.getByText('calculated')).toBeDefined();
    expect(screen.getByText('RPE 8')).toBeDefined();
  });

  it('does NOT filter out custom or calculated metrics', () => {
    const view = createMockView();
    const statement = makeStatement([
      { type: MetricType.Custom, value: 'Zone 2', image: 'Zone 2', origin: 'parser' } as IMetric,
      { type: MetricType.Calculated, value: 'RPE 8', image: 'RPE 8', origin: 'parser' } as IMetric,
    ]);
    const section = makeSection();

    const getCursorFocusState = mock(() => ({
      section,
      statement,
      cursorLine: 1,
      lineFrom: 0,
      lineTo: 10,
      focusedMetric: null,
    }));

    render(<MetricInlinePanel view={view as unknown as EditorView} cursorVersion={1} getCursorFocusState={getCursorFocusState} />);

    expect(screen.getByText('custom')).toBeDefined();
    expect(screen.getByText('calculated')).toBeDefined();
  });

  it('filters out Sound and System metrics only', () => {
    const view = createMockView();
    const statement = makeStatement([
      { type: MetricType.Rep, value: '10', image: '10', origin: 'parser' } as IMetric,
      { type: MetricType.Sound, value: 'beep', origin: 'runtime' } as IMetric,
      { type: MetricType.System, value: 'start', origin: 'runtime' } as IMetric,
    ]);
    const section = makeSection();

    const getCursorFocusState = mock(() => ({
      section,
      statement,
      cursorLine: 1,
      lineFrom: 0,
      lineTo: 10,
      focusedMetric: null,
    }));

    render(<MetricInlinePanel view={view as unknown as EditorView} cursorVersion={1} getCursorFocusState={getCursorFocusState} />);

    // Rep should be visible
    expect(screen.getByText('10')).toBeDefined();
    // Sound and System should be filtered out
    expect(screen.queryByText('beep')).toBeNull();
    expect(screen.queryByText('start')).toBeNull();
  });

  it('falls back to generic styling for unknown metric types in chips', () => {
    const view = createMockView();
    const statement = makeStatement([
      { type: 'unknown-type' as MetricType, value: 'X', image: 'X', origin: 'parser' } as IMetric,
    ]);
    const section = makeSection();

    const getCursorFocusState = mock(() => ({
      section,
      statement,
      cursorLine: 1,
      lineFrom: 0,
      lineTo: 10,
      focusedMetric: null,
    }));

    // Should not throw
    render(<MetricInlinePanel view={view as unknown as EditorView} cursorVersion={1} getCursorFocusState={getCursorFocusState} />);
  });

  it('renders "No metrics on this line" when only Sound/System are present', () => {
    const view = createMockView();
    const statement = makeStatement([
      { type: MetricType.Sound, value: 'beep', origin: 'runtime' } as IMetric,
      { type: MetricType.System, value: 'start', origin: 'runtime' } as IMetric,
    ]);
    const section = makeSection();

    const getCursorFocusState = mock(() => ({
      section,
      statement,
      cursorLine: 1,
      lineFrom: 0,
      lineTo: 10,
      focusedMetric: null,
    }));

    render(<MetricInlinePanel view={view as unknown as EditorView} cursorVersion={1} getCursorFocusState={getCursorFocusState} />);

    expect(screen.getByText(/no metrics on this line/i)).toBeDefined();
  });
});
