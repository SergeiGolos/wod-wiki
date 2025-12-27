/**
 * Runtime Actions - Declarative action types for behavior orchestration
 * 
 * This module exports all action types that can be returned from behaviors
 * to perform operations in a declarative manner.
 */

export { EmitEventAction } from './EmitEventAction';
export { EmitMetricAction } from './EmitMetricAction';
export { PlaySoundAction } from './PlaySoundAction';
export { RegisterEventHandlerAction } from './RegisterEventHandlerAction';
export { UnregisterEventHandlerAction } from './UnregisterEventHandlerAction';
export { ErrorAction } from './ErrorAction';
export { ThrowError, ThrowErrorAction } from './ThrowError';

// Segment and Metric Actions
export {
  StartSegmentAction,
  EndSegmentAction,
  EndAllSegmentsAction,
  RecordMetricAction,
  RecordRoundAction
} from './SegmentActions';

// Display Stack Actions
export {
  PushTimerDisplayAction,
  PopTimerDisplayAction,
  UpdateTimerDisplayAction
} from './TimerDisplayActions';

export {
  PushCardDisplayAction,
  PopCardDisplayAction,
  UpdateCardDisplayAction
} from './CardDisplayActions';

export {
  SetWorkoutStateAction,
  SetRoundsDisplayAction,
  ResetDisplayStackAction
} from './WorkoutStateActions';

export type { RuntimeError } from './ErrorAction';
