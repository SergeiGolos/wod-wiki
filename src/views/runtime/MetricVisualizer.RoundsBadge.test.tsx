/**
 * UX-03 — Round group badge must include the "Rounds" label so it is not
 * visually indistinguishable from a rep count badge.
 *
 * Regression test for: `(3 Rounds)` group rendering as `🔄 3` instead of
 * `🔄 3 Rounds`.
 */

import { afterEach, describe, expect, it } from 'bun:test';
import { cleanup, render } from '@testing-library/react';
import { MetricVisualizer } from './MetricVisualizer';
import type { IMetric, MetricType } from '../../core/models/Metric';

function metric(type: string, value: unknown, image?: string): IMetric {
  return { type, value, image: image ?? String(value), origin: 'parser' } as IMetric;
}

describe('MetricVisualizer — rounds badge label (UX-03)', () => {
  afterEach(() => {
    cleanup();
    document.body.innerHTML = '';
  });

  it('appends "Rounds" to the badge for a (3 Rounds) group', () => {
    const { container } = render(
      <MetricVisualizer metrics={[metric('rounds', 3)]} />,
    );
    expect(container.textContent).toContain('3 Rounds');
    expect(container.textContent).toContain('🔄');
  });

  it('uses singular "Round" when count is 1', () => {
    const { container } = render(
      <MetricVisualizer metrics={[metric('rounds', 1)]} />,
    );
    expect(container.textContent).toContain('1 Round');
    expect(container.textContent).not.toContain('1 Rounds');
  });

  it('uses plural "Rounds" for counts greater than 1', () => {
    const { container } = render(
      <MetricVisualizer metrics={[metric('rounds', 5)]} />,
    );
    expect(container.textContent).toContain('5 Rounds');
  });

  it('does not append "Rounds" to a rep badge', () => {
    const { container } = render(
      <MetricVisualizer metrics={[metric('rep', 21)]} />,
    );
    expect(container.textContent).toContain('21');
    expect(container.textContent).not.toContain('Rounds');
    expect(container.textContent).not.toContain('Round');
  });

  it('does not append the label to non-numeric round images (e.g. labels)', () => {
    // RoundsMetric supports a string label (parser path: an Identifier in a
    // group). In that case we must preserve the label unchanged.
    const m: IMetric = {
      type: 'rounds' as MetricType,
      value: 'AMRAP',
      image: 'AMRAP',
      origin: 'parser',
    } as IMetric;
    const { container } = render(<MetricVisualizer metrics={[m]} />);
    expect(container.textContent).toContain('AMRAP');
    expect(container.textContent).not.toContain('AMRAP Rounds');
  });
});
