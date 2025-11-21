/**
 * Enum for type-safe memory allocation in the runtime system.
 * Prevents typos and provides IDE autocomplete support.
 * 
 * @remarks
 * Use these values when calling `IBlockContext.allocate()` to ensure
 * consistent memory type naming across the codebase.
 */
export enum MemoryTypeEnum {
  /**
   * Timer time spans - stores array of TimeSpan objects tracking start/stop times
   */
  TIMER_TIME_SPANS = 'timer-time-spans',
  
  /**
   * Timer running state - boolean indicating if timer is currently running
   */
  TIMER_IS_RUNNING = 'timer-is-running',
  
  /**
   * Current round number in rounds-based workouts
   */
  ROUNDS_CURRENT = 'rounds-current',
  
  /**
   * Total number of rounds in rounds-based workouts
   */
  ROUNDS_TOTAL = 'rounds-total',
  
  /**
   * Rounds state object containing current/total/completed round information
   */
  ROUNDS_STATE = 'rounds-state',
  
  /**
   * Current child block index for parent-child relationships
   */
  CHILD_INDEX = 'child-index',
  
  /**
   * Completion status tracking for blocks
   */
  COMPLETION_STATUS = 'completion-status',
  
  /**
   * Result spans for workout results/metrics
   */
  RESULT_SPANS = 'result-spans',
  
  /**
   * Event handler registry for block-specific handlers
   */
  HANDLER_REGISTRY = 'handler-registry',
  
  /**
   * Metric values for workout tracking
   */
  METRIC_VALUES = 'metric-values',
  
  /**
   * Repetition count metric - number of reps for current context (round/interval)
   * Allocated by RoundsBlock for inheritance by child EffortBlocks
   */
  METRIC_REPS = 'metric:reps',
  
  /**
   * Duration metric - time in milliseconds for current context
   * Allocated by TimerBlock for inheritance by child blocks
   */
  METRIC_DURATION = 'metric:duration',
  
  /**
   * Resistance/weight metric - weight value for current context
   * Allocated by parent blocks for inheritance by child EffortBlocks
   */
  METRIC_RESISTANCE = 'metric:resistance',
  
  /**
   * Start time timestamp (ms) for the block execution
   */
  METRIC_START_TIME = 'metric:start-time',
  
  /**
   * Anchor reference - a stable pointer to dynamically resolved memory references
   * Used for UI data binding without tight coupling to specific data sources
   */
  ANCHOR = 'anchor',
}
