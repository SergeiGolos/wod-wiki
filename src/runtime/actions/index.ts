/**
 * Runtime Actions - Declarative action types for behavior orchestration
 * 
 * This module exports all action types that can be returned from behaviors
 * to perform operations in a declarative manner.
 */

export { EmitEventAction } from './EmitEventAction';
export { StartTimerAction } from './StartTimerAction';
export { StopTimerAction } from './StopTimerAction';
export { RegisterEventHandlerAction } from './RegisterEventHandlerAction';
export { UnregisterEventHandlerAction } from './UnregisterEventHandlerAction';
export { ErrorAction } from './ErrorAction';

export type { TimeSpan } from './StartTimerAction';
export type { RuntimeError } from './ErrorAction';
