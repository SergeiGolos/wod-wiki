/**
 * MetricVisibility.ts - Categorizes metrics memory tags by visibility level.
 *
 * All `metrics:*` memory tags carry typed metrics on runtime blocks.
 * This module introduces a three-tier visibility classification so the UI,
 * JIT compiler, and runtime can treat metrics memory consistently:
 *
 * | Visibility | Purpose | Example tags |
 * |------------|---------|-------------|
 * | `display`  | Shown on the workout card in the UI (one row per location) | `metrics:display` |
 * | `result`   | Block output metric collected when the block is popped | `metric:result` |
 * | `promote`  | Promoted/inherited by child blocks during compilation | `metric:promote`, `metric:rep-target` |
 * | `private`  | Internal behavior state; hidden from UI in normal mode | `metric:tracked`, `metric:label` |
 *
 * In **debug mode** the UI shows all three tiers, each with a distinguishing
 * icon so developers can inspect the full memory surface of every block.
 */

import { MemoryTag } from './MemoryLocation';

// ---------------------------------------------------------------------------
// Visibility enum
// ---------------------------------------------------------------------------

/**
 * The four visibility tiers for metrics memory tags.
 */
export type MetricVisibility = 'display' | 'result' | 'promote' | 'private';

// ---------------------------------------------------------------------------
// Classification helpers
// ---------------------------------------------------------------------------

/** Tags whose metrics are rendered in the UI card. */
const DISPLAY_TAGS: ReadonlySet<MemoryTag> = new Set<MemoryTag>([
    'metric:display',
]);

/** Tags whose metrics are collected as block output on pop/completion. */
const RESULT_TAGS: ReadonlySet<MemoryTag> = new Set<MemoryTag>([
    'metric:result',
]);

/** Tags whose metrics are promoted/inherited to child blocks. */
const PROMOTE_TAGS: ReadonlySet<MemoryTag> = new Set<MemoryTag>([
    'metric:promote',
    'metric:rep-target',
]);

/** Tags whose metrics are internal behavior state. */
const PRIVATE_TAGS: ReadonlySet<MemoryTag> = new Set<MemoryTag>([
    'metric:tracked',
    'metric:label',
    'metric:next',
]);

/**
 * Returns the visibility tier for a given memory tag.
 *
 * - Known `metrics:*` tags are mapped via the static sets above.
 * - Any unknown `metric:*` tag defaults to `'private'`.
 * - Non-metric tags (e.g., `'timer'`, `'round'`) return `undefined`.
 */
export function getMetricVisibility(tag: MemoryTag): MetricVisibility | undefined {
    if (DISPLAY_TAGS.has(tag)) return 'display';
    if (RESULT_TAGS.has(tag)) return 'result';
    if (PROMOTE_TAGS.has(tag)) return 'promote';
    if (PRIVATE_TAGS.has(tag)) return 'private';

    // Any other `metrics:*` tag is assumed private
    if ((tag as string).startsWith('metric:')) return 'private';

    // Non-metrics tags have no metrics visibility
    return undefined;
}

/**
 * Returns `true` if the tag belongs to a metrics namespace.
 */
export function isFragmentTag(tag: MemoryTag): boolean {
    return (tag as string).startsWith('metric:') || tag ===   'metric';
}

/**
 * Filter memory tags by visibility tier.
 */
export function filterTagsByVisibility(
    tags: readonly MemoryTag[],
    visibility: MetricVisibility
): MemoryTag[] {
    return tags.filter(tag => getMetricVisibility(tag) === visibility);
}

// ---------------------------------------------------------------------------
// Icons for debug mode
// ---------------------------------------------------------------------------

/**
 * Unicode icon for each visibility tier.
 * Used in debug mode UI to label each metrics row.
 */
export const VISIBILITY_ICONS: Record<MetricVisibility, string> = {
    display: '👁',   // Eye – publicly visible metric
    result: '📤',    // Outbox tray – block output on pop
    promote: '⬆',   // Up arrow – promoted to children
    private: '🔒',  // Lock – internal/private state
};

/**
 * Short label for each visibility tier (used in debug badges).
 */
export const VISIBILITY_LABELS: Record<MetricVisibility, string> = {
    display: 'Display',
    result: 'Result',
    promote: 'Promote',
    private: 'Private',
};
