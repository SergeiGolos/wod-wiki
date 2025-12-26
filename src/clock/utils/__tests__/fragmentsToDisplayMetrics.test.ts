/**
 * Tests for Fragment to Display Metric Converter
 */

import { describe, it, expect } from 'bun:test';
import {
  fragmentToDisplayMetric,
  fragmentsToDisplayMetrics,
  getCollectedDisplayMetrics,
} from '../fragmentsToDisplayMetrics';
import { ICodeFragment, FragmentType, FragmentCollectionState } from '../../../core/models/CodeFragment';
import { MetricBehavior } from '../../../types/MetricBehavior';

describe('fragmentToDisplayMetric', () => {
  it('should convert a rep fragment to display metric', () => {
    const fragment: ICodeFragment = {
      type: 'rep',
      fragmentType: FragmentType.Rep,
      value: 10,
      image: '10 pushups',
      behavior: MetricBehavior.Collected,
    };

    const result = fragmentToDisplayMetric(fragment);

    expect(result.type).toBe(FragmentType.Rep);
    expect(result.value).toBe(10);
    expect(result.image).toBe('10 pushups');
    expect(result.unit).toBe('reps');
  });

  it('should format value when image is not provided', () => {
    const fragment: ICodeFragment = {
      type: 'rep',
      fragmentType: FragmentType.Rep,
      value: 5,
      behavior: MetricBehavior.Collected,
    };

    const result = fragmentToDisplayMetric(fragment);

    expect(result.image).toBe('5 reps');
  });
});

describe('fragmentsToDisplayMetrics', () => {
  it('should convert flat array of fragments', () => {
    const fragments: ICodeFragment[] = [
      {
        type: 'effort',
        fragmentType: FragmentType.Effort,
        value: 'pushups',
        image: 'Pushups',
        behavior: MetricBehavior.Collected,
      },
      {
        type: 'rep',
        fragmentType: FragmentType.Rep,
        value: 10,
        image: '10 reps',
        behavior: MetricBehavior.Collected,
      },
    ];

    const result = fragmentsToDisplayMetrics(fragments);

    expect(result).toHaveLength(2);
    expect(result[0].type).toBe(FragmentType.Effort);
    expect(result[1].type).toBe(FragmentType.Rep);
  });

  it('should filter by behavior when specified', () => {
    const fragments: ICodeFragment[] = [
      {
        type: 'rep',
        fragmentType: FragmentType.Rep,
        value: 10,
        behavior: MetricBehavior.Defined,
      },
      {
        type: 'rep',
        fragmentType: FragmentType.Rep,
        value: 12,
        behavior: MetricBehavior.Collected,
      },
    ];

    const result = fragmentsToDisplayMetrics(fragments, [MetricBehavior.Collected]);

    expect(result).toHaveLength(1);
    expect(result[0].value).toBe(12);
  });
});

describe('getCollectedDisplayMetrics', () => {
  it('should return only collected and recorded metrics', () => {
    const fragments: ICodeFragment[] = [
      {
        type: 'rep',
        fragmentType: FragmentType.Rep,
        value: 10,
        behavior: MetricBehavior.Defined,
      },
      {
        type: 'rep',
        fragmentType: FragmentType.Rep,
        value: 12,
        behavior: MetricBehavior.Collected,
      },
      {
        type: 'rep',
        fragmentType: FragmentType.Rep,
        value: 15,
        behavior: MetricBehavior.Recorded,
      },
    ];

    const result = getCollectedDisplayMetrics(fragments);

    expect(result).toHaveLength(2);
    expect(result[0].value).toBe(12);
    expect(result[1].value).toBe(15);
  });
});
