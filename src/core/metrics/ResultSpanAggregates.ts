import { ResultSpan } from "../ResultSpan";
import { ResultSpanAggregateBase } from "./ResultSpanAggregateBase";

/**
 * Aggregator that calculates total repetitions across all spans.
 */
export class TotalRepetitionsAggregate extends ResultSpanAggregateBase {
  constructor() {
    super("totalRepetitions", "Total Repetitions");
  }

  /**
   * Aggregates repetitions across all spans.
   * 
   * @param spans - Collection of ResultSpan objects to aggregate
   * @returns Object containing total repetitions
   */
  public aggregate(spans: ResultSpan[]): Record<string, any> {
    let totalReps = 0;
    
    spans.forEach(span => {
      span.metrics.forEach(metric => {
        const repValues = metric.values.filter(v => v.type === "repetitions");
        repValues.forEach(rep => {
          totalReps += rep.value;
        });
      });
    });

    return { total: totalReps };
  }
}

/**
 * Aggregator that calculates repetitions grouped by exercise/effort.
 */
export class RepetitionsByExerciseAggregate extends ResultSpanAggregateBase {
  constructor() {
    super("repsByExercise", "Repetitions by Exercise");
  }

  /**
   * Aggregates repetitions by exercise/effort name.
   * 
   * @param spans - Collection of ResultSpan objects to aggregate
   * @returns Object containing repetitions grouped by exercise name
   */
  public aggregate(spans: ResultSpan[]): Record<string, any> {
    const repsByExercise: Record<string, number> = {};
    
    spans.forEach(span => {
      span.metrics.forEach(metric => {
        const exercise = metric.effort;
        const repValues = metric.values.filter(v => v.type === "repetitions");
        
        if (repValues.length > 0) {
          if (!repsByExercise[exercise]) {
            repsByExercise[exercise] = 0;
          }
          
          repValues.forEach(rep => {
            repsByExercise[exercise] += rep.value;
          });
        }
      });
    });

    return { byExercise: repsByExercise };
  }
}

/**
 * Aggregator that calculates total weight moved across all spans.
 */
export class TotalWeightAggregate extends ResultSpanAggregateBase {
  constructor() {
    super("totalWeight", "Total Weight Moved");
  }

  /**
   * Aggregates total weight moved across all spans.
   * 
   * @param spans - Collection of ResultSpan objects to aggregate
   * @returns Object containing total weight moved
   */
  public aggregate(spans: ResultSpan[]): Record<string, any> {
    let totalWeight = 0;
    
    spans.forEach(span => {
      span.metrics.forEach(metric => {
        const resistanceValues = metric.values.filter(v => v.type === "resistance");
        const repValues = metric.values.filter(v => v.type === "repetitions");
        
        if (resistanceValues.length > 0 && repValues.length > 0) {
          // Calculate weight moved as resistance * reps
          resistanceValues.forEach(resistance => {
            repValues.forEach(rep => {
              totalWeight += resistance.value * rep.value;
            });
          });
        }
      });
    });

    return { total: totalWeight };
  }
}

/**
 * Aggregator that calculates total distance covered across all spans.
 */
export class TotalDistanceAggregate extends ResultSpanAggregateBase {
  constructor() {
    super("totalDistance", "Total Distance Covered");
  }

  /**
   * Aggregates total distance covered across all spans.
   * 
   * @param spans - Collection of ResultSpan objects to aggregate
   * @returns Object containing total distance and unit
   */
  public aggregate(spans: ResultSpan[]): Record<string, any> {
    // Map to store distance by unit
    const distanceByUnit: Record<string, number> = {};
    
    spans.forEach(span => {
      span.metrics.forEach(metric => {
        const distanceValues = metric.values.filter(v => v.type === "distance");
        
        distanceValues.forEach(distance => {
          const unit = distance.unit;
          if (!distanceByUnit[unit]) {
            distanceByUnit[unit] = 0;
          }
          distanceByUnit[unit] += distance.value;
        });
      });
    });

    return { byUnit: distanceByUnit };
  }
}