/**
 * FragmentVisibility.ts - Categorizes fragment memory tags by visibility level.
 *
 * All `fragment:*` memory tags carry typed fragments on runtime blocks.
 * This module introduces a three-tier visibility classification so the UI,
 * JIT compiler, and runtime can treat fragment memory consistently:
 *
 * | Visibility | Purpose | Example tags |
 * |------------|---------|-------------|
 * | `display`  | Shown on the workout card in the UI (one row per location) | `fragment:display` |
 * | `result`   | Block output fragments collected when the block is popped | `fragment:result` |
 * | `promote`  | Promoted/inherited by child blocks during compilation | `fragment:promote`, `fragment:rep-target` |
 * | `private`  | Internal behavior state; hidden from UI in normal mode | `fragment:tracked`, `fragment:label` |
 *
 * In **debug mode** the UI shows all three tiers, each with a distinguishing
 * icon so developers can inspect the full memory surface of every block.
 */

import { MemoryTag } from './MemoryLocation';

// ---------------------------------------------------------------------------
// Visibility enum
// ---------------------------------------------------------------------------

/**
 * The four visibility tiers for fragment memory tags.
 */
export type FragmentVisibility = 'display' | 'result' | 'promote' | 'private';

// ---------------------------------------------------------------------------
// Classification helpers
// ---------------------------------------------------------------------------

/** Tags whose fragments are rendered in the UI card. */
const DISPLAY_TAGS: ReadonlySet<MemoryTag> = new Set<MemoryTag>([
    'fragment:display',
]);

/** Tags whose fragments are collected as block output on pop/completion. */
const RESULT_TAGS: ReadonlySet<MemoryTag> = new Set<MemoryTag>([
    'fragment:result',
]);

/** Tags whose fragments are promoted/inherited to child blocks. */
const PROMOTE_TAGS: ReadonlySet<MemoryTag> = new Set<MemoryTag>([
    'fragment:promote',
    'fragment:rep-target',
]);

/** Tags whose fragments are internal behavior state. */
const PRIVATE_TAGS: ReadonlySet<MemoryTag> = new Set<MemoryTag>([
    'fragment:tracked',
    'fragment:label',
    'fragment:next',
]);

/**
 * Returns the visibility tier for a given memory tag.
 *
 * - Known `fragment:*` tags are mapped via the static sets above.
 * - Any unknown `fragment:*` tag defaults to `'private'`.
 * - Non-fragment tags (e.g., `'timer'`, `'round'`) return `undefined`.
 */
export function getFragmentVisibility(tag: MemoryTag): FragmentVisibility | undefined {
    if (DISPLAY_TAGS.has(tag)) return 'display';
    if (RESULT_TAGS.has(tag)) return 'result';
    if (PROMOTE_TAGS.has(tag)) return 'promote';
    if (PRIVATE_TAGS.has(tag)) return 'private';

    // Any other `fragment:*` tag is assumed private
    if ((tag as string).startsWith('fragment:')) return 'private';

    // Non-fragment tags have no fragment visibility
    return undefined;
}

/**
 * Returns `true` if the tag belongs to a fragment namespace.
 */
export function isFragmentTag(tag: MemoryTag): boolean {
    return (tag as string).startsWith('fragment:') || tag === 'fragment';
}

/**
 * Filter memory tags by visibility tier.
 */
export function filterTagsByVisibility(
    tags: readonly MemoryTag[],
    visibility: FragmentVisibility
): MemoryTag[] {
    return tags.filter(tag => getFragmentVisibility(tag) === visibility);
}

// ---------------------------------------------------------------------------
// Icons for debug mode
// ---------------------------------------------------------------------------

/**
 * Unicode icon for each visibility tier.
 * Used in debug mode UI to label each fragment row.
 */
export const VISIBILITY_ICONS: Record<FragmentVisibility, string> = {
    display: '👁',   // Eye – publicly visible fragments
    result: '📤',    // Outbox tray – block output on pop
    promote: '⬆',   // Up arrow – promoted to children
    private: '🔒',  // Lock – internal/private state
};

/**
 * Short label for each visibility tier (used in debug badges).
 */
export const VISIBILITY_LABELS: Record<FragmentVisibility, string> = {
    display: 'Display',
    result: 'Result',
    promote: 'Promote',
    private: 'Private',
};
