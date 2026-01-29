/**
 * Runtime Components
 * 
 * React components that use the behavior-based hooks to display
 * runtime block state.
 * 
 * These components accept IRuntimeBlock objects directly and use
 * the new hooks (useTimerDisplay, useRoundDisplay, etc.) for
 * reactive state updates.
 * 
 * @see useTimerDisplay
 * @see useRoundDisplay
 * @see useBlockMemory
 */

export { BlockTimerDisplay, type BlockTimerDisplayProps } from './BlockTimerDisplay';
