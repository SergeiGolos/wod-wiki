import { ICodeFragment, FragmentType } from '../../core/models/CodeFragment';
import { MetricBehavior } from '../../types/MetricBehavior';

export type FragmentChangeListener = (fragments: readonly ICodeFragment[]) => void;

/**
 * Observable collection of fragments that serves as the state model
 * for typed blocks.
 *
 * Fragments are classified by their `behavior` field:
 * - Defined/Hint → Plan (what the script says)
 * - Recorded → Record (what happened at runtime)
 * - Calculated → Analysis (derived results)
 */
export class FragmentBucket {
    private _fragments: ICodeFragment[] = [];
    private _listeners = new Set<FragmentChangeListener>();

    constructor(initialFragments: ICodeFragment[] = []) {
        this._fragments = [...initialFragments];
    }

    get all(): readonly ICodeFragment[] {
        return this._fragments;
    }

    get count(): number {
        return this._fragments.length;
    }

    /** Plan fragments (Defined, Hint) from parser/compiler */
    getPlan(): ICodeFragment[] {
        return this._fragments.filter(f =>
            f.behavior === MetricBehavior.Defined ||
            f.behavior === MetricBehavior.Hint ||
            (f.origin === 'parser' && !f.behavior) ||
            (f.origin === 'compiler' && !f.behavior)
        );
    }

    /** Record fragments (Recorded) from runtime execution */
    getRecord(): ICodeFragment[] {
        return this._fragments.filter(f =>
            f.behavior === MetricBehavior.Recorded ||
            (f.origin === 'runtime' && !f.behavior) ||
            (f.origin === 'execution' && !f.behavior)
        );
    }

    /** Analysis fragments (Calculated) — derived results */
    getAnalysis(): ICodeFragment[] {
        return this._fragments.filter(f =>
            f.behavior === MetricBehavior.Calculated ||
            (f.origin === 'analyzed' && !f.behavior)
        );
    }

    /** Get fragments by type */
    byType(type: FragmentType): ICodeFragment[] {
        return this._fragments.filter(f => f.fragmentType === type);
    }

    /** Get the first fragment of a given type */
    firstOfType(type: FragmentType): ICodeFragment | undefined {
        return this._fragments.find(f => f.fragmentType === type);
    }

    /** Get the first fragment of a given type, cast to a specific value type */
    valueOf<T>(type: FragmentType): T | undefined {
        return this._fragments.find(f => f.fragmentType === type)?.value as T | undefined;
    }

    /** Add a fragment and notify listeners */
    add(fragment: ICodeFragment): void {
        this._fragments.push(fragment);
        this.notify();
    }

    /** Add multiple fragments and notify listeners */
    addAll(fragments: ICodeFragment[]): void {
        if (fragments.length === 0) return;
        this._fragments.push(...fragments);
        this.notify();
    }

    /** Update fragments matching a predicate */
    update(
        predicate: (f: ICodeFragment) => boolean,
        updater: (f: ICodeFragment) => ICodeFragment
    ): void {
        let changed = false;
        this._fragments = this._fragments.map(f => {
            if (predicate(f)) {
                changed = true;
                return updater(f);
            }
            return f;
        });
        if (changed) this.notify();
    }

    /** Remove fragments matching a predicate */
    remove(predicate: (f: ICodeFragment) => boolean): void {
        const before = this._fragments.length;
        this._fragments = this._fragments.filter(f => !predicate(f));
        if (this._fragments.length !== before) this.notify();
    }

    /** Replace all fragments of a given type */
    replaceByType(type: FragmentType, newFragments: ICodeFragment[]): void {
        this._fragments = this._fragments.filter(f => f.fragmentType !== type);
        this._fragments.push(...newFragments);
        this.notify();
    }

    /** Subscribe to changes */
    subscribe(listener: FragmentChangeListener): () => void {
        this._listeners.add(listener);
        return () => this._listeners.delete(listener);
    }

    /** Clear all fragments and listeners */
    dispose(): void {
        this._fragments = [];
        this._listeners.clear();
    }

    private notify(): void {
        const snapshot = this._fragments;
        for (const listener of this._listeners) {
            listener(snapshot);
        }
    }
}
