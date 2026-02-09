import { FragmentType, ICodeFragment, FragmentOrigin } from '../models/CodeFragment';
import { FragmentFilter } from '../contracts/IFragmentSource';

/**
 * Maps each FragmentOrigin to its precedence tier.
 * Lower number = higher precedence.
 *
 * Tier 0: user / collected — explicitly provided by the user
 * Tier 1: runtime / tracked / analyzed — generated during execution
 * Tier 2: compiler / hinted — synthesized during compilation
 * Tier 3: parser — parsed from source text (the "plan")
 */
export const ORIGIN_PRECEDENCE: Record<FragmentOrigin, number> = {
    'user': 0,
    'collected': 0,
    'runtime': 1,
    'tracked': 1,
    'analyzed': 1,
    'compiler': 2,
    'hinted': 2,
    'parser': 3,
};

/**
 * Selects fragments from the highest-precedence (lowest rank) tier.
 *
 * Given a list of fragments (all of the same FragmentType), returns only
 * those from the tier with the best (lowest) precedence rank. If multiple
 * fragments share the winning tier, ALL are returned to support multi-
 * fragment-per-type semantics (e.g., rep scheme 21-15-9).
 *
 * @param fragments Fragments of a single FragmentType
 * @returns The subset from the winning precedence tier
 */
export function selectBestTier(fragments: ICodeFragment[]): ICodeFragment[] {
    let bestRank = Infinity;
    let best: ICodeFragment[] = [];

    for (const f of fragments) {
        const rank = ORIGIN_PRECEDENCE[f.origin ?? 'parser'] ?? 3;
        if (rank < bestRank) {
            bestRank = rank;
            best = [f];
        } else if (rank === bestRank) {
            best.push(f);
        }
    }

    return best;
}

/**
 * Standard fragment precedence resolution algorithm.
 *
 * Rules:
 * 1. Apply optional type/origin/exclude filters
 * 2. Group remaining fragments by FragmentType
 * 3. Within each type, select the highest-precedence tier
 * 4. If multiple fragments exist in the winning tier, keep ALL of them
 * 5. Concatenate results across types, preserving insertion order
 *
 * @param fragments Raw fragments to resolve
 * @param filter Optional filter to restrict results
 * @returns Precedence-resolved, display-ready fragments
 */
export function resolveFragmentPrecedence(
    fragments: ICodeFragment[],
    filter?: FragmentFilter
): ICodeFragment[] {
    // Step 1: Apply filters
    let filtered = fragments;
    if (filter) {
        if (filter.origins) {
            filtered = filtered.filter(f => filter.origins!.includes(f.origin ?? 'parser'));
        }
        if (filter.types) {
            filtered = filtered.filter(f => filter.types!.includes(f.fragmentType));
        }
        if (filter.excludeTypes) {
            filtered = filtered.filter(f => !filter.excludeTypes!.includes(f.fragmentType));
        }
    }

    // Step 2: Group by FragmentType
    const byType = new Map<FragmentType, ICodeFragment[]>();
    for (const f of filtered) {
        const group = byType.get(f.fragmentType) ?? [];
        group.push(f);
        byType.set(f.fragmentType, group);
    }

    // Step 3: For each type, take highest-precedence tier
    const result: ICodeFragment[] = [];
    for (const [, typeFragments] of byType) {
        result.push(...selectBestTier(typeFragments));
    }

    return result;
}
