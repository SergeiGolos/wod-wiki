import { IRuntimeAdapter, ExecutionSnapshot, RuntimeStackBlock, MemoryEntry, MemoryGrouping, ExecutionStatus, BlockType, BlockStatus, MemoryType } from '../types/interfaces';
import { ScriptRuntime } from '../../runtime/ScriptRuntime';
import { IRuntimeBlock } from '../../runtime/IRuntimeBlock';
import { IMemoryReference } from '../../runtime/IMemoryReference';
import { ICodeFragment } from '../../core/models/CodeFragment';

/**
 * Adapter that converts ScriptRuntime state to UI-friendly ExecutionSnapshot
 * Follows TDD principles - implementation makes contract tests pass
 */
export class RuntimeAdapter implements IRuntimeAdapter {

  /**
   * Creates immutable snapshot of runtime state for UI rendering
   */
  createSnapshot(runtime: ScriptRuntime): ExecutionSnapshot {
    const stackBlocks = this.extractStackBlocks(runtime);
    const memoryEntries = this.extractMemoryEntries(runtime);

    // Find active block index
    const activeIndex = stackBlocks.findIndex(block => block.isActive);

    // Group memory entries
    const groupedByOwner = this.groupMemoryEntries(memoryEntries, 'owner');
    const groupedByType = this.groupMemoryEntries(memoryEntries, 'type');

    // Determine execution status
    const status: ExecutionStatus = this.determineExecutionStatus(stackBlocks);

    return {
      stack: {
        blocks: stackBlocks,
        activeIndex: activeIndex >= 0 ? activeIndex : 0,
        depth: stackBlocks.length,
        rootBlockKey: stackBlocks.length > 0 ? stackBlocks[0].key : undefined
      },
      memory: {
        entries: memoryEntries,
        groupedByOwner,
        groupedByType,
        totalEntries: memoryEntries.length
      },
      status,
      metadata: {
        stepCount: 0, // TODO: Track actual step count
        elapsedTime: 0, // TODO: Track actual elapsed time
        lastEvent: undefined,
        lastEventTime: undefined,
        performanceMetrics: {
          snapshotCreationTime: Date.now(),
          renderTime: 0
        }
      },
      timestamp: Date.now()
    };
  }

  /**
   * Extracts RuntimeStackBlocks from runtime stack
   */
  extractStackBlocks(runtime: ScriptRuntime): RuntimeStackBlock[] {
    const blocks = runtime.stack.blocks;

    return blocks.map((block, index) => {
      const blockType = this.mapBlockType(block);
      const isActive = index === blocks.length - 1; // Top of stack is active
      const status = this.determineBlockStatus(isActive);

      // Extract fragments from source statements if available
      const fragments = this.extractBlockFragments(runtime, block);

      return {
        key: block.key.toString(),
        blockType,
        parentKey: this.findParentKey(blocks, index),
        children: this.findChildrenKeys(blocks, block.key.toString()),
        depth: index,
        label: block.label || this.generateBlockLabel(blockType),
        color: this.getBlockColor(blockType),
        icon: this.getBlockIcon(blockType),
        isActive,
        isComplete: status === 'complete',
        status,
        metrics: {}, // TODO: Extract actual metrics
        fragments,
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
   * Extracts fragments from block's source statements for unified visualization
   */
  private extractBlockFragments(_runtime: ScriptRuntime, block: IRuntimeBlock): ICodeFragment[] | undefined {
    // Try to get statements from runtime's compilation context
    if (!block.sourceIds || block.sourceIds.length === 0) {
      return undefined;
    }
    
    // Access the statements through the runtime if available
    // For now, return undefined - the panels will fall back to label display
    // This can be enhanced later when statement lookup is available in runtime
    return undefined;
  }

  /**
   * Extracts MemoryEntries from runtime memory
   */
  extractMemoryEntries(runtime: ScriptRuntime): MemoryEntry[] {
    // Get all memory references - search with null criteria to match all
    const references = runtime.memory.search({
      id: null,
      ownerId: null,
      type: null,
      visibility: null
    });

    // Build a map of owner block IDs to their line numbers
    const ownerLineMap = new Map<string, number>();
    runtime.stack.blocks.forEach(block => {
      if (block.sourceIds && block.sourceIds.length > 0) {
        ownerLineMap.set(block.key.toString(), block.sourceIds[0]);
      }
    });

    return references.map(ref => {
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
        lineNumber: ownerLineMap.get(ref.ownerId),
        isValid: value !== undefined,
        isHighlighted: false, // TODO: Implement highlighting logic
        metadata: {
          createdAt: undefined,
          lastModified: undefined,
          accessCount: undefined
        },
        references: [], // TODO: Track memory references
        referencedBy: []
      };
    });
  }

  /**
   * Groups memory entries by specified grouping strategy
   */
  groupMemoryEntries(entries: MemoryEntry[], groupBy: MemoryGrouping): Map<string, MemoryEntry[]> {
    const groups = new Map<string, MemoryEntry[]>();

    if (groupBy === 'none') {
      groups.set('All Entries', entries);
      return groups;
    }

    for (const entry of entries) {
      let groupKey: string;

      switch (groupBy) {
        case 'owner':
          groupKey = entry.ownerLabel || entry.ownerId;
          break;
        case 'type':
          groupKey = entry.type;
          break;
        default:
          groupKey = 'Unknown';
      }

      if (!groups.has(groupKey)) {
        groups.set(groupKey, []);
      }
      groups.get(groupKey)!.push(entry);
    }

    return groups;
  }

  // Helper methods

  private determineExecutionStatus(stackBlocks: RuntimeStackBlock[]): ExecutionStatus {
    if (stackBlocks.length === 0) {
      return 'idle';
    }

    const hasActiveBlock = stackBlocks.some(block => block.isActive);
    if (hasActiveBlock) {
      return 'executing';
    }

    return 'idle';
  }

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

  private determineBlockStatus(isActive: boolean): BlockStatus {
    if (isActive) {
      return 'active';
    }
    // TODO: Implement proper status detection based on block state
    return 'pending';
  }

  private findParentKey(blocks: readonly IRuntimeBlock[], currentIndex: number): string | undefined {
    if (currentIndex === 0) return undefined;
    return blocks[currentIndex - 1].key.toString();
  }

  private findChildrenKeys(_blocks: readonly IRuntimeBlock[], _parentKey: string): string[] {
    // TODO: Implement proper children detection based on block hierarchy
    return [];
  }

  private generateBlockLabel(blockType: BlockType): string {
    return `${blockType.charAt(0).toUpperCase() + blockType.slice(1)} Block`;
  }

  private getBlockColor(blockType: BlockType): string {
    const colors: Record<BlockType, string> = {
      workout: '#3B82F6', // blue
      group: '#10B981',   // green
      timer: '#F59E0B',   // yellow
      rounds: '#8B5CF6',  // purple
      effort: '#EF4444',  // red
      exercise: '#06B6D4', // cyan
      custom: '#6B7280'   // gray
    };
    return colors[blockType];
  }

  private getBlockIcon(blockType: BlockType): string | undefined {
    const icons: Partial<Record<BlockType, string>> = {
      workout: '🏋️',
      timer: '⏱️',
      rounds: '🔄',
      exercise: '💪'
    };
    return icons[blockType];
  }

  private mapMemoryType(type: string): MemoryType {
    if (!type) return 'unknown';
    const lowerType = type.toLowerCase();

    if (lowerType.includes('metric')) return 'metric';
    if (lowerType.includes('timer')) return 'timer-state';
    if (lowerType.includes('loop')) return 'loop-state';
    if (lowerType.includes('group')) return 'group-state';
    if (lowerType.includes('handler')) return 'handler';
    if (lowerType.includes('span')) return 'span';

    return 'unknown'; // default
  }

  private generateOwnerLabel(ownerId: string): string | undefined {
    // TODO: Implement proper owner label generation
    return ownerId;
  }

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

  private generateMemoryLabel(ref: IMemoryReference, memoryType: MemoryType): string {
    return `${memoryType}: ${ref.id}`;
  }

  private generateGroupLabel(memoryType: MemoryType): string | undefined {
    return memoryType;
  }

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
