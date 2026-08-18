import { MemorySearchCriteria } from './IRuntimeMemory';

/**
 * The structure of the value stored within an anchor reference.
 * An anchor's value is a meta-entry that describes how to find the actual data,
 * rather than being the data itself.
 * 
 * This enables dynamic data source resolution and decouples UI components
 * from specific memory reference implementations.
 * 
 * @example
 * ```typescript
 * // Anchor pointing to a timer's time spans
 * const anchorValue: IAnchorValue = {
 *   searchCriteria: {
 *     ownerId: 'stopwatch-block-id',
 *     type: MemoryTypeEnum.TIMER_TIME_SPANS,
 *     id: null,
 *     visibility: null
 *   }
 * };
 * ```
 */
export interface IAnchorValue {
  /**
   * Search criteria used to find the target memory reference(s).
   * This is passed to IRuntimeMemory.search() to resolve the anchor.
   * 
   * Typically specifies ownerId and type to locate the data source.
   * Can be updated at runtime to dynamically change what the anchor points to.
   */
  searchCriteria: Partial<MemorySearchCriteria>;
}
