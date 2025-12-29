/**
 * Runtime Actions - Declarative action types for behavior orchestration
 * 
 * This module exports all action types that can be returned from behaviors
 * to perform operations in a declarative manner.
 * 
 * Actions can optionally implement IPhasedAction to specify their execution phase.
 * Phased actions are collected and executed in phase order to prevent cyclical
 * dependencies between events, stack mutations, and state changes.
 */

// Phase-separated execution
export { 
  ActionPhase, 
  PHASE_EXECUTION_ORDER, 
  isPhasedAction, 
  getActionPhase 
} from './ActionPhase';
export type { IPhasedAction } from './ActionPhase';
export { PhasedActionProcessor } from './PhasedActionProcessor';
export type { PhasedProcessorConfig } from './PhasedActionProcessor';

// Stack actions
export * from './stack';

// Display actions  
export * from './display';

// Event actions
export * from './events';

// Audio actions
export * from './audio';

// Error actions
export { ErrorAction } from './ErrorAction';
export { ThrowError, ThrowErrorAction } from './ThrowError';
export type { RuntimeError } from './ErrorAction';
