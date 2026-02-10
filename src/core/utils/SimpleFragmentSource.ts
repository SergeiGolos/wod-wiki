/**
 * SimpleFragmentSource — lightweight IFragmentSource for wrapping raw fragment arrays.
 *
 * Use when you have an ICodeFragment[] but no model class (e.g., synthetic
 * fragments built from analytics segments). For parsed statements use
 * CodeStatement directly; for output statements use OutputStatement directly.
 *
 * @see docs/FragmentOverhaul.md — Phase 5
 */

import { FragmentType, ICodeFragment } from '../models/CodeFragment';
import { IFragmentSource, FragmentFilter } from '../contracts/IFragmentSource';
import { resolveFragmentPrecedence, ORIGIN_PRECEDENCE } from '../utils/fragmentPrecedence';

export class SimpleFragmentSource implements IFragmentSource {
    readonly id: string | number;
    private readonly _fragments: ICodeFragment[];

    constructor(id: string | number, fragments: ICodeFragment[]) {
        this.id = id;
        this._fragments = fragments;
    }

    getDisplayFragments(filter?: FragmentFilter): ICodeFragment[] {
        return resolveFragmentPrecedence([...this._fragments], filter);
    }

    getFragment(type: FragmentType): ICodeFragment | undefined {
        const all = this.getAllFragmentsByType(type);
        return all.length > 0 ? all[0] : undefined;
    }

    getAllFragmentsByType(type: FragmentType): ICodeFragment[] {
        const ofType = this._fragments.filter(f => f.fragmentType === type);
        if (ofType.length === 0) return [];
        return [...ofType].sort((a, b) => {
            const rankA = ORIGIN_PRECEDENCE[a.origin ?? 'parser'] ?? 3;
            const rankB = ORIGIN_PRECEDENCE[b.origin ?? 'parser'] ?? 3;
            return rankA - rankB;
        });
    }

    hasFragment(type: FragmentType): boolean {
        return this._fragments.some(f => f.fragmentType === type);
    }

    get rawFragments(): ICodeFragment[] {
        return [...this._fragments];
    }
}
