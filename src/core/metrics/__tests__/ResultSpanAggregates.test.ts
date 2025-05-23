import { describe, test, expect } from 'vitest';
import { ResultSpan } from '../../ResultSpan';
import { RuntimeSpan } from '../../RuntimeSpan';
import { MetricValue } from '../../MetricValue';
import { 
  TotalRepetitionsAggregate, 
  RepetitionsByExerciseAggregate,
  TotalWeightAggregate,
  TotalDistanceAggregate
} from '../ResultSpanAggregates';
import { ResultSpanAggregator } from '../ResultSpanAggregator';

describe('ResultSpanAggregates', () => {
  // Helper function to create test spans
  function createTestSpans(): ResultSpan[] {
    // Span 1: Pushups
    const span1 = new ResultSpan(new RuntimeSpan());
    span1.metrics = [
      {
        sourceId: 'source1',
        effort: 'Pushups',
        values: [
          { type: 'repetitions', value: 10, unit: 'reps' } as MetricValue
        ]
      }
    ];

    // Span 2: Squats with weight
    const span2 = new ResultSpan(new RuntimeSpan());
    span2.metrics = [
      {
        sourceId: 'source2',
        effort: 'Squats',
        values: [
          { type: 'repetitions', value: 15, unit: 'reps' } as MetricValue,
          { type: 'resistance', value: 50, unit: 'lbs' } as MetricValue
        ]
      }
    ];

    // Span 3: Running
    const span3 = new ResultSpan(new RuntimeSpan());
    span3.metrics = [
      {
        sourceId: 'source3',
        effort: 'Running',
        values: [
          { type: 'distance', value: 5, unit: 'km' } as MetricValue
        ]
      }
    ];

    // Span 4: More Pushups
    const span4 = new ResultSpan(new RuntimeSpan());
    span4.metrics = [
      {
        sourceId: 'source4',
        effort: 'Pushups',
        values: [
          { type: 'repetitions', value: 20, unit: 'reps' } as MetricValue
        ]
      }
    ];

    return [span1, span2, span3, span4];
  }

  test('TotalRepetitionsAggregate calculates total reps correctly', () => {
    const spans = createTestSpans();
    const aggregator = new TotalRepetitionsAggregate();
    const result = aggregator.aggregate(spans);

    // Total reps should be 10 + 15 + 20 = 45
    expect(result.total).toBe(45);
  });

  test('RepetitionsByExerciseAggregate groups reps by exercise correctly', () => {
    const spans = createTestSpans();
    const aggregator = new RepetitionsByExerciseAggregate();
    const result = aggregator.aggregate(spans);

    expect(result.byExercise).toEqual({
      'Pushups': 30, // 10 + 20
      'Squats': 15
    });
  });

  test('TotalWeightAggregate calculates total weight moved correctly', () => {
    const spans = createTestSpans();
    const aggregator = new TotalWeightAggregate();
    const result = aggregator.aggregate(spans);

    // Squats: 15 reps * 50 lbs = 750 lbs
    expect(result.total).toBe(750);
  });

  test('TotalDistanceAggregate calculates distance by unit correctly', () => {
    const spans = createTestSpans();
    const aggregator = new TotalDistanceAggregate();
    const result = aggregator.aggregate(spans);

    expect(result.byUnit).toEqual({
      'km': 5
    });
  });

  test('ResultSpanAggregator combines multiple aggregates correctly', () => {
    const spans = createTestSpans();
    
    const aggregator = new ResultSpanAggregator([
      new TotalRepetitionsAggregate(),
      new RepetitionsByExerciseAggregate(),
      new TotalWeightAggregate(),
      new TotalDistanceAggregate()
    ]);
    
    const result = aggregator.aggregate(spans);

    expect(result.totalRepetitions.data.total).toBe(45);
    expect(result.repsByExercise.data.byExercise.Pushups).toBe(30);
    expect(result.totalWeight.data.total).toBe(750);
    expect(result.totalDistance.data.byUnit.km).toBe(5);
  });

  test('ResultSpanAggregator allows adding and removing aggregators', () => {
    const aggregator = new ResultSpanAggregator();
    
    // Add aggregators
    aggregator.addAggregator(new TotalRepetitionsAggregate());
    aggregator.addAggregator(new TotalWeightAggregate());
    
    expect(aggregator.aggregators.length).toBe(2);
    
    // Remove an aggregator
    aggregator.removeAggregator('totalRepetitions');
    
    expect(aggregator.aggregators.length).toBe(1);
    expect(aggregator.aggregators[0].id).toBe('totalWeight');
    
    // Clear all aggregators
    aggregator.clearAggregators();
    
    expect(aggregator.aggregators.length).toBe(0);
  });

  test('Aggregators have correct ids and display names', () => {
    const repAgg = new TotalRepetitionsAggregate();
    const weightAgg = new TotalWeightAggregate();
    
    expect(repAgg.id).toBe('totalRepetitions');
    expect(repAgg.displayName).toBe('Total Repetitions');
    
    expect(weightAgg.id).toBe('totalWeight');
    expect(weightAgg.displayName).toBe('Total Weight Moved');
  });
});