/**
 * RuntimeSelectors - Class-based selector methods for transforming ScriptRuntime state
 * 
 * Replaces the 301-line RuntimeAdapter with focused, testable selector methods.
 * Each method is self-contained and transforms runtime state into UI-friendly structures.
 * 
 * Architecture Decision: Class-based (not pure functions) to allow:
 * - Shared helper methods
 * - Future caching/memoization strategies
 * - Consistent formatting logic
 * 
 * Phase: 1.2 Foundation - Infrastructure
 */

import type { ScriptRuntime } from '../../runtime/ScriptRuntime';
import type { IRuntimeBlock } from '../../runtime/contracts/IRuntimeBlock';
import type { IMemoryReference } from '../../runtime/contracts/IMemoryReference';
import type {
  RuntimeStackBlock,
  BlockType,
  BlockStatus,
  MemoryEntry,
  MemoryType,
  ExecutionStatus
} from '../types/interfaces';
import { searchStackMemory } from '../../runtime/utils/MemoryUtils';

/**
 * Transforms ScriptRuntime state into UI-friendly data structures
 * 
 * Usage:
 * ```typescript
 * const blocks = runtimeSelectors.selectBlocks(runtime);
 * const memory = runtimeSelectors.selectMemory(runtime);
 * const status = runtimeSelectors.selectStatus(runtime);
 * ```
 */
export class RuntimeSelectors {
  /**
   * Extracts RuntimeStackBlocks from runtime stack
   * 
   * Transforms IRuntimeBlock[] into UI-friendly RuntimeStackBlock[] with:
   * - Display properties (label, color, icon)
   * - Hierarchy information (parentKey, children, depth)
   * - State flags (isActive, isComplete, status)
   * 
   * @param runtime - The ScriptRuntime instance
   * @returns Array of UI-friendly RuntimeStackBlock objects
   */
  selectBlocks(runtime: ScriptRuntime): RuntimeStackBlock[] {
    const blocks = runtime.stack.blocks;

    return blocks.map((block, index) => {
      const blockType = this.mapBlockType(block);
      const isActive = index === blocks.length - 1; // Top of stack is active
      const status = this.determineBlockStatus(isActive);

      return {
        key: block.key.toString(),
        blockType,
        parentKey: this.findParentKey(blocks, index),
        children: this.findChildrenKeys(blocks, block.key.toString()),
        depth: index,
        label: this.generateBlockLabel(blockType),
        color: this.getBlockColor(blockType),
        icon: this.getBlockIcon(blockType),
        isActive,
        isComplete: status === 'complete',
        status,
        metrics: {}, // TODO: Extract actual metrics
        sourceIds: block.sourceIds,
        lineNumber: block.sourceIds.length > 0 ? block.sourceIds[0] : undefined,
        metadata: {
          mountTime: undefined,
          executionTime: undefined,
          iterationCount: undefined
        }
      };
    });
  }

  /**
   * Extracts MemoryEntries from runtime memory
   * 
   * Transforms IMemoryReference[] into UI-friendly MemoryEntry[] with:
   * - Formatted values
   * - Display properties (label, icon, groupLabel)
   * - Ownership information (ownerId, ownerLabel)
   * 
   * @param runtime - The ScriptRuntime instance
   * @returns Array of UI-friendly MemoryEntry objects
   */
  selectMemory(runtime: ScriptRuntime): MemoryEntry[] {
    // Get all memory references from blocks on the stack
    const references = searchStackMemory(runtime, {});

    return references.map(ref => this.adaptMemoryEntry(ref));
  }

  /**
   * Determines current execution status from runtime state
   * 
   * Status logic:
   * - 'idle': No blocks on stack
   * - 'executing': Has blocks on stack with active block
   * - 'idle': Has blocks but no active block (fallback)
   * 
   * @param runtime - The ScriptRuntime instance
   * @returns Current execution status
   */
  selectStatus(runtime: ScriptRuntime): ExecutionStatus {
    const blocks = runtime.stack.blocks;

    if (blocks.length === 0) {
      return 'idle';
    }

    // Check if there's an active block (top of stack)
    const hasActiveBlock = blocks.length > 0;
    if (hasActiveBlock) {
      return 'executing';
    }

    return 'idle';
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  /**
   * Transforms IMemoryReference into UI-friendly MemoryEntry
   */
  private adaptMemoryEntry(ref: IMemoryReference): MemoryEntry {
    const value = ref.value();
    const memoryType = this.mapMemoryType(ref.type);

    return {
      id: ref.id,
      ownerId: ref.ownerId,
      ownerLabel: this.generateOwnerLabel(ref.ownerId),
      type: memoryType,
      value,
      valueFormatted: this.formatValue(value),
      label: this.generateMemoryLabel(ref, memoryType),
      groupLabel: this.generateGroupLabel(memoryType),
      icon: this.getMemoryIcon(memoryType),
      isValid: value !== undefined,
      isHighlighted: false, // Highlighting managed by context
      metadata: {
        createdAt: undefined,
        lastModified: undefined,
        accessCount: undefined
      },
      references: [], // TODO: Track memory references
      referencedBy: []
    };
  }

  /**
   * Maps IRuntimeBlock.blockType to UI BlockType enum
   */
  private mapBlockType(block: IRuntimeBlock): BlockType {
    const blockType = block.blockType?.toLowerCase();

    switch (blockType) {
      case 'workout': return 'workout';
      case 'group': return 'group';
      case 'timer': return 'timer';
      case 'rounds': return 'rounds';
      case 'effort': return 'effort';
      case 'exercise': return 'exercise';
      default: return 'custom';
    }
  }

  /**
   * Maps IMemoryReference.type to UI MemoryType enum
   */
  private mapMemoryType(type: string): MemoryType {
    const lowerType = type.toLowerCase();

    if (lowerType.includes('metric')) return 'metric';
    if (lowerType.includes('timer')) return 'timer-state';
    if (lowerType.includes('loop')) return 'loop-state';
    if (lowerType.includes('group')) return 'group-state';
    if (lowerType.includes('handler')) return 'handler';
    if (lowerType.includes('span')) return 'span';

    return 'unknown';
  }

  /**
   * Determines block status based on active state
   * TODO: Implement proper status detection based on block state
   */
  private determineBlockStatus(isActive: boolean): BlockStatus {
    if (isActive) {
      return 'active';
    }
    return 'pending';
  }

  /**
   * Finds parent key for a block at given index
   */
  private findParentKey(blocks: readonly IRuntimeBlock[], currentIndex: number): string | undefined {
    if (currentIndex === 0) return undefined;
    return blocks[currentIndex - 1].key.toString();
  }

  /**
   * Finds children keys for a parent block
   * TODO: Implement proper children detection based on block hierarchy
   */
  private findChildrenKeys(_blocks: readonly IRuntimeBlock[], _parentKey: string): string[] {
    return [];
  }

  /**
   * Generates display label for block type
   */
  private generateBlockLabel(blockType: BlockType): string {
    return `${blockType.charAt(0).toUpperCase() + blockType.slice(1)} Block`;
  }

  /**
   * Gets color for block type
   */
  private getBlockColor(blockType: BlockType): string {
    const colors: Record<BlockType, string> = {
      workout: '#3B82F6',   // blue
      group: '#10B981',     // green
      timer: '#F59E0B',     // yellow
      rounds: '#8B5CF6',    // purple
      effort: '#EF4444',    // red
      exercise: '#06B6D4',  // cyan
      custom: '#6B7280'     // gray
    };
    return colors[blockType];
  }

  /**
   * Gets icon for block type
   */
  private getBlockIcon(blockType: BlockType): string | undefined {
    const icons: Partial<Record<BlockType, string>> = {
      workout: '🏋️',
      timer: '⏱️',
      rounds: '🔄',
      exercise: '💪'
    };
    return icons[blockType];
  }

  /**
   * Generates owner label from ownerId
   * TODO: Implement proper owner label generation
   */
  private generateOwnerLabel(ownerId: string): string | undefined {
    return ownerId;
  }

  /**
   * Formats value for display
   */
  private formatValue(value: any): string {
    if (value === undefined || value === null) {
      return 'undefined';
    }

    if (typeof value === 'string') {
      return `"${value}"`;
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
      return value.toString();
    }

    if (Array.isArray(value)) {
      return `Array(${value.length})`;
    }

    if (typeof value === 'object') {
      return `{${Object.keys(value).length} properties}`;
    }

    return typeof value;
  }

  /**
   * Generates memory entry label
   */
  private generateMemoryLabel(ref: IMemoryReference, memoryType: MemoryType): string {
    return `${memoryType}: ${ref.id}`;
  }

  /**
   * Generates group label for memory type
   */
  private generateGroupLabel(memoryType: MemoryType): string | undefined {
    return memoryType;
  }

  /**
   * Gets icon for memory type
   */
  private getMemoryIcon(memoryType: MemoryType): string | undefined {
    const icons: Record<MemoryType, string> = {
      metric: '📊',
      'timer-state': '⏱️',
      'loop-state': '🔄',
      'group-state': '📁',
      handler: '⚙️',
      span: '📏',
      unknown: '❓'
    };
    return icons[memoryType];
  }
}

/**
 * Module-level singleton instance
 * 
 * Usage:
 * ```typescript
 * import { runtimeSelectors } from './selectors/runtime-selectors';
 * 
 * const blocks = runtimeSelectors.selectBlocks(runtime);
 * ```
 */
export const runtimeSelectors = new RuntimeSelectors();
