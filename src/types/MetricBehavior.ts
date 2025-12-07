/**
 * Classifies the intent of a fragment or metric so engines can
 * distinguish defined script data from hints, collected inputs,
 * runtime recordings, and analytics calculations.
 */
export enum MetricBehavior {
  Defined = 'defined',
  Hint = 'hint',
  Collected = 'collected',
  Recorded = 'recorded',
  Calculated = 'calculated',
}