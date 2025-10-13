/**
 * CompilationContext
 * 
 * Context passed from parent blocks to child blocks during JIT compilation.
 * Enables metric inheritance (e.g., rep schemes flowing to child exercises).
 * 
 * Design:
 * - Parent blocks create context with their current state
 * - JIT compiler passes context to strategies
 * - Strategies use context to provide default values for child blocks
 * - Explicit child values override inherited context values
 * 
 * Example - Fran Workout:
 * ```
 * (21-15-9) Thrusters, Pullups
 * ```
 * 
 * RoundsBlock creates context:
 * - round: 1, totalRounds: 3, reps: 21
 * 
 * Child EffortBlocks inherit:
 * - Thrusters: reps = 21 (from context)
 * - Pullups: reps = 21 (from context)
 * 
 * Then round 2:
 * - round: 2, totalRounds: 3, reps: 15
 * - Thrusters: reps = 15
 * - Pullups: reps = 15
 */

/**
 * Compilation context passed from parent to child blocks.
 */
export interface CompilationContext {
  /**
   * Current round number (1-indexed for display).
   * Example: 1, 2, 3 for a 3-round workout.
   */
  round?: number;

  /**
   * Total number of rounds in the workout.
   * Example: 3 for "(3) Pullups, Pushups"
   */
  totalRounds?: number;

  /**
   * Current position within child groups (0-indexed).
   * Example: 0 for first child, 1 for second child.
   */
  position?: number;

  /**
   * Reps for the current round (from rep scheme).
   * Example: 21 for first round of Fran (21-15-9).
   * 
   * Child blocks should use this as default if they don't specify their own reps.
   */
  reps?: number;

  /**
   * Interval duration in milliseconds (for EMOM workouts).
   * Example: 60000 for ":60 EMOM"
   */
  intervalDurationMs?: number;

  /**
   * Parent context (for nested blocks).
   * Allows grandchildren to access grandparent context.
   */
  parent?: CompilationContext;
}
