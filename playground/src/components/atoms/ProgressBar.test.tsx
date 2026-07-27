/**
 * ProgressBar — pulse-on-advance tests (wayfinder #666).
 *
 * Asserts:
 *   1. On first mount, the fill is `bg-brand` (not pulsing, even if value > 0).
 *   2. On a value increment, the fill briefly switches to `bg-brand-deep`.
 *   3. After ~200ms, the fill settles back to `bg-brand`.
 *   4. On a value decrement, the fill stays `bg-brand` (no pulse).
 *   5. On no-change re-render, no pulse fires.
 */

import { afterEach, describe, expect, it, jest } from 'bun:test';
import { act, cleanup, render, screen } from '@testing-library/react';

import { ProgressBar } from './ProgressBar';

afterEach(() => {
  cleanup();
  jest.useRealTimers();
});

const fillClass = () => {
  const bar = screen.getByRole('progressbar');
  const fill = bar.querySelector('div');
  expect(fill).not.toBeNull();
  return fill!.className;
};

describe('ProgressBar pulse', () => {
  it('renders bg-brand on first mount (no pulse, even when value > 0)', () => {
    render(<ProgressBar value={3} max={5} label="Getting started" />);
    expect(fillClass()).toContain('bg-brand');
    expect(fillClass()).not.toContain('bg-brand-deep');
  });

  it('switches to bg-brand-deep when value increments', () => {
    const { rerender } = render(<ProgressBar value={2} max={5} label="Getting started" />);
    expect(fillClass()).toContain('bg-brand');

    rerender(<ProgressBar value={3} max={5} label="Getting started" />);
    expect(fillClass()).toContain('bg-brand-deep');
  });

  it('does not pulse on value decrement', () => {
    const { rerender } = render(<ProgressBar value={3} max={5} label="Getting started" />);
    expect(fillClass()).toContain('bg-brand');

    rerender(<ProgressBar value={2} max={5} label="Getting started" />);
    expect(fillClass()).toContain('bg-brand');
    expect(fillClass()).not.toContain('bg-brand-deep');
  });

  it('does not pulse on no-change re-render', () => {
    const { rerender } = render(<ProgressBar value={3} max={5} label="Getting started" />);
    expect(fillClass()).toContain('bg-brand');

    rerender(<ProgressBar value={3} max={5} label="Getting started" />);
    expect(fillClass()).toContain('bg-brand');
    expect(fillClass()).not.toContain('bg-brand-deep');
  });

  it('settles back to bg-brand after ~200ms', () => {
    jest.useFakeTimers();
    const { rerender } = render(<ProgressBar value={2} max={5} label="Getting started" />);
    rerender(<ProgressBar value={3} max={5} label="Getting started" />);
    expect(fillClass()).toContain('bg-brand-deep');

    // Advance past the 200ms pulse timeout.
    act(() => {
      jest.advanceTimersByTime(250);
    });
    expect(fillClass()).toContain('bg-brand');
    expect(fillClass()).not.toContain('bg-brand-deep');
  });
});