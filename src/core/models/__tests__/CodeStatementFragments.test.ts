import { describe, expect, it } from 'bun:test';
import { CodeStatement } from '../CodeStatement';
import { ICodeFragment, FragmentType, FragmentCollectionState } from '../CodeFragment';
import { CodeMetadata } from '../CodeMetadata';

class TestCodeStatement extends CodeStatement {
    id: number = 1;
    parent?: number;
    children: number[][] = [];
    meta: CodeMetadata = { line: 1, columnStart: 1, columnEnd: 10, startOffset: 0, endOffset: 10, length: 10, raw: 'test' } as any;
    fragments: ICodeFragment[] = [];
    isLeaf?: boolean;

    constructor(fragments: ICodeFragment[]) {
        super();
        this.fragments = fragments;
    }
}

describe('CodeStatement Fragment Methods', () => {
    const timerFragment: ICodeFragment = {
        type: 'timer',
        fragmentType: FragmentType.Timer,
        value: 60000
    };

    const repFragment1: ICodeFragment = {
        type: 'rep',
        fragmentType: FragmentType.Rep,
        value: 10
    };

    const repFragment2: ICodeFragment = {
        type: 'rep',
        fragmentType: FragmentType.Rep,
        value: 20,
        collectionState: FragmentCollectionState.UserCollected
    };

    const fragments: ICodeFragment[] = [timerFragment, repFragment1, repFragment2];
    const statement = new TestCodeStatement(fragments);

    describe('findFragment', () => {
        it('should find a fragment by type', () => {
            const found = statement.findFragment(FragmentType.Timer);
            expect(found).toBe(timerFragment);
        });

        it('should return undefined if fragment not found', () => {
            const found = statement.findFragment(FragmentType.Effort);
            expect(found).toBeUndefined();
        });

        it('should find a fragment with predicate', () => {
            const found = statement.findFragment(FragmentType.Rep, f => f.value === 20);
            expect(found).toBe(repFragment2);
        });
    });

    describe('filterFragments', () => {
        it('should return all fragments of a type', () => {
            const found = statement.filterFragments(FragmentType.Rep);
            expect(found).toHaveLength(2);
            expect(found).toContain(repFragment1);
            expect(found).toContain(repFragment2);
        });
    });

    describe('hasFragment', () => {
        it('should return true if fragment exists', () => {
            expect(statement.hasFragment(FragmentType.Timer)).toBe(true);
        });

        it('should return false if fragment does not exist', () => {
            expect(statement.hasFragment(FragmentType.Effort)).toBe(false);
        });
    });
});
