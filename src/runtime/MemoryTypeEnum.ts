/**
 * Enum for type-safe memory allocation in the runtime system.
 * Prevents typos and provides IDE autocomplete support.
 */
export enum MemoryTypeEnum {
  /**
   * Display stack state - Full UI display hierarchy state
   * Type: IDisplayStackState (timer stack, card stack, workout state)
   */
  DISPLAY_STACK_STATE = 'displaystack',

  /**
   * Action stack state - Available actions surfaced to UI
   * Type: ActionStackState
   */
  ACTION_STACK_STATE = 'actions',

  /**
   * Timer state prefix - use as `timer:${blockId}`
   * Type: TimerState
   */
  TIMER_PREFIX = 'timer:',

  /**
   * Handler prefix - use as `handler:${id}`
   * Type: IEventHandler
   */
  HANDLER_PREFIX = 'handler:',

  /**
   * Current metrics accumulator
   * Type: CurrentMetrics
   */
  METRICS_CURRENT = 'metrics:current',

  /**
   * Target reps for the current round/block
   * Type: number
   */
  METRIC_REPS = 'metric:reps',

  /**
   * Anchor for cross-block references
   * Type: IAnchorValue
   */
  ANCHOR = 'anchor',
}
