import type { IMemoryReference } from '../memory';
import { IBehavior } from './IBehavior';

/**
 * AllocateChildren - Reads child elements and identifies grouping based on Lap fragments.
 * 
 * Functions:
 * - Parses child nodes and groups them as multiple code blocks into single runtime blocks
 * - Handles "+" lap values for proper block grouping
 * - Pushes a string[][] collection onPush to memory with SourceIds of the blocks in each group
 * 
 * Used By: RootBlock, BoundedLoopingBlock, BoundedLoopingParentBlock, TimeBoundedLoopingBlock
 */
export interface IAllocateChildrenBehavior extends IBehavior {
    /**
     * Memory allocations:
     * - children-groups (private): string[][] - SourceIds of blocks grouped by lap fragments
     */
    
    /**
     * Get the children groups from memory
     */
    getChildrenGroups(): string[][];
    
    /**
     * Get the children groups memory reference
     */
    getChildrenGroupsReference(): IMemoryReference<string[][]> | undefined;
    
    /**
     * Parse child nodes and identify grouping based on lap fragments
     */
    parseChildrenGroups(childSourceIds: string[]): string[][];
}