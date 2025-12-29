import { IRuntimeAction } from '../contracts/IRuntimeAction';

/**
 * Execution phases for actions.
 * Actions are categorized into phases that execute in a specific order
 * to prevent cyclical dependencies and ensure predictable state transitions.
 * 
 * Phase execution order:
 * 1. DISPLAY - UI updates first (non-blocking, visual feedback)
 * 2. MEMORY - State changes (allocate, set values)
 * 3. SIDE_EFFECT - Sounds, logging, metrics
 * 4. EVENT - Batched event dispatch (may queue more actions)
 * 5. STACK - Push/pop operations (deferred to end of cycle)
 */
export enum ActionPhase {
  /** Display updates - UI state changes, visual feedback */
  DISPLAY = 'display',
  
  /** Memory mutations - allocate/set values in runtime memory */
  MEMORY = 'memory',
  
  /** Side effects - sounds, logging, metric tracking */
  SIDE_EFFECT = 'side_effect',
  
  /** Event emissions - dispatch to handlers (may produce more actions) */
  EVENT = 'event',
  
  /** Stack mutations - push/pop blocks (executed last) */
  STACK = 'stack',
  
  /** Default/immediate - actions that don't fit other categories, executed inline */
  IMMEDIATE = 'immediate'
}

/**
 * The order in which phases are processed.
 * Display first for quick UI feedback, stack last to prevent mid-cycle mutations.
 */
export const PHASE_EXECUTION_ORDER: readonly ActionPhase[] = [
  ActionPhase.DISPLAY,
  ActionPhase.MEMORY,
  ActionPhase.SIDE_EFFECT,
  ActionPhase.EVENT,
  ActionPhase.STACK
] as const;

/**
 * Extended action interface that includes phase information.
 * Actions implementing this interface will be sorted into their phase
 * and executed in phase order rather than queue order.
 */
export interface IPhasedAction extends IRuntimeAction {
  /** The execution phase for this action */
  readonly phase: ActionPhase;
}

/**
 * Type guard to check if an action implements IPhasedAction
 */
export function isPhasedAction(action: IRuntimeAction): action is IPhasedAction {
  return 'phase' in action && 
         typeof (action as IPhasedAction).phase === 'string' &&
         Object.values(ActionPhase).includes((action as IPhasedAction).phase);
}

/**
 * Get the phase for an action, defaulting to IMMEDIATE for non-phased actions
 */
export function getActionPhase(action: IRuntimeAction): ActionPhase {
  if (isPhasedAction(action)) {
    return action.phase;
  }
  return ActionPhase.IMMEDIATE;
}
