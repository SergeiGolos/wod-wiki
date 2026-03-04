/**
 * Tests for Fragment to Display Metric Converter
 */

import { IMetric, MetricType } from '@/core';
import { MetricBehavior } from '@/types/MetricBehavior';
import { describe, it, expect } from 'bun:test';
import { metricToDisplayData, metricsToDisplayData, getCollectedDisplayMetrics } from './metricsToDisplayData';

describe('metricToDisplayData', () => {
  it('should convert a rep metric to display metric', () => {
    const metric: IMetric = {
      type: 'rep',
      metricType: MetricType.Rep,
      value: 10,
      image: '10 pushups',
      behavior: MetricBehavior.Collected,
    };

    const result = metricToDisplayData(metric);

    expect(result.type).toBe(MetricType.Rep);
    expect(result.value).toBe(10);
    expect(result.image).toBe('10 pushups');
    expect(result.unit).toBe('reps');
  });

  it('should format value when image is not provided', () => {
    const metric: IMetric = {
      type: 'rep',
      metricType: MetricType.Rep,
      value: 5,
      behavior: MetricBehavior.Collected,
    };

    const result = metricToDisplayData(metric);

    expect(result.image).toBe('5 reps');
  });
});

describe('metricsToDisplayData', () => {
  it('should convert flat array of metric', () => {
    const metrics: IMetric[] = [
      {
        type: 'effort',
        metricType: MetricType.Effort,
        value: 'pushups',
        image: 'Pushups',
        behavior: MetricBehavior.Collected,
      },
      {
        type: 'rep',
        metricType: MetricType.Rep,
        value: 10,
        image: '10 reps',
        behavior: MetricBehavior.Collected,
      },
    ];

    const result = metricsToDisplayData(metrics);

    expect(result).toHaveLength(2);
    expect(result[0].type).toBe(MetricType.Effort);
    expect(result[1].type).toBe(MetricType.Rep);
  });

  it('should filter by behavior when specified', () => {
    const metrics: IMetric[] = [
      {
        type: 'rep',
        metricType: MetricType.Rep,
        value: 10,
        behavior: MetricBehavior.Defined,
      },
      {
        type: 'rep',
        metricType: MetricType.Rep,
        value: 12,
        behavior: MetricBehavior.Collected,
      },
    ];

    const result = metricsToDisplayData(metrics, [MetricBehavior.Collected]);

    expect(result).toHaveLength(1);
    expect(result[0].value).toBe(12);
  });
});

describe('getCollectedDisplayMetrics', () => {
  it('should return only collected and recorded metrics', () => {
    const metrics: IMetric[] = [
      {
        type: 'rep',
        metricType: MetricType.Rep,
        value: 10,
        behavior: MetricBehavior.Defined,
      },
      {
        type: 'rep',
        metricType: MetricType.Rep,
        value: 12,
        behavior: MetricBehavior.Collected,
      },
      {
        type: 'rep',
        metricType: MetricType.Rep,
        value: 15,
        behavior: MetricBehavior.Recorded,
      },
    ];

    const result = getCollectedDisplayMetrics(metrics);

    expect(result).toHaveLength(2);
    expect(result[0].value).toBe(12);
    expect(result[1].value).toBe(15);
  });
});
