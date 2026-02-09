/**
 * Unified Visualization Components
 * 
 * Provides consistent display for workout data regardless of source:
 * - Parsed statements (from parser)
 * - Runtime blocks (from stack)
 * - Execution spans (from history)
 * 
 * @see docs/deep-dives/unified-visualization-system.md
 * @see docs/deep-dives/unified-visualization-implementation-guide.md
 */

// Components
export { UnifiedItemRow, type UnifiedItemRowProps } from './UnifiedItemRow';
export { UnifiedItemList, type UnifiedItemListProps } from './UnifiedItemList';

// Re-export adapters for convenience
export {
  statementToDisplayItem,
  statementsToDisplayItems,
  blockToDisplayItem,
  outputStatementToDisplayItem,
  outputStatementsToDisplayItems,
  sortByStartTime,
  sortByStartTimeDesc,
  groupLinkedItems,
  filterByStatus,
  getActiveItems,
  getCompletedItems,
  buildDisplayTree,
  type DisplayItemNode
} from '@/core/adapters/displayItemAdapters';

// Re-export types
export type {
  IDisplayItem,
  DisplayStatus,
  DisplaySourceType
} from '@/core/models/DisplayItem';

export {
  isActiveItem,
  isCompletedItem,
  isPendingItem,
  isHeaderItem,
  calculateDuration
} from '@/core/models/DisplayItem';
