import { IMemoryEntry } from './IMemoryEntry';
import { FragmentGroupStore } from './FragmentGroupStore';
import { FragmentDisplayState, FragmentState } from './MemoryTypes';
import { IFragmentSource, FragmentFilter } from '../../core/contracts/IFragmentSource';
import { FragmentType, ICodeFragment } from '../../core/models/CodeFragment';
import { resolveFragmentPrecedence, ORIGIN_PRECEDENCE } from '../../core/utils/fragmentPrecedence';

/**
 * Computed view over the FragmentGroupStore that provides:
 * - IMemoryEntry<'fragment:display', FragmentDisplayState> — for getMemory() compatibility
 * - IFragmentSource — grouped query API with visibility filtering
 */
export class FragmentDisplayView
    implements IMemoryEntry<'fragment:display', FragmentDisplayState>, IFragmentSource
{
    readonly type = 'fragment:display' as const;
    private _cachedValue: FragmentDisplayState | null = null;
    private _storeUnsubscribe?: () => void;

    constructor(
        private readonly sourceId: string | number,
        private readonly store: FragmentGroupStore,
        private readonly fragmentGroupIds: string[] = []
    ) {
        this._storeUnsubscribe = store.subscribe(() => {
            this._cachedValue = null;
        });
    }

    // ── IMemoryEntry ──

    get value(): FragmentDisplayState {
        if (!this._cachedValue) {
            this._cachedValue = this.compute();
        }
        return this._cachedValue;
    }

    subscribe(listener: (nv: FragmentDisplayState | undefined, ov: FragmentDisplayState | undefined) => void): () => void {
        return this.store.subscribe(() => {
            const old = this._cachedValue;
            this._cachedValue = null;
            listener(this.value, old ?? undefined);
        });
    }

    // ── IFragmentSource ──

    get id(): string | number { return this.sourceId; }

    getDisplayFragments(filter?: FragmentFilter): ICodeFragment[] {
        const fragments = this.collectFragments(filter);
        return resolveFragmentPrecedence(fragments, filter);
    }

    getFragment(type: FragmentType): ICodeFragment | undefined {
        const all = this.getAllFragmentsByType(type);
        return all.length > 0 ? all[0] : undefined;
    }

    getAllFragmentsByType(type: FragmentType): ICodeFragment[] {
        const fragments = this.collectFragments();
        const ofType = fragments.filter(f => f.fragmentType === type);
        if (ofType.length === 0) return [];

        return [...ofType].sort((a, b) => {
            const rankA = ORIGIN_PRECEDENCE[a.origin ?? 'parser'] ?? 3;
            const rankB = ORIGIN_PRECEDENCE[b.origin ?? 'parser'] ?? 3;
            return rankA - rankB;
        });
    }

    hasFragment(type: FragmentType): boolean {
        return this.collectFragments().some(f => f.fragmentType === type);
    }

    get rawFragments(): ICodeFragment[] {
        return [...this.collectFragments()];
    }

    // ── Mutation API (for backward compat with DisplayFragmentMemory users) ──

    /**
     * Manually add a fragment. Appends to first fragment group.
     */
    addFragment(fragment: ICodeFragment): void {
        if (this.fragmentGroupIds.length === 0) {
            // Create a synthetic group
            const gid = `frag-0`;
            this.fragmentGroupIds.push(gid);
            this.store.upsert(gid, [fragment], 'public');
        } else {
            const gid = this.fragmentGroupIds[0];
            const existing = this.store.get<ICodeFragment[]>(gid) ?? [];
            this.store.upsert(gid, [...existing, fragment], 'public');
        }
    }

    /**
     * Replace all fragments with a new set.
     */
    setFragments(fragments: ICodeFragment[]): void {
        // Clear existing fragment groups
        for (const gid of this.fragmentGroupIds) {
            this.store.remove(gid);
        }
        this.fragmentGroupIds.length = 0;

        // Create a single group
        const gid = 'frag-0';
        this.fragmentGroupIds.push(gid);
        this.store.upsert(gid, fragments, 'public');
    }

    // ── Internals ──

    private compute(): FragmentDisplayState {
        const fragments = this.collectFragments();
        const resolved = resolveFragmentPrecedence(fragments);
        return { fragments, resolved };
    }

    private collectFragments(filter?: FragmentFilter): ICodeFragment[] {
        const fragments: ICodeFragment[] = [];
        for (const gid of this.fragmentGroupIds) {
            const group = this.store.getGroup(gid);
            if (group && Array.isArray(group.value)) {
                const groupFragments = group.value as ICodeFragment[];
                if (filter?.visibility) {
                    fragments.push(...groupFragments.filter(
                        f => (f.visibility ?? 'public') === filter.visibility
                    ));
                } else {
                    fragments.push(...groupFragments);
                }
            }
        }
        return fragments;
    }

    dispose(): void {
        this._storeUnsubscribe?.();
        this._storeUnsubscribe = undefined;
    }
}

/**
 * Computed view for getMemory('fragment') — returns raw fragment groups.
 */
export class FragmentStateView implements IMemoryEntry<'fragment', FragmentState> {
    readonly type = 'fragment' as const;

    constructor(
        private readonly store: FragmentGroupStore,
        private readonly fragmentGroupIds: string[] = []
    ) {}

    get value(): FragmentState {
        const groups: ICodeFragment[][] = [];
        for (const gid of this.fragmentGroupIds) {
            const group = this.store.getGroup(gid);
            if (group && Array.isArray(group.value)) {
                groups.push(group.value as ICodeFragment[]);
            }
        }
        return { groups };
    }

    subscribe(listener: (nv: FragmentState | undefined, ov: FragmentState | undefined) => void): () => void {
        return this.store.subscribe(() => {
            listener(this.value, undefined);
        });
    }
}
