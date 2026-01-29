import { BaseMemoryEntry } from './BaseMemoryEntry';
import { FragmentState } from './MemoryTypes';
import { ICodeFragment } from '../../core/models/CodeFragment';

/**
 * Memory implementation for inherited fragments.
 * Holds fragments that child blocks should inherit.
 */
export class FragmentMemory extends BaseMemoryEntry<'fragment', FragmentState> {
    constructor(initialFragments: ICodeFragment[] = []) {
        super('fragment', { fragments: initialFragments });
    }

    /**
     * Adds a fragment to the collection.
     */
    addFragment(fragment: ICodeFragment): void {
        this.update({
            fragments: [...this._value.fragments, fragment]
        });
    }

    /**
     * Clears all fragments.
     */
    clear(): void {
        this.update({ fragments: [] });
    }

    /**
     * Sets the entire collection of fragments.
     */
    setFragments(fragments: ICodeFragment[]): void {
        this.update({ fragments });
    }
}
