import { FragmentVisibility } from '../../core/models/CodeFragment';

/**
 * A typed fragment group stored in the block's memory.
 * The `value` field holds the domain-specific state (TimerState, RoundState, etc.)
 */
export interface FragmentGroup<V = unknown> {
    readonly id: string;
    readonly value: V;
    readonly visibility: FragmentVisibility;
}

type GroupListener<V> = (newValue: V | undefined, oldValue: V | undefined) => void;

/**
 * Unified store for all block state.
 *
 * Each MemoryType key maps to a named group.
 * The store supports per-group subscriptions (for IMemoryEntry compatibility)
 * and whole-store subscriptions (for aggregated views).
 */
export class FragmentGroupStore {
    private _groups = new Map<string, FragmentGroup>();
    private _listeners = new Map<string, Set<GroupListener<any>>>();
    private _globalListeners = new Set<() => void>();

    // ── Queries ──

    /** Get a group by id, returning its value */
    get<V>(id: string): V | undefined {
        return this._groups.get(id)?.value as V | undefined;
    }

    /** Get a group entry (id, value, visibility) */
    getGroup(id: string): FragmentGroup | undefined {
        return this._groups.get(id);
    }

    /** Check if a group exists */
    has(id: string): boolean {
        return this._groups.has(id);
    }

    /** All group ids */
    keys(): string[] {
        return Array.from(this._groups.keys());
    }

    /** All groups */
    all(): FragmentGroup[] {
        return Array.from(this._groups.values());
    }

    /** Only groups with public visibility */
    public(): FragmentGroup[] {
        return this.all().filter(g => g.visibility === 'public');
    }

    // ── Mutations ──

    /** Upsert a group by id. Notifies per-group and global listeners. */
    upsert<V>(id: string, value: V, visibility: FragmentVisibility = 'public'): void {
        const oldGroup = this._groups.get(id);
        const oldValue = oldGroup?.value as V | undefined;
        const group: FragmentGroup<V> = { id, value, visibility };
        this._groups.set(id, group);
        this.notifyGroup(id, value, oldValue);
        this.notifyGlobal();
    }

    /** Remove a group by id. Notifies listeners with undefined. */
    remove(id: string): void {
        const old = this._groups.get(id);
        if (old) {
            this._groups.delete(id);
            this.notifyGroup(id, undefined, old.value);
            this.notifyGlobal();
        }
    }

    /** Clear all groups. */
    clear(): void {
        const entries = Array.from(this._groups.entries());
        this._groups.clear();
        for (const [id, group] of entries) {
            this.notifyGroup(id, undefined, group.value);
        }
        this.notifyGlobal();
    }

    // ── Subscriptions ──

    /** Subscribe to changes on a specific group (IMemoryEntry compatibility) */
    subscribeGroup<V>(id: string, listener: GroupListener<V>): () => void {
        if (!this._listeners.has(id)) {
            this._listeners.set(id, new Set());
        }
        this._listeners.get(id)!.add(listener);
        return () => this._listeners.get(id)?.delete(listener);
    }

    /** Subscribe to any change across the store */
    subscribe(listener: () => void): () => void {
        this._globalListeners.add(listener);
        return () => this._globalListeners.delete(listener);
    }

    // ── Disposal ──

    dispose(): void {
        this.clear();
        this._listeners.clear();
        this._globalListeners.clear();
    }

    // ── Internals ──

    private notifyGroup<V>(id: string, newValue: V | undefined, oldValue: V | undefined): void {
        const listeners = this._listeners.get(id);
        if (listeners) {
            for (const l of listeners) l(newValue, oldValue);
        }
    }

    private notifyGlobal(): void {
        for (const l of this._globalListeners) l();
    }
}
