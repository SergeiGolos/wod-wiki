import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { WqlQueryComposer } from './WqlQueryComposer';

if (typeof window !== 'undefined') {
  if (!window.requestAnimationFrame) {
    window.requestAnimationFrame = (callback: FrameRequestCallback): number =>
      setTimeout(() => callback(Date.now()), 16) as unknown as number;
  }
  if (!window.cancelAnimationFrame) {
    window.cancelAnimationFrame = (id: number): void => clearTimeout(id);
  }
}

afterEach(cleanup);

describe('WqlQueryComposer', () => {
  it('renders dual mode by default with visual controls and raw input', () => {
    const onChange = vi.fn();
    const { container } = render(
      <WqlQueryComposer
        value="sum:totalVolume{discipline:strength} by {week}.rollup(1w)"
        onChange={onChange}
        mode="dual"
      />,
    );

    expect(screen.getByText(/Visual Form Controls/i)).toBeTruthy();
    expect(screen.getByText(/Raw WQL Editor/i)).toBeTruthy();
    expect(container.querySelector('.cm-content')?.textContent).toBe('sum:totalVolume{discipline:strength} by {week}.rollup(1w)');
  });

  it('updates query when metric or aggregator is changed in visual form', () => {
    const onChange = vi.fn();
    render(
      <WqlQueryComposer
        value="sum:totalVolume{}"
        onChange={onChange}
        mode="dual"
      />,
    );

    const aggSelect = screen.getByDisplayValue('sum (total)') as HTMLSelectElement;
    fireEvent.change(aggSelect, { target: { value: 'avg' } });

    expect(onChange).toHaveBeenCalledWith('avg:totalVolume{}');
  });

  it('allows adding and removing tag filters', () => {
    const onChange = vi.fn();
    render(
      <WqlQueryComposer
        value="sum:totalVolume{}"
        onChange={onChange}
        mode="dual"
      />,
    );

    const addBtn = screen.getByRole('button', { name: /\+ Add Tag Filter/i });
    fireEvent.click(addBtn);

    expect(onChange).toHaveBeenLastCalledWith('sum:totalVolume{discipline:strength}');
  });

  it('switches modes via tab buttons', () => {
    render(
      <WqlQueryComposer
        value="sum:totalVolume{}"
        onChange={() => {}}
        mode="dual"
      />,
    );

    const guidedTab = screen.getByRole('button', { name: /Guided Question/i });
    fireEvent.click(guidedTab);

    expect(screen.getByText(/Ask a Question/i)).toBeTruthy();
  });
});
