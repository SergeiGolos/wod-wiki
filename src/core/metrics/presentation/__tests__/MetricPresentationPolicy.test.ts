import { describe, it, expect } from 'bun:test';
import { createMetricPresentationPolicy } from '../MetricPresentationPolicy';
import { MetricType, type IMetric } from '@/core/models/Metric';
import type { MetricPresentationSurface } from '../types';

const policy = createMetricPresentationPolicy();

function m(partial: Partial<IMetric> & { type: MetricType | string }): IMetric {
  return { origin: 'parser', ...partial } as IMetric;
}

// ─── structural detection ───────────────────────────────────────────────────

describe('isStructural', () => {
  it('marks group(+) as structural', () => {
    expect(policy.isStructural(m({ type: MetricType.Group, image: '+' }))).toBe(true);
  });
  it('marks group(-) as structural', () => {
    expect(policy.isStructural(m({ type: MetricType.Group, image: '-' }))).toBe(true);
  });
  it('does NOT mark group with other image as structural', () => {
    expect(policy.isStructural(m({ type: MetricType.Group, image: 'x' }))).toBe(false);
  });
  it('marks lap as structural', () => {
    expect(policy.isStructural(m({ type: MetricType.Lap }))).toBe(true);
  });
  it('does not mark rep as structural', () => {
    expect(policy.isStructural(m({ type: MetricType.Rep }))).toBe(false);
  });
});

// ─── isHidden — structural suppression ──────────────────────────────────────

describe('isHidden — structural metrics', () => {
  const NON_DEBUG_SURFACES: MetricPresentationSurface[] = [
    'runtime-badge', 'timer-subtitle', 'history-label',
    'review-grid-cell', 'review-grid-column', 'label-composer',
  ];

  for (const surface of NON_DEBUG_SURFACES) {
    it(`hides group(+) on ${surface}`, () => {
      expect(policy.isHidden(m({ type: MetricType.Group, image: '+' }), surface)).toBe(true);
    });
    it(`hides lap on ${surface}`, () => {
      expect(policy.isHidden(m({ type: MetricType.Lap }), surface)).toBe(true);
    });
  }

  it('shows group(+) on debug surface', () => {
    expect(policy.isHidden(m({ type: MetricType.Group, image: '+' }), 'debug')).toBe(false);
  });
  it('shows lap on debug surface', () => {
    expect(policy.isHidden(m({ type: MetricType.Lap }), 'debug')).toBe(false);
  });
});

describe('isHidden — sound', () => {
  it('hides sound on runtime-badge', () => {
    expect(policy.isHidden(m({ type: MetricType.Sound }), 'runtime-badge')).toBe(true);
  });
  it('shows sound on debug', () => {
    expect(policy.isHidden(m({ type: MetricType.Sound }), 'debug')).toBe(false);
  });
});

describe('isHidden — review-grid-column suppressions', () => {
  it('hides Elapsed in review-grid-column', () => {
    expect(policy.isHidden(m({ type: MetricType.Elapsed }), 'review-grid-column')).toBe(true);
  });
  it('hides Total in review-grid-column', () => {
    expect(policy.isHidden(m({ type: MetricType.Total }), 'review-grid-column')).toBe(true);
  });
  it('hides System in review-grid-column', () => {
    expect(policy.isHidden(m({ type: MetricType.System }), 'review-grid-column')).toBe(true);
  });
  it('does NOT hide Elapsed on runtime-badge', () => {
    expect(policy.isHidden(m({ type: MetricType.Elapsed }), 'runtime-badge')).toBe(false);
  });
});

// ─── present — renderKind ───────────────────────────────────────────────────

describe('present — renderKind', () => {
  it('comment for parser-origin text on runtime-badge', () => {
    const token = policy.present(
      m({ type: MetricType.Text, origin: 'parser', image: 'Scale if needed' }),
      'runtime-badge',
    );
    expect(token.renderKind).toBe('comment');
    expect(token.comment).toBe(true);
  });

  it('badge for runtime-origin text on runtime-badge', () => {
    const token = policy.present(
      m({ type: MetricType.Text, origin: 'runtime', image: 'Round 2' }),
      'runtime-badge',
    );
    expect(token.renderKind).toBe('badge');
    expect(token.comment).toBe(false);
  });

  it('plain-text on timer-subtitle surface', () => {
    const token = policy.present(m({ type: MetricType.Effort, image: 'Pushups' }), 'timer-subtitle');
    expect(token.renderKind).toBe('plain-text');
  });

  it('plain-text on history-label surface', () => {
    const token = policy.present(m({ type: MetricType.Effort, image: 'Run' }), 'history-label');
    expect(token.renderKind).toBe('plain-text');
  });

  it('plain-text on label-composer surface', () => {
    const token = policy.present(m({ type: MetricType.Effort, image: 'Row' }), 'label-composer');
    expect(token.renderKind).toBe('plain-text');
  });

  it('hidden for structural on any non-debug surface', () => {
    const token = policy.present(m({ type: MetricType.Group, image: '+' }), 'runtime-badge');
    expect(token.renderKind).toBe('hidden');
    expect(token.visible).toBe(false);
  });
});

// ─── present — label formatting ─────────────────────────────────────────────

describe('present — label', () => {
  it('formats bare rounds number with plural suffix', () => {
    const token = policy.present(m({ type: MetricType.Rounds, image: '3' }), 'runtime-badge');
    expect(token.label).toBe('3 Rounds');
  });

  it('formats singular round', () => {
    const token = policy.present(m({ type: MetricType.Rounds, image: '1' }), 'runtime-badge');
    expect(token.label).toBe('1 Round');
  });

  it('leaves non-numeric rounds image untouched', () => {
    const token = policy.present(m({ type: MetricType.Rounds, image: 'AMRAP' }), 'runtime-badge');
    expect(token.label).toBe('AMRAP');
  });

  it('formats duration ms value with smart time string', () => {
    const token = policy.present(
      m({ type: MetricType.Duration, value: 90000 }),
      'runtime-badge',
    );
    // 90 000 ms = 1:30
    expect(token.label).toBe('01:30');
  });
});

// ─── present — rest detection ───────────────────────────────────────────────

describe('present — rest', () => {
  it('marks effort=Rest as rest', () => {
    const token = policy.present(
      m({ type: MetricType.Effort, image: 'Rest', value: 'Rest' }),
      'runtime-badge',
    );
    expect(token.rest).toBe(true);
    expect(token.tone).toBe('rest');
  });

  it('does NOT mark effort=Pushups as rest', () => {
    const token = policy.present(
      m({ type: MetricType.Effort, image: 'Pushups', value: 'Pushups' }),
      'runtime-badge',
    );
    expect(token.rest).toBe(false);
  });
});

// ─── present — user-entered ──────────────────────────────────────────────────

describe('present — userEntered', () => {
  it('marks user-origin metric as userEntered', () => {
    const token = policy.present(
      m({ type: MetricType.Effort, origin: 'user' }),
      'review-grid-cell',
    );
    expect(token.userEntered).toBe(true);
  });

  it('does not mark parser-origin metric as userEntered', () => {
    const token = policy.present(
      m({ type: MetricType.Effort, origin: 'parser' }),
      'review-grid-cell',
    );
    expect(token.userEntered).toBe(false);
  });
});

// ─── columnLabel ─────────────────────────────────────────────────────────────

describe('columnLabel', () => {
  it('returns canonical label for rep', () => {
    expect(policy.columnLabel(MetricType.Rep)).toBe('Reps');
  });
  it('returns canonical label for rounds', () => {
    expect(policy.columnLabel(MetricType.Rounds)).toBe('Rounds');
  });
  it('returns title-cased fallback for unknown type', () => {
    expect(policy.columnLabel('custom-metric' as any)).toBe('Custom-metric');
  });
});

// ─── presentGroup ─────────────────────────────────────────────────────────────

describe('presentGroup', () => {
  it('filters structural when .visible is checked', () => {
    const metrics: IMetric[] = [
      m({ type: MetricType.Group, image: '+' }),
      m({ type: MetricType.Effort, image: 'Run' }),
      m({ type: MetricType.Lap }),
    ];
    const visible = policy.presentGroup(metrics, 'runtime-badge').filter(t => t.visible);
    expect(visible).toHaveLength(1);
    expect(visible[0].label).toBe('Run');
  });
});
