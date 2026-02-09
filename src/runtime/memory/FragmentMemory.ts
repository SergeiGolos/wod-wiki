import { BaseMemoryEntry } from './BaseMemoryEntry';
import { FragmentState } from './MemoryTypes';
import { ICodeFragment } from '../../core/models/CodeFragment';

/**
 * Memory implementation for fragment groups.
 * 
 * Stores fragments as a 2D array where each inner array is a semantic group
 * (e.g., per-round fragments, per-interval fragments). This preserves the
 * multi-group structure produced by fragment distributors during compilation.
 */
export class FragmentMemory extends BaseMemoryEntry<'fragment', FragmentState> {
    constructor(initialGroups: ICodeFragment[][] = []) {
        super('fragment', { groups: initialGroups });
    }

    /**
     * Adds a fragment to the specified group (default: first group).
     * Creates the group if it doesn't exist.
     */
    addFragment(fragment: ICodeFragment, groupIndex: number = 0): void {
        const groups = [...this._value.groups.map(g => [...g])];
        while (groups.length <= groupIndex) {
            groups.push([]);
        }
        groups[groupIndex] = [...groups[groupIndex], fragment];
        this.update({ groups });
    }

    /**
     * Adds a new fragment group.
     */
    addGroup(fragments: ICodeFragment[]): void {
        this.update({
            groups: [...this._value.groups, fragments]
        });
    }

    /**
     * Clears all fragment groups.
     */
    clear(): void {
        this.update({ groups: [] });
    }

    /**
     * Sets the entire collection of fragment groups.
     */
    setGroups(groups: ICodeFragment[][]): void {
        this.update({ groups });
    }
}
