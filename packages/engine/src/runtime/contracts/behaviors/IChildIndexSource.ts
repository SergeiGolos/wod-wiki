/**
 * Interface for behaviors that expose child iteration position data.
 * 
 * Child index source behaviors track position within a collection of children.
 * The index is typically 0-based and wraps around when reaching the end.
 * 
 * @example Implementations
 * - ChildIndexBehavior: Tracks current child position with wrap detection
 * - ReentryIndexBehavior: Tracks reentry position in special scenarios
 * 
 * @example Usage
 * ```typescript
 * const indexSource = block.getBehavior<IChildIndexSource>(ChildIndexBehavior);
 * const currentIndex = indexSource?.getIndex() ?? 0;
 * const didWrap = indexSource?.hasJustWrapped ?? false;
 * ```
 */
export interface IChildIndexSource {
    /**
     * Gets the current child index (0-based).
     * @returns The current index position, where 0 is the first child
     */
    getIndex(): number;

    /**
     * Indicates if the index just wrapped from the last child back to the first.
     * This is useful for round-based behaviors that increment on wrap.
     */
    readonly hasJustWrapped: boolean;
}

/**
 * Type guard to check if a behavior implements IChildIndexSource
 */
export function isChildIndexSource(behavior: unknown): behavior is IChildIndexSource {
    return (
        typeof behavior === 'object' &&
        behavior !== null &&
        'getIndex' in behavior &&
        typeof (behavior as IChildIndexSource).getIndex === 'function' &&
        'hasJustWrapped' in behavior
    );
}
