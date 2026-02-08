/**
 * displayItemAdapters.ts - Convert various data types to IDisplayItem
 * 
 * These adapters form the bridge between source data models and the unified
 * display system. Each adapter handles the specific conversion logic for
 * its data type, ultimately producing IDisplayItem with ICodeFragment arrays.
 * 
 * @see docs/deep-dives/unified-visualization-system.md
 */

import { ICodeStatement } from '../models/CodeStatement';
import { FragmentType } from '../models/CodeFragment';
import { IDisplayItem, DisplayStatus } from '../models/DisplayItem';
import { IOutputStatement } from '../models/OutputStatement';
import { RuntimeSpan } from '../../runtime/models/RuntimeSpan';
import { IRuntimeBlock } from '../../runtime/contracts/IRuntimeBlock';
import { createLabelFragment, fragmentsToLabel } from '../../runtime/utils/metricsToFragments';

// ============================================================================
// Constants
// ============================================================================

/**
 * Header types that should render with header styling
 */
const HEADER_TYPES = new Set([
  'root', 'round', 'interval', 'warmup', 'cooldown',
  'amrap', 'emom', 'tabata', 'group', 'start', 'timer', 'rounds'
]);

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
    if (parent) {
      depth++;
      currentId = parent.parent;
    } else {
      break;
    }
    if (depth > 10) break; // Safety limit
  }

  // Check if this is a linked statement (has group fragment with '+')
  const isLinked = statement.fragments.some(
    f => f.fragmentType === FragmentType.Group && f.image === '+'
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
// RuntimeSpan Adapter
// ============================================================================

/**
 * Convert a RuntimeSpan to IDisplayItem
 * 
 * @param span The runtime span
 */
export function runtimeSpanToDisplayItem(
  span: RuntimeSpan,
  allSpans?: Map<string, RuntimeSpan>
): IDisplayItem {
  const fragments = span.fragments.flat();

  // Map status
  let status: DisplayStatus = 'completed';
  if (span.isActive()) {
    status = 'active';
  } else if (span.status) {
    status = span.status as DisplayStatus;
  }

  // Determine if header based on fragments
  const isHeader = fragments.some(f =>
    f.fragmentType === FragmentType.Timer ||
    f.fragmentType === FragmentType.Rounds ||
    HEADER_TYPES.has(f.type.toLowerCase())
  );

  // Calculate depth
  let depth = 0;
  if (allSpans) {
    let currentParentId = span.parentSpanId;
    const visited = new Set<string>();
    visited.add(span.id);

    while (currentParentId && !visited.has(currentParentId)) {
      visited.add(currentParentId);
      const parent = allSpans.get(currentParentId);
      if (parent) {
        depth++;
        currentParentId = parent.parentSpanId;
      } else {
        break;
      }
      if (depth > 20) break;
    }
  }

  return {
    id: span.id,
    parentId: span.parentSpanId || null,
    fragments,
    depth,
    isHeader,
    status,
    sourceType: 'span',
    sourceId: span.id,
    startTime: span.startTime,
    endTime: span.endTime,
    duration: span.total(),
    label: fragmentsToLabel(span.fragments)
  };
}

/**
 * Convert an array of RuntimeSpans to IDisplayItem array
 */
export function runtimeSpansToDisplayItems(spans: RuntimeSpan[]): IDisplayItem[] {
  const spanMap = new Map(spans.map(s => [s.id, s]));
  return spans.map(span => runtimeSpanToDisplayItem(span, spanMap));
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
  const fragments = block.fragments?.flat() ?? [createLabelFragment(block.label, block.blockType || 'group')];

  const isHeader = HEADER_TYPES.has((block.blockType || '').toLowerCase());

  return {
    id: block.key.toString(),
    parentId: null, // Stack blocks don't have parent relationships in this context
    fragments,
    depth: stackIndex,
    isHeader,
    status: 'active', // Blocks on stack are always active
    sourceType: 'block',
    sourceId: block.key.toString(),
    startTime,
    label: block.label
  };
}

// ============================================================================
// OutputStatement Adapter
// ============================================================================

/**
 * Convert an IOutputStatement to IDisplayItem.
 *
 * OutputStatements carry fragments and stack-level depth natively,
 * so the conversion is straightforward.
 */
export function outputStatementToDisplayItem(
  output: IOutputStatement
): IDisplayItem {
  const fragments = output.fragments.flat();

  // Map outputType → DisplayStatus
  let status: DisplayStatus = 'completed';
  if (output.outputType === 'segment') {
    status = 'active';
  }

  const isHeader = fragments.some(f =>
    f.fragmentType === FragmentType.Timer ||
    f.fragmentType === FragmentType.Rounds ||
    HEADER_TYPES.has(f.type.toLowerCase())
  );

  return {
    id: output.id.toString(),
    parentId: output.parent?.toString() ?? null,
    fragments,
    depth: output.stackLevel,
    isHeader,
    status,
    sourceType: 'record',
    sourceId: output.id,
    startTime: output.timeSpan.started,
    endTime: output.timeSpan.ended,
    duration: output.timeSpan.duration,
    label: fragmentsToLabel(fragments),
  };
}

/**
 * Convert an array of IOutputStatements to IDisplayItem array.
 */
export function outputStatementsToDisplayItems(
  outputs: IOutputStatement[]
): IDisplayItem[] {
  return outputs.map(outputStatementToDisplayItem);
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
 * 
 * Returns array where linked items are grouped into sub-arrays.
 * Non-linked items remain as single items.
 */
export function groupLinkedItems(items: IDisplayItem[]): (IDisplayItem | IDisplayItem[])[] {
  const result: (IDisplayItem | IDisplayItem[])[] = [];
  let currentGroup: IDisplayItem[] = [];

  for (const item of items) {
    if (item.isLinked) {
      // Add to current linked group
      currentGroup.push(item);
    } else {
      // Flush current group if it has items
      if (currentGroup.length > 0) {
        // If only one item, don't wrap in array
        if (currentGroup.length === 1) {
          result.push(currentGroup[0]);
        } else {
          result.push(currentGroup);
        }
        currentGroup = [];
      }
      // Add non-linked item
      result.push(item);
    }
  }

  // Flush remaining group
  if (currentGroup.length > 0) {
    if (currentGroup.length === 1) {
      result.push(currentGroup[0]);
    } else {
      result.push(currentGroup);
    }
  }

  return result;
}

/**
 * Filter items by status
 */
export function filterByStatus(items: IDisplayItem[], statuses: DisplayStatus[]): IDisplayItem[] {
  const statusSet = new Set(statuses);
  return items.filter(item => statusSet.has(item.status));
}

/**
 * Get active items only
 */
export function getActiveItems(items: IDisplayItem[]): IDisplayItem[] {
  return filterByStatus(items, ['active']);
}

/**
 * Get completed items only
 */
export function getCompletedItems(items: IDisplayItem[]): IDisplayItem[] {
  return filterByStatus(items, ['completed', 'failed', 'skipped']);
}

/**
 * Build a tree structure from flat items based on parentId
 */
export interface DisplayItemNode extends IDisplayItem {
  children: DisplayItemNode[];
}

export function buildDisplayTree(items: IDisplayItem[]): DisplayItemNode[] {
  const itemMap = new Map<string, DisplayItemNode>();
  const roots: DisplayItemNode[] = [];

  // First pass: create nodes with empty children
  for (const item of items) {
    itemMap.set(item.id, { ...item, children: [] });
  }

  // Second pass: link children to parents
  for (const item of items) {
    const node = itemMap.get(item.id)!;
    if (item.parentId && itemMap.has(item.parentId)) {
      itemMap.get(item.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}
