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
  it('returns humanized fallback for unknown type', () => {
    expect(policy.columnLabel('custom-metric' as any)).toBe('Custom Metric');
    expect(policy.columnLabel('totalLoad' as any)).toBe('Total Load');
  });
});

// ─── custom / calculated metrics (ADR-0009) ─────────────────────────────────

describe('ADR-0009 custom and calculated metric presentation', () => {
  it('does NOT hide Custom on review-grid-column', () => {
    expect(policy.isHidden(m({ type: MetricType.Custom }), 'review-grid-column')).toBe(false);
  });

  it('does NOT hide Calculated on review-grid-column', () => {
    expect(policy.isHidden(m({ type: MetricType.Calculated }), 'review-grid-column')).toBe(false);
  });

  it('does NOT hide Custom on runtime-badge', () => {
    expect(policy.isHidden(m({ type: MetricType.Custom }), 'runtime-badge')).toBe(false);
  });

  it('does NOT hide Calculated on runtime-badge', () => {
    expect(policy.isHidden(m({ type: MetricType.Calculated }), 'runtime-badge')).toBe(false);
  });

  it('presents Custom metric with muted tone', () => {
    const token = policy.present(m({ type: MetricType.Custom, value: 'Zone 2' }), 'runtime-badge');
    expect(token.tone).toBe('muted');
    expect(token.visible).toBe(true);
    expect(token.renderKind).toBe('badge');
  });

  it('presents Calculated metric with effort tone', () => {
    const token = policy.present(m({ type: MetricType.Calculated, value: 420 }), 'runtime-badge');
    expect(token.tone).toBe('effort');
    expect(token.visible).toBe(true);
    expect(token.renderKind).toBe('badge');
  });

  it('returns canonical columnLabel for Custom', () => {
    expect(policy.columnLabel(MetricType.Custom)).toBe('Custom');
  });

  it('returns canonical columnLabel for Calculated', () => {
    expect(policy.columnLabel(MetricType.Calculated)).toBe('Calculated');
  });

  it('labels Custom metric with its value/image', () => {
    const token = policy.present(m({ type: MetricType.Custom, value: 'Zone 2', image: 'Zone 2' }), 'runtime-badge');
    expect(token.label).toBe('Zone 2');
  });

  it('labels Calculated metric with its numeric value', () => {
    const token = policy.present(m({ type: MetricType.Calculated, value: 81.4 }), 'runtime-badge');
    expect(token.label).toBe('81.4');
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

  it('keeps custom and calculated metrics visible in presentGroup', () => {
    const metrics: IMetric[] = [
      m({ type: MetricType.Custom, value: 'Zone 2' }),
      m({ type: MetricType.Calculated, value: 420 }),
      m({ type: MetricType.Rep, value: 10 }),
    ];
    const tokens = policy.presentGroup(metrics, 'runtime-badge');
    const visible = tokens.filter(t => t.visible);
    expect(visible).toHaveLength(3);
    expect(visible.map(t => t.metric.type)).toContain(MetricType.Custom);
    expect(visible.map(t => t.metric.type)).toContain(MetricType.Calculated);
  });
});
