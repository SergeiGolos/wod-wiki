# Unified Visualization Implementation Guide

This guide provides step-by-step instructions for implementing the unified visualization system described in the [Unified Visualization System Deep Dive](./unified-visualization-system.md).

## Overview

The implementation is divided into 5 phases, designed to minimize risk and allow incremental migration.

---

## Phase 1: Create Unified Data Model

### Step 1.1: Create DisplayItem Interface

Create the file `src/core/models/DisplayItem.ts`:

```typescript
/**
 * DisplayItem.ts - Unified display model for workout visualization
 * 
 * This interface represents any workout data (parsed statements, runtime blocks,
 * execution history) in a format optimized for consistent UI rendering.
 * 
 * Key principle: All visual data is represented as ICodeFragment[] arrays,
 * ensuring consistent color-coding and styling across all views.
 */

import { ICodeFragment } from './CodeFragment';

/**
 * Status of a display item in the execution lifecycle
 */
export type DisplayStatus = 'pending' | 'active' | 'completed' | 'failed' | 'skipped';

/**
 * Source type indicator for debugging and tooltips
 */
export type DisplaySourceType = 'statement' | 'block' | 'span' | 'record';

/**
 * Unified display item interface
 * 
 * Can represent:
 * - Parsed code statements (from parser)
 * - Active runtime blocks (from stack)
 * - Execution spans (from history)
 */
export interface IDisplayItem {
  // === Identity ===
  /** Unique identifier */
  id: string;
  /** Parent item ID for hierarchy (null for root items) */
  parentId: string | null;
  
  // === Visual Content ===
  /** 
   * Fragments to display - THE KEY FIELD
   * All workout data (timers, reps, exercises, etc.) is converted to fragments
   * for consistent color-coded rendering via FragmentVisualizer
   */
  fragments: ICodeFragment[];
  
  // === Layout ===
  /** Nesting depth for indentation (0 = root level) */
  depth: number;
  /** Whether this item should render as a section header */
  isHeader: boolean;
  /** Whether this item is part of a linked group (+ statements) */
  isLinked?: boolean;
  
  // === State ===
  /** Current execution status */
  status: DisplayStatus;
  
  // === Metadata ===
  /** Original data source type */
  sourceType: DisplaySourceType;
  /** Original source ID for linking back to source data */
  sourceId: string | number;
  
  // === Optional Timing ===
  /** Start timestamp (ms) */
  startTime?: number;
  /** End timestamp (ms) */
  endTime?: number;
  /** Calculated duration (ms) */
  duration?: number;
  
  // === Optional Label ===
  /** Display label (fallback if fragments empty) */
  label?: string;
}

/**
 * Type guard to check if an item is active
 */
export function isActiveItem(item: IDisplayItem): boolean {
  return item.status === 'active';
}

/**
 * Type guard to check if an item is completed
 */
export function isCompletedItem(item: IDisplayItem): boolean {
  return item.status === 'completed' || item.status === 'failed' || item.status === 'skipped';
}

/**
 * Type guard to check if an item is a header
 */
export function isHeaderItem(item: IDisplayItem): boolean {
  return item.isHeader;
}
```

### Step 1.2: Export from Core Module

Update `src/core/models/index.ts` (or create if doesn't exist):

```typescript
export * from './DisplayItem';
// ... other exports
```

---

## Phase 2: Create Adapter Functions

### Step 2.1: Create Adapters File

Create the file `src/core/adapters/displayItemAdapters.ts`:

```typescript
/**
 * displayItemAdapters.ts - Convert various data types to IDisplayItem
 * 
 * These adapters form the bridge between source data models and the unified
 * display system. Each adapter handles the specific conversion logic for
 * its data type, ultimately producing IDisplayItem with ICodeFragment arrays.
 */

import { ICodeStatement } from '../models/CodeStatement';
import { ICodeFragment, FragmentType } from '../models/CodeFragment';
import { IDisplayItem, DisplayStatus } from '../models/DisplayItem';
import { ExecutionSpan, SpanMetrics } from '../../runtime/models/ExecutionSpan';
import { IRuntimeBlock } from '../../runtime/IRuntimeBlock';
import { spanMetricsToFragments, createLabelFragment } from '../../runtime/utils/metricsToFragments';

// ============================================================================
// Statement Adapter
// ============================================================================

/**
 * Convert a parsed CodeStatement to IDisplayItem
 * 
 * @param statement The parsed statement
 * @param allStatements Map of all statements for depth calculation
 * @param status Optional status override (default: 'pending')
 */
export function statementToDisplayItem(
  statement: ICodeStatement,
  allStatements: Map<number, ICodeStatement>,
  status: DisplayStatus = 'pending'
): IDisplayItem {
  // Calculate depth by traversing parent chain
  let depth = 0;
  let currentId = statement.parent;
  const visited = new Set<number>();
  
  while (currentId !== undefined && !visited.has(currentId)) {
    visited.add(currentId);
    const parent = allStatements.get(currentId);
    if (!parent) break;
    depth++;
    currentId = parent.parent;
    if (depth > 10) break; // Safety limit
  }
  
  // Check if this is a linked statement (has lap fragment with '+')
  const isLinked = statement.fragments.some(
    f => f.fragmentType === 'lap' && f.image === '+'
  );
  
  // Determine if this is a header (has children and certain fragment types)
  const hasChildren = statement.children && statement.children.length > 0;
  const hasTimerOrRounds = statement.fragments.some(
    f => f.fragmentType === FragmentType.Timer || f.fragmentType === FragmentType.Rounds
  );
  const isHeader = hasChildren && hasTimerOrRounds;
  
  return {
    id: statement.id.toString(),
    parentId: statement.parent?.toString() ?? null,
    fragments: statement.fragments,
    depth,
    isHeader,
    isLinked,
    status,
    sourceType: 'statement',
    sourceId: statement.id,
    label: statement.fragments.map(f => f.image || '').join(' ').trim() || undefined
  };
}

/**
 * Convert an array of CodeStatements to IDisplayItem array
 */
export function statementsToDisplayItems(
  statements: ICodeStatement[],
  activeIds?: Set<number>
): IDisplayItem[] {
  const statementMap = new Map(statements.map(s => [s.id, s]));
  
  return statements.map(statement => {
    const status: DisplayStatus = activeIds?.has(statement.id) ? 'active' : 'pending';
    return statementToDisplayItem(statement, statementMap, status);
  });
}

// ============================================================================
// ExecutionSpan Adapter
// ============================================================================

/**
 * Header types that should render with header styling
 */
const HEADER_TYPES = new Set([
  'root', 'round', 'interval', 'warmup', 'cooldown', 
  'amrap', 'emom', 'tabata', 'group', 'start'
]);

/**
 * Convert an ExecutionSpan to IDisplayItem
 * 
 * @param span The execution span
 * @param allSpans Map of all spans for depth calculation
 */
export function spanToDisplayItem(
  span: ExecutionSpan,
  allSpans: Map<string, ExecutionSpan>
): IDisplayItem {
  // Calculate depth by traversing parent chain
  let depth = 0;
  let currentParentId = span.parentSpanId;
  const visited = new Set<string>();
  visited.add(span.id);
  
  while (currentParentId && !visited.has(currentParentId)) {
    visited.add(currentParentId);
    const parent = allSpans.get(currentParentId);
    if (!parent) break;
    depth++;
    currentParentId = parent.parentSpanId;
    if (depth > 20) break; // Safety limit
  }
  
  // Convert span metrics to fragments
  const fragments = spanMetricsToFragments(
    span.metrics || {},
    span.label,
    span.type
  );
  
  // Map span status to display status
  const status: DisplayStatus = span.status as DisplayStatus;
  
  // Determine if header based on type
  const isHeader = HEADER_TYPES.has(span.type.toLowerCase());
  
  return {
    id: span.id,
    parentId: span.parentSpanId,
    fragments,
    depth,
    isHeader,
    status,
    sourceType: 'span',
    sourceId: span.blockId,
    startTime: span.startTime,
    endTime: span.endTime,
    duration: span.endTime ? span.endTime - span.startTime : undefined,
    label: span.label
  };
}

/**
 * Convert an array of ExecutionSpans to IDisplayItem array
 */
export function spansToDisplayItems(spans: ExecutionSpan[]): IDisplayItem[] {
  const spanMap = new Map(spans.map(s => [s.id, s]));
  return spans.map(span => spanToDisplayItem(span, spanMap));
}

// ============================================================================
// RuntimeBlock Adapter (for active stack)
// ============================================================================

/**
 * Convert an IRuntimeBlock to IDisplayItem
 * 
 * @param block The runtime block
 * @param stackIndex Index in the runtime stack (used for depth)
 * @param startTime Block start time
 */
export function blockToDisplayItem(
  block: IRuntimeBlock,
  stackIndex: number,
  startTime?: number
): IDisplayItem {
  // Extract fragments from compiled metrics if available
  let fragments: ICodeFragment[] = [];
  
  if (block.compiledMetrics) {
    const { metricsToFragments } = require('../../runtime/utils/metricsToFragments');
    fragments = metricsToFragments([block.compiledMetrics]);
  }
  
  // Fallback to label fragment if no metrics
  if (fragments.length === 0 && block.label) {
    fragments = [createLabelFragment(block.label, block.blockType || 'group')];
  }
  
  const isHeader = HEADER_TYPES.has((block.blockType || '').toLowerCase());
  
  return {
    id: block.key.toString(),
    parentId: stackIndex > 0 ? null : null, // Stack doesn't track parent directly
    fragments,
    depth: stackIndex,
    isHeader,
    status: 'active',
    sourceType: 'block',
    sourceId: block.key.toString(),
    startTime,
    label: block.label
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Sort display items by start time (oldest first)
 */
export function sortByStartTime(items: IDisplayItem[]): IDisplayItem[] {
  return [...items].sort((a, b) => (a.startTime || 0) - (b.startTime || 0));
}

/**
 * Sort display items by start time (newest first)
 */
export function sortByStartTimeDesc(items: IDisplayItem[]): IDisplayItem[] {
  return [...items].sort((a, b) => (b.startTime || 0) - (a.startTime || 0));
}

/**
 * Group linked items together
 */
export function groupLinkedItems(items: IDisplayItem[]): (IDisplayItem | IDisplayItem[])[] {
  const result: (IDisplayItem | IDisplayItem[])[] = [];
  let currentGroup: IDisplayItem[] = [];
  
  for (const item of items) {
    if (currentGroup.length === 0) {
      currentGroup.push(item);
      continue;
    }
    
    const previousItem = currentGroup[currentGroup.length - 1];
    
    // Only group if BOTH are linked
    if (item.isLinked && previousItem.isLinked) {
      currentGroup.push(item);
    } else {
      // Close previous group
      if (currentGroup.length === 1) {
        result.push(currentGroup[0]);
      } else {
        result.push([...currentGroup]);
      }
      currentGroup = [item];
    }
  }
  
  // Push remaining
  if (currentGroup.length === 1) {
    result.push(currentGroup[0]);
  } else if (currentGroup.length > 1) {
    result.push([...currentGroup]);
  }
  
  return result;
}
```

---

## Phase 3: Create Unified Components

### Step 3.1: Create UnifiedItemRow Component

Create the file `src/components/unified/UnifiedItemRow.tsx`:

```typescript
/**
 * UnifiedItemRow.tsx - Single item row for unified visualization
 * 
 * Renders any IDisplayItem consistently, using FragmentVisualizer for
 * the core visual content. Supports both regular rows and header rows.
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { FragmentVisualizer } from '@/views/runtime/FragmentVisualizer';
import { IDisplayItem, isActiveItem, isCompletedItem } from '@/core/models/DisplayItem';

export interface UnifiedItemRowProps {
  /** The item to display */
  item: IDisplayItem;
  
  /** Whether this item is currently selected */
  isSelected?: boolean;
  
  /** Whether this item is highlighted (e.g., on hover) */
  isHighlighted?: boolean;
  
  /** Compact mode for tighter displays */
  compact?: boolean;
  
  /** Whether to show timestamp */
  showTimestamp?: boolean;
  
  /** Whether to show duration */
  showDuration?: boolean;
  
  /** Whether this is part of a grouped display (no outer border) */
  isGrouped?: boolean;
  
  /** Whether this is the last item in a group */
  isLastInGroup?: boolean;
  
  /** Additional actions to render on the right */
  actions?: React.ReactNode;
  
  /** Click handler */
  onClick?: () => void;
  
  /** Hover handlers */
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  
  /** Additional CSS classes */
  className?: string;
}

/**
 * Format timestamp for display
 */
function formatTimestamp(timestamp: number): string {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit' 
  });
}

/**
 * Format duration for display
 */
function formatDuration(ms: number): string {
  if (!ms) return '';
  const seconds = Math.floor(ms / 1000);
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins > 0) return `${mins}m ${secs}s`;
  return `${secs}s`;
}

/**
 * Get status indicator color class
 */
function getStatusColor(item: IDisplayItem): string {
  switch (item.status) {
    case 'active':
      return 'bg-primary animate-pulse';
    case 'completed':
      return 'bg-green-500';
    case 'failed':
      return 'bg-red-500';
    case 'skipped':
      return 'bg-yellow-500';
    default:
      return 'bg-gray-400';
  }
}

export const UnifiedItemRow: React.FC<UnifiedItemRowProps> = ({
  item,
  isSelected = false,
  isHighlighted = false,
  compact = false,
  showTimestamp = false,
  showDuration = false,
  isGrouped = false,
  isLastInGroup = false,
  actions,
  onClick,
  onMouseEnter,
  onMouseLeave,
  className
}) => {
  const indentSize = 16;
  const indentStyle = { paddingLeft: `${item.depth * indentSize}px` };
  
  // Header rendering
  if (item.isHeader) {
    return (
      <div
        className={cn(
          "flex flex-col py-2 mt-2 mb-1 border-b border-border/50 select-none transition-colors",
          isActiveItem(item) && "bg-muted/30",
          isSelected && "bg-primary/10",
          isHighlighted && "bg-accent/10",
          onClick && "cursor-pointer",
          className
        )}
        style={indentStyle}
        onClick={onClick}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        {showTimestamp && item.startTime && (
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <span className="text-xs font-mono opacity-70">
              {formatTimestamp(item.startTime)}
            </span>
            <div className="h-px bg-border flex-1 opacity-50" />
          </div>
        )}
        
        <div className="flex items-center justify-between pl-2">
          <div className="font-semibold text-sm text-foreground">
            {item.label || 'Section'}
          </div>
          
          {item.fragments.length > 0 && (
            <div className="flex-1 ml-4 overflow-hidden">
              <FragmentVisualizer 
                fragments={item.fragments} 
                compact={compact}
                className="gap-1" 
              />
            </div>
          )}
          
          {showDuration && item.duration !== undefined && (
            <div className="text-xs font-mono text-muted-foreground ml-2">
              {formatDuration(item.duration)}
            </div>
          )}
          
          {actions}
        </div>
      </div>
    );
  }
  
  // Regular row rendering
  let containerClass = cn(
    "flex items-center gap-2 transition-colors",
    compact ? "py-1 px-1.5" : "p-2",
    onClick && "cursor-pointer"
  );
  
  if (isGrouped) {
    containerClass = cn(
      containerClass,
      isActiveItem(item) ? 'bg-primary/10' : 'hover:bg-accent/5',
      !isLastInGroup && "border-b border-border"
    );
  } else {
    containerClass = cn(
      containerClass,
      "bg-card rounded border border-border hover:border-primary/50",
      isActiveItem(item) && "bg-primary/10 border-primary",
      isSelected && "ring-2 ring-primary",
      isHighlighted && "bg-accent/10"
    );
  }
  
  return (
    <div
      className={cn(containerClass, className)}
      style={!isGrouped ? indentStyle : undefined}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* Status indicator */}
      <div className={cn(
        "w-2 h-2 rounded-full flex-shrink-0",
        getStatusColor(item)
      )} />
      
      {/* Timestamp */}
      {showTimestamp && item.startTime && (
        <span className="font-mono text-[10px] opacity-40 shrink-0 w-12 text-right">
          {formatTimestamp(item.startTime)}
        </span>
      )}
      
      {/* Label (if present and no fragments) */}
      {item.label && item.fragments.length === 0 && (
        <span className={cn(
          "truncate text-sm font-medium",
          isCompletedItem(item) && "line-through opacity-60"
        )}>
          {item.label}
        </span>
      )}
      
      {/* Fragments */}
      <div className="flex-1 min-w-0">
        <FragmentVisualizer 
          fragments={item.fragments} 
          compact={compact}
          className={compact ? "gap-0.5" : "gap-1"}
        />
      </div>
      
      {/* Duration */}
      {showDuration && item.duration !== undefined && (
        <div className="text-[10px] font-mono opacity-60 shrink-0 ml-2 w-10 text-right">
          {formatDuration(item.duration)}
        </div>
      )}
      
      {/* Actions */}
      {actions && (
        <div className="flex gap-1 shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
};

export default UnifiedItemRow;
```

### Step 3.2: Create UnifiedItemList Component

Create the file `src/components/unified/UnifiedItemList.tsx`:

```typescript
/**
 * UnifiedItemList.tsx - List component for unified visualization
 * 
 * Renders a list of IDisplayItem objects with support for:
 * - Hierarchical indentation
 * - Linked item grouping
 * - Active/selected highlighting
 * - Auto-scroll to active items
 */

import React, { useRef, useEffect, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { IDisplayItem } from '@/core/models/DisplayItem';
import { UnifiedItemRow } from './UnifiedItemRow';
import { groupLinkedItems } from '@/core/adapters/displayItemAdapters';

export interface UnifiedItemListProps {
  /** Items to display */
  items: IDisplayItem[];
  
  /** ID of currently active item */
  activeItemId?: string | null;
  
  /** Set of selected item IDs */
  selectedIds?: Set<string>;
  
  /** Whether to group linked items (+ statements) */
  groupLinked?: boolean;
  
  /** Whether to auto-scroll to active item */
  autoScroll?: boolean;
  
  /** Compact mode for tighter displays */
  compact?: boolean;
  
  /** Whether to show timestamps */
  showTimestamps?: boolean;
  
  /** Whether to show durations */
  showDurations?: boolean;
  
  /** Callback when an item is clicked */
  onSelect?: (id: string) => void;
  
  /** Callback when an item is hovered */
  onHover?: (id: string | null) => void;
  
  /** Custom render function for actions */
  renderActions?: (item: IDisplayItem) => React.ReactNode;
  
  /** Additional CSS classes */
  className?: string;
  
  /** Empty state message */
  emptyMessage?: string;
}

export const UnifiedItemList: React.FC<UnifiedItemListProps> = ({
  items,
  activeItemId,
  selectedIds = new Set(),
  groupLinked = false,
  autoScroll = false,
  compact = false,
  showTimestamps = false,
  showDurations = false,
  onSelect,
  onHover,
  renderActions,
  className,
  emptyMessage = "No items to display"
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Group items if requested
  const groupedItems = useMemo(() => {
    if (!groupLinked) {
      return items.map(item => item); // Return individual items
    }
    return groupLinkedItems(items);
  }, [items, groupLinked]);
  
  // Auto-scroll to bottom when items change
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [items.length, autoScroll]);
  
  // Render a single item
  const renderItem = (item: IDisplayItem, isGrouped = false, isLastInGroup = false) => {
    const isActive = item.id === activeItemId;
    const isSelected = selectedIds.has(item.id);
    
    return (
      <UnifiedItemRow
        key={item.id}
        item={item}
        isSelected={isSelected}
        isHighlighted={isActive}
        isGrouped={isGrouped}
        isLastInGroup={isLastInGroup}
        compact={compact}
        showTimestamp={showTimestamps}
        showDuration={showDurations}
        onClick={() => onSelect?.(item.id)}
        onMouseEnter={() => onHover?.(item.id)}
        onMouseLeave={() => onHover?.(null)}
        actions={renderActions?.(item)}
      />
    );
  };
  
  // Empty state
  if (items.length === 0) {
    return (
      <div className={cn("flex flex-col h-full bg-background", className)}>
        <div className="p-4 text-sm text-muted-foreground italic text-center opacity-50">
          {emptyMessage}
        </div>
      </div>
    );
  }
  
  return (
    <div className={cn("flex flex-col h-full bg-background", className)}>
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto custom-scrollbar px-2 py-2"
      >
        <div className="space-y-2">
          {groupedItems.map((itemOrGroup, index) => {
            // Handle grouped items
            if (Array.isArray(itemOrGroup)) {
              const group = itemOrGroup;
              const firstItem = group[0];
              const indentStyle = { marginLeft: `${firstItem.depth * 1.5}rem` };
              
              return (
                <div 
                  key={`group-${firstItem.id}`}
                  style={indentStyle}
                  className="bg-card rounded border border-border overflow-hidden hover:border-primary/50 transition-colors"
                >
                  {group.map((item, i) => 
                    renderItem(item, true, i === group.length - 1)
                  )}
                </div>
              );
            }
            
            // Handle single item
            const item = itemOrGroup;
            const indentStyle = { marginLeft: `${item.depth * 1.5}rem` };
            
            return (
              <div key={item.id} style={indentStyle}>
                {renderItem(item)}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default UnifiedItemList;
```

### Step 3.3: Create Index Export

Create the file `src/components/unified/index.ts`:

```typescript
/**
 * Unified Visualization Components
 * 
 * These components provide consistent rendering for workout data
 * across all contexts (parsing, execution, history).
 */

export { UnifiedItemRow, type UnifiedItemRowProps } from './UnifiedItemRow';
export { UnifiedItemList, type UnifiedItemListProps } from './UnifiedItemList';
```

---

## Phase 4: Testing & Stories

### Step 4.1: Create Storybook Stories

Create the file `stories/components/UnifiedVisualization.stories.tsx`:

```typescript
import type { Meta, StoryObj } from '@storybook/react';
import { UnifiedItemList, UnifiedItemRow } from '../../src/components/unified';
import { IDisplayItem } from '../../src/core/models/DisplayItem';
import { FragmentType } from '../../src/core/models/CodeFragment';

const meta: Meta<typeof UnifiedItemList> = {
  title: 'Components/Unified Visualization',
  component: UnifiedItemList,
  parameters: {
    layout: 'padded',
  },
};

export default meta;
type Story = StoryObj<typeof UnifiedItemList>;

// Sample items representing different states
const sampleItems: IDisplayItem[] = [
  {
    id: '1',
    parentId: null,
    fragments: [
      { type: 'timer', fragmentType: FragmentType.Timer, value: 300, image: '5:00' },
      { type: 'action', fragmentType: FragmentType.Action, value: 'AMRAP', image: 'AMRAP' },
    ],
    depth: 0,
    isHeader: true,
    status: 'active',
    sourceType: 'span',
    sourceId: 'block-1',
    startTime: Date.now() - 60000,
    label: 'AMRAP 5:00',
  },
  {
    id: '2',
    parentId: '1',
    fragments: [
      { type: 'rep', fragmentType: FragmentType.Rep, value: 10, image: '10x' },
      { type: 'effort', fragmentType: FragmentType.Effort, value: 'Pushups', image: 'Pushups' },
    ],
    depth: 1,
    isHeader: false,
    status: 'completed',
    sourceType: 'span',
    sourceId: 'block-2',
    startTime: Date.now() - 50000,
    duration: 15000,
    label: '10 Pushups',
  },
  {
    id: '3',
    parentId: '1',
    fragments: [
      { type: 'rep', fragmentType: FragmentType.Rep, value: 15, image: '15x' },
      { type: 'effort', fragmentType: FragmentType.Effort, value: 'Situps', image: 'Situps' },
    ],
    depth: 1,
    isHeader: false,
    status: 'active',
    sourceType: 'span',
    sourceId: 'block-3',
    startTime: Date.now() - 35000,
    label: '15 Situps',
  },
  {
    id: '4',
    parentId: '1',
    fragments: [
      { type: 'rep', fragmentType: FragmentType.Rep, value: 20, image: '20x' },
      { type: 'effort', fragmentType: FragmentType.Effort, value: 'Squats', image: 'Squats' },
    ],
    depth: 1,
    isHeader: false,
    status: 'pending',
    sourceType: 'span',
    sourceId: 'block-4',
    label: '20 Squats',
  },
];

export const BasicList: Story = {
  args: {
    items: sampleItems,
    activeItemId: '3',
  },
};

export const WithTimestamps: Story = {
  args: {
    items: sampleItems,
    activeItemId: '3',
    showTimestamps: true,
    showDurations: true,
  },
};

export const CompactMode: Story = {
  args: {
    items: sampleItems,
    activeItemId: '3',
    compact: true,
  },
};

export const EmptyState: Story = {
  args: {
    items: [],
    emptyMessage: 'Start a workout to see execution history',
  },
};
```

---

## Phase 5: Migration Guide

### Migrating RuntimeHistoryLog

Replace the current implementation with the unified components:

```typescript
// src/components/history/RuntimeHistoryLog.tsx

import React, { useMemo, useEffect, useState } from 'react';
import { ScriptRuntime } from '@/runtime/ScriptRuntime';
import { UnifiedItemList } from '@/components/unified';
import { spansToDisplayItems } from '@/core/adapters/displayItemAdapters';

export interface RuntimeHistoryLogProps {
  runtime: ScriptRuntime | null;
  activeStatementIds?: Set<number>;
  highlightedBlockKey?: string | null;
  autoScroll?: boolean;
  className?: string;
}

export const RuntimeHistoryLog: React.FC<RuntimeHistoryLogProps> = ({
  runtime,
  highlightedBlockKey,
  autoScroll = true,
  className
}) => {
  const [updateVersion, setUpdateVersion] = useState(0);

  useEffect(() => {
    if (!runtime) return;
    const unsubscribe = runtime.memory.subscribe(() => setUpdateVersion(v => v + 1));
    const intervalId = setInterval(() => setUpdateVersion(v => v + 1), 100);
    return () => {
      unsubscribe();
      clearInterval(intervalId);
    };
  }, [runtime]);

  const { items, activeItemId } = useMemo(() => {
    if (!runtime) return { items: [], activeItemId: null };
    void updateVersion;

    // Combine completed and active spans
    const allSpans = [
      ...runtime.executionLog,
      ...Array.from(runtime.activeSpans.values())
    ].sort((a, b) => a.startTime - b.startTime);

    // Convert to display items
    const items = spansToDisplayItems(allSpans);

    // Find active item
    const activeItems = items.filter(i => i.status === 'active');
    const activeItemId = activeItems.length > 0 
      ? activeItems[activeItems.length - 1].id 
      : null;

    return { items, activeItemId };
  }, [runtime, updateVersion]);

  return (
    <UnifiedItemList
      items={items}
      activeItemId={activeItemId || highlightedBlockKey}
      autoScroll={autoScroll}
      showTimestamps
      showDurations
      className={className}
      emptyMessage="No events recorded"
    />
  );
};
```

### Migrating WodScriptVisualizer

Replace with unified components:

```typescript
// src/components/WodScriptVisualizer.tsx

import React, { useMemo } from 'react';
import { ICodeStatement } from '../core/models/CodeStatement';
import { UnifiedItemList } from './unified';
import { statementsToDisplayItems } from '@/core/adapters/displayItemAdapters';

export interface WodScriptVisualizerProps {
  statements: ICodeStatement[];
  activeStatementIds?: Set<number>;
  selectedStatementId?: number | null;
  onSelectionChange?: (id: number | null) => void;
  onHover?: (id: number | null) => void;
  className?: string;
}

export const WodScriptVisualizer: React.FC<WodScriptVisualizerProps> = ({
  statements,
  activeStatementIds = new Set(),
  selectedStatementId,
  onSelectionChange,
  onHover,
  className = ''
}) => {
  const items = useMemo(() => {
    return statementsToDisplayItems(statements, activeStatementIds);
  }, [statements, activeStatementIds]);

  const selectedIds = useMemo(() => {
    return selectedStatementId !== undefined && selectedStatementId !== null
      ? new Set([selectedStatementId.toString()])
      : new Set<string>();
  }, [selectedStatementId]);

  return (
    <UnifiedItemList
      items={items}
      selectedIds={selectedIds}
      groupLinked
      onSelect={(id) => onSelectionChange?.(parseInt(id))}
      onHover={(id) => onHover?.(id ? parseInt(id) : null)}
      className={className}
    />
  );
};
```

---

## Verification Checklist

After implementation, verify:

- [ ] FragmentVisualizer colors are consistent across all views
- [ ] Parser view shows statements with proper indentation
- [ ] Execution history shows spans with correct status indicators
- [ ] Active items are highlighted correctly
- [ ] Linked items group properly in parser view
- [ ] Auto-scroll works in history view
- [ ] Compact mode reduces spacing appropriately
- [ ] Empty states display correctly
- [ ] Timestamps and durations format correctly
- [ ] Storybook stories render without errors

---

## Rollback Plan

If issues arise:

1. The original components remain in place until migration is complete
2. New unified components are additive - they don't replace existing code initially
3. Migration can be done one component at a time
4. Adapter functions can be tested independently before component migration
