import { ICodeFragment } from '../../core/models/CodeFragment';

/**
 * Tags for memory locations. A block can have multiple locations with the same tag.
 * Tags replace the previous MemoryType keys but are no longer unique per block.
 *
 * Fragment tags follow the `fragment:*` namespace convention and are classified
 * into three visibility tiers:
 *
 * | Tier      | Tags                                     | Purpose                          |
 * |-----------|------------------------------------------|----------------------------------|
 * | display   | `fragment:display`                       | Shown on UI cards                |
 * | promote   | `fragment:promote`, `fragment:rep-target` | Inherited by child blocks       |
 * | private   | `fragment:tracked`, `fragment:label`      | Internal behavior state          |
 *
 * @see FragmentVisibility for classification helpers.
 */
export type MemoryTag =
    | 'timer'
    | 'round'
    | 'completion'
    | 'display'
    | 'controls'
    | 'fragment'
    // fragment:display — public fragments rendered on the UI card
    | 'fragment:display'
    // fragment:promote — fragments promoted/inherited to child blocks
    | 'fragment:promote'
    | 'fragment:rep-target'
    // fragment:private — internal behavior state (not shown in normal UI)
    | 'fragment:tracked'
    | 'fragment:label';

/**
 * A single memory location in a block's memory list.
 *
 * Memory locations are the fundamental unit of state storage in the runtime.
 * Multiple locations with the same tag can coexist, enabling:
 * - Multiple timers per block
 * - Multiple display rows per block (fragment:display)
 * - Multiple round counters
 *
 * All memory values are ICodeFragment[] — fragments are the universal currency.
 */
export interface IMemoryLocation {
    /** Discriminator tag — multiple locations can share the same tag */
    readonly tag: MemoryTag;

    /** The fragment data stored at this location */
    readonly fragments: ICodeFragment[];

    /** Subscribe to changes at this location */
    subscribe(listener: (newValue: ICodeFragment[], oldValue: ICodeFragment[]) => void): () => void;

    /** Update the fragments at this location */
    update(fragments: ICodeFragment[]): void;

    /** Dispose of this location and notify subscribers */
    dispose(): void;
}

/**
 * Concrete implementation of a memory location.
 *
 * Provides observable state storage with subscription management.
 * When disposed, sends empty array to all subscribers for cleanup.
 */
export class MemoryLocation implements IMemoryLocation {
    private _listeners = new Set<(nv: ICodeFragment[], ov: ICodeFragment[]) => void>();
    private _fragments: ICodeFragment[];
    private _isDisposed = false;

    constructor(
        public readonly tag: MemoryTag,
        initialFragments: ICodeFragment[] = []
    ) {
        this._fragments = initialFragments;
    }

    get fragments(): ICodeFragment[] {
        return this._fragments;
    }

    update(fragments: ICodeFragment[]): void {
        if (this._isDisposed) {
            console.warn(`Attempted to update disposed MemoryLocation with tag '${this.tag}'`);
            return;
        }

        const old = this._fragments;
        this._fragments = fragments;

        // Notify all listeners
        for (const listener of this._listeners) {
            listener(fragments, old);
        }
    }

    subscribe(listener: (nv: ICodeFragment[], ov: ICodeFragment[]) => void): () => void {
        if (this._isDisposed) {
            console.warn(`Attempted to subscribe to disposed MemoryLocation with tag '${this.tag}'`);
            return () => {}; // No-op unsubscribe
        }

        this._listeners.add(listener);
        return () => this._listeners.delete(listener);
    }

    dispose(): void {
        if (this._isDisposed) {
            return; // Multiple dispose calls are safe
        }

        this._isDisposed = true;
        const old = this._fragments;
        this._fragments = [];

        // Notify all listeners about disposal
        for (const listener of this._listeners) {
            listener([], old);
        }

        this._listeners.clear();
    }
}
