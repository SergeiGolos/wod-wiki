/**
 * Shared utility for managing ICodeFragment arrays and labels.
 * 
 * This utility is used by multiple UI components:
 * - RuntimeEventLog (sectioned log view)
 * - RuntimeHistoryPanel (tree view)
 * - AnalyticsLayout (timeline/graphs)
 */

import { ICodeFragment, FragmentType } from '../../core/models/CodeFragment';

/**
 * Extract a human-readable label from an array of fragments.
 */
export function fragmentsToLabel(fragments: ICodeFragment[] | ICodeFragment[][]): string {
    const first = fragments[0];
    const flat = Array.isArray(first) ? (fragments as ICodeFragment[][]).flat() : (fragments as ICodeFragment[]);

    // Try to find an Effort or Action fragment first
    const primary = flat.find(f => f.fragmentType === FragmentType.Effort || f.fragmentType === FragmentType.Action);
    if (primary) return primary.image || primary.value?.toString() || 'Block';

    // Fallback to first fragment with an image
    const firstWithImage = flat.find(f => f.image);
    if (firstWithImage) return firstWithImage.image || 'Block';

    return 'Block';
}
