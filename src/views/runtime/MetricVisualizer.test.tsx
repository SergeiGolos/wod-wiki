import { afterEach, describe, expect, it } from 'bun:test';
import { cleanup, render } from '@testing-library/react';
import { MetricVisualizer } from './MetricVisualizer';
import type { IMetric } from '../../core/models/Metric';

/**
 * UX-05 regression coverage: `// ...` comment lines must render visually
 * distinct from `[action items]`. Comments are passive coach annotations
 * (muted italic, no emoji badge); action items remain interactive pills.
 */
describe('MetricVisualizer comment vs action item rendering', () => {
  afterEach(() => {
    cleanup();
    document.body.innerHTML = '';
  });

  const commentMetric: IMetric = {
    type: 'text',
    origin: 'parser',
    value: { text: 'Warm up first' },
    image: 'Warm up first',
  } as IMetric;

  const actionMetric: IMetric = {
    type: 'action',
    origin: 'parser',
    value: 'Set up barbell',
    image: 'Set up barbell',
  } as IMetric;

  it('renders parser-origin text metrics (comments) as muted italic annotations without emoji badge', () => {
    const { container } = render(<MetricVisualizer metrics={[commentMetric]} />);

    const commentNode = container.querySelector('[data-metric-type="comment"]');
    expect(commentNode).toBeTruthy();
    expect(commentNode?.textContent).toBe('Warm up first');
    expect(commentNode?.className).toContain('italic');
    expect(commentNode?.className).toContain('text-muted-foreground');
    // No pill / border / interactive affordances for comments.
    expect(commentNode?.className).not.toContain('border');
    expect(commentNode?.className).not.toContain('cursor-help');
    // The notepad emoji used for the generic `text` icon must not leak through.
    expect(container.textContent).not.toContain('📝');
  });

  it('renders action items as interactive pill badges (visually distinct from comments)', () => {
    const { container } = render(<MetricVisualizer metrics={[actionMetric]} />);

    // Action items keep the standard pill badge styling.
    const pill = container.querySelector('span.inline-flex.border');
    expect(pill).toBeTruthy();
    expect(pill?.textContent).toContain('Set up barbell');
    // Comments slot must not be used for action items.
    expect(container.querySelector('[data-metric-type="comment"]')).toBeNull();
  });

  it('renders comments and action items distinctly when shown side-by-side', () => {
    const { container } = render(
      <MetricVisualizer metrics={[commentMetric, actionMetric]} />,
    );

    const commentNode = container.querySelector('[data-metric-type="comment"]');
    const pill = container.querySelector('span.inline-flex.border');

    expect(commentNode).toBeTruthy();
    expect(pill).toBeTruthy();
    // The two nodes must not be the same element — they should use different
    // rendering paths so they look semantically distinct in the runner.
    expect(commentNode).not.toBe(pill);
  });

  it('keeps runtime-origin text metrics (labels/subtitles from LabelingBehavior) on the standard pill rendering', () => {
    const labelMetric: IMetric = {
      type: 'text',
      origin: 'runtime',
      value: { text: 'Round 1 of 3', role: 'round' },
      image: 'Round 1 of 3',
    } as IMetric;

    const { container } = render(<MetricVisualizer metrics={[labelMetric]} />);

    // Runtime-origin text must NOT use the comment annotation slot.
    expect(container.querySelector('[data-metric-type="comment"]')).toBeNull();
    const pill = container.querySelector('span.inline-flex.border');
    expect(pill).toBeTruthy();
    expect(pill?.textContent).toContain('Round 1 of 3');
  });
});
