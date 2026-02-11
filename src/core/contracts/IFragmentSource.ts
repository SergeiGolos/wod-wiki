import { FragmentType, ICodeFragment, FragmentOrigin, FragmentVisibility } from '../models/CodeFragment';

/**
 * Filter configuration for fragment retrieval.
 */
export interface FragmentFilter {
    /** Only include fragments with these origins */
    origins?: FragmentOrigin[];
    /** Only include these fragment types */
    types?: FragmentType[];
    /** Exclude these fragment types */
    excludeTypes?: FragmentType[];
    /** Only include fragments with this visibility */
    visibility?: FragmentVisibility;
}

/**
 * Unified contract for any data object that provides displayable fragments.
 *
 * Implemented by CodeStatement, OutputStatement, and DisplayFragmentMemory.
 * Consumed directly by UI components — no IDisplayItem adapter layer.
 *
 * All fragment access goes through this interface, ensuring:
 * 1. Consistent precedence resolution
 * 2. Multi-fragment-per-type support
 * 3. Origin-aware filtering
 * 4. Source-type-agnostic UI rendering
 */
export interface IFragmentSource {
    /**
     * Unique identifier for React keys and tracking.
     */
    readonly id: string | number;

    /**
     * Get the "display-ready" fragments after precedence resolution.
     *
     * For each FragmentType present, returns fragments from the highest-
     * precedence origin tier. Multiple fragments of the same type within
     * the winning tier are preserved (e.g., 3 rep fragments for 21-15-9).
     *
     * @param filter Optional filter to restrict which fragments are returned
     */
    getDisplayFragments(filter?: FragmentFilter): ICodeFragment[];

    /**
     * Get the highest-precedence single fragment of a given type.
     *
     * Precedence order: user > runtime > compiler > parser
     *
     * @param type The fragment type to look up
     * @returns The winning fragment, or undefined if none exist
     */
    getFragment(type: FragmentType): ICodeFragment | undefined;

    /**
     * Get ALL fragments of a given type, ordered by precedence (highest first).
     *
     * Use when multiple fragments of the same type are meaningful
     * (e.g., rep scheme 21-15-9, multiple actions in a complex).
     */
    getAllFragmentsByType(type: FragmentType): ICodeFragment[];

    /**
     * Check if any fragment of this type exists (at any precedence level).
     */
    hasFragment(type: FragmentType): boolean;

    /**
     * Access the raw, unfiltered fragments for debugging or advanced use.
     * No precedence resolution applied.
     */
    readonly rawFragments: ICodeFragment[];
}
