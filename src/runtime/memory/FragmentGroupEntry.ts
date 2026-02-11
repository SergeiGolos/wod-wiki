import { IMemoryEntry } from './IMemoryEntry';
import { FragmentGroupStore } from './FragmentGroupStore';

/**
 * Adapts a single FragmentGroupStore group to the IMemoryEntry interface.
 *
 * This is the bridge that lets existing code call:
 *   block.getMemory('timer')?.value      → reads from store
 *   block.getMemory('timer')?.subscribe  → subscribes to store group
 *
 * Created on demand by RuntimeBlock.getMemory().
 */
export class FragmentGroupEntry<T extends string, V> implements IMemoryEntry<T, V> {
    constructor(
        readonly type: T,
        private readonly store: FragmentGroupStore,
        private readonly groupId: string
    ) {}

    get value(): V {
        return this.store.get<V>(this.groupId) as V;
    }

    subscribe(listener: (newValue: V | undefined, oldValue: V | undefined) => void): () => void {
        return this.store.subscribeGroup<V>(this.groupId, listener);
    }
}
