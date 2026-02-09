import { BaseMemoryEntry } from './BaseMemoryEntry';
import { FragmentDisplayState } from './MemoryTypes';
import { FragmentMemory } from './FragmentMemory';
import { FragmentType, ICodeFragment } from '../../core/models/CodeFragment';
import { IFragmentSource, FragmentFilter } from '../../core/contracts/IFragmentSource';
import { resolveFragmentPrecedence, selectBestTier, ORIGIN_PRECEDENCE } from '../../core/utils/fragmentPrecedence';

/**
 * Display-ready fragment memory that implements IFragmentSource.
 *
 * Reads raw fragment groups from a FragmentMemory entry, flattens them,
 * applies precedence resolution, and exposes the result through the
 * IFragmentSource interface. Subscribes to the source FragmentMemory
 * so that resolved fragments update automatically when raw fragments change.
 *
 * This is the bridge between the raw compilation output (FragmentMemory)
 * and the UI layer, which only needs display-ready, precedence-resolved fragments.
 */
export class DisplayFragmentMemory
    extends BaseMemoryEntry<'fragment:display', FragmentDisplayState>
    implements IFragmentSource
{
    private _unsubscribe?: () => void;

    constructor(
        private readonly _sourceId: string | number,
        source?: FragmentMemory
    ) {
        const flat = source ? source.value.groups.flat() : [];
        const resolved = resolveFragmentPrecedence(flat);

        super('fragment:display', { fragments: flat, resolved });

        // Auto-sync when source changes
        if (source) {
            this._unsubscribe = source.subscribe((newValue) => {
                if (newValue) {
                    const flat = newValue.groups.flat();
                    const resolved = resolveFragmentPrecedence(flat);
                    this.update({ fragments: flat, resolved });
                } else {
                    // Source disposed
                    this.update({ fragments: [], resolved: [] });
                }
            });
        }
    }

    // ── IFragmentSource ───────────────────────────────────────────

    get id(): string | number {
        return this._sourceId;
    }

    getDisplayFragments(filter?: FragmentFilter): ICodeFragment[] {
        return resolveFragmentPrecedence([...this._value.fragments], filter);
    }

    getFragment(type: FragmentType): ICodeFragment | undefined {
        const all = this.getAllFragmentsByType(type);
        return all.length > 0 ? all[0] : undefined;
    }

    getAllFragmentsByType(type: FragmentType): ICodeFragment[] {
        const ofType = this._value.fragments.filter(f => f.fragmentType === type);
        if (ofType.length === 0) return [];

        // Sort by precedence (highest first = lowest rank number first)
        return [...ofType].sort((a, b) => {
            const rankA = ORIGIN_PRECEDENCE[a.origin ?? 'parser'] ?? 3;
            const rankB = ORIGIN_PRECEDENCE[b.origin ?? 'parser'] ?? 3;
            return rankA - rankB;
        });
    }

    hasFragment(type: FragmentType): boolean {
        return this._value.fragments.some(f => f.fragmentType === type);
    }

    get rawFragments(): ICodeFragment[] {
        return [...this._value.fragments];
    }

    // ── Mutation API ──────────────────────────────────────────────

    /**
     * Manually add a fragment (e.g., user-collected or runtime-generated).
     * Re-resolves precedence after adding.
     */
    addFragment(fragment: ICodeFragment): void {
        const fragments = [...this._value.fragments, fragment];
        const resolved = resolveFragmentPrecedence(fragments);
        this.update({ fragments, resolved });
    }

    /**
     * Replace all fragments with a new set and re-resolve precedence.
     */
    setFragments(fragments: ICodeFragment[]): void {
        const resolved = resolveFragmentPrecedence(fragments);
        this.update({ fragments, resolved });
    }

    // ── Lifecycle ─────────────────────────────────────────────────

    dispose(): void {
        this._unsubscribe?.();
        this._unsubscribe = undefined;
        super.dispose();
    }
}
