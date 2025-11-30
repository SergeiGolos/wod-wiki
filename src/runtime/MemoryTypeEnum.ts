/**
 * Enum for type-safe memory allocation in the runtime system.
 * Prevents typos and provides IDE autocomplete support.
 */
export enum MemoryTypeEnum {
  /**
   * Display stack - List of Block IDs (string[])
   */
  DISPLAY_STACK = 'displaystack',

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
