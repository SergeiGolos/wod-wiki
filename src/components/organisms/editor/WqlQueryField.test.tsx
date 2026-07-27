/**
 * WqlQueryField tests — the single-line WQL query field.
 *
 * Defends the observable contract: the field renders the query with the WQL
 * language extensions mounted, external value changes sync into the editor,
 * and Enter submits the current query.
 */
import { afterEach, describe, expect, it, mock } from 'bun:test';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { WqlQueryField } from './WqlQueryField';

afterEach(cleanup);

// CodeMirror measures on requestAnimationFrame; jsdom lacks it (the
// unit-setup polyfill lands on globalThis, not the jsdom window).
if (!window.requestAnimationFrame) {
  window.requestAnimationFrame = (callback: FrameRequestCallback): number => {
    return setTimeout(() => callback(Date.now()), 16) as unknown as number;
  };
}
if (!window.cancelAnimationFrame) {
  window.cancelAnimationFrame = (id: number): void => {
    clearTimeout(id);
  };
}

describe('WqlQueryField', () => {
  it('renders the query into the editor', () => {
    const { container } = render(
      <WqlQueryField value="sum:tis{effort:thruster}" onChange={() => {}} />,
    );
    expect(container.querySelector('.cm-content')?.textContent).toBe('sum:tis{effort:thruster}');
  });

  it('shows the placeholder when empty', () => {
    const { container } = render(
      <WqlQueryField value="" onChange={() => {}} placeholder="avg:tis by {week}" />,
    );
    expect(container.textContent).toContain('avg:tis by {week}');
  });

  it('syncs external value changes into the editor (example-query chips)', () => {
    const onChange = mock(() => {});
    const { container, rerender } = render(
      <WqlQueryField value="sum:tis" onChange={onChange} />,
    );
    rerender(<WqlQueryField value="max:tis{effort:back*} by {week}" onChange={onChange} />);
    expect(container.querySelector('.cm-content')?.textContent).toBe('max:tis{effort:back*} by {week}');
  });

  it('submits the current query on Enter', () => {
    const onSubmit = mock(() => {});
    const { container } = render(
      <WqlQueryField value="count:totalReps" onChange={() => {}} onSubmit={onSubmit} />,
    );
    fireEvent.keyDown(container.querySelector('.cm-content')!, { key: 'Enter' });
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith('count:totalReps');
  });
});
