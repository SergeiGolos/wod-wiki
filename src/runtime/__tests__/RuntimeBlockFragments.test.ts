import { describe, expect, it } from 'bun:test';
import { RuntimeBlock } from '../RuntimeBlock';
import { IScriptRuntime } from '../IScriptRuntime';
import { ICodeFragment, FragmentType, FragmentCollectionState } from '../../core/models/CodeFragment';

describe('RuntimeBlock Fragment Methods', () => {
    const runtime = {} as IScriptRuntime;

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

    const effortFragment: ICodeFragment = {
        type: 'effort',
        fragmentType: FragmentType.Effort,
        value: 'Run'
    };

    // Create a block with nested fragments
    // Group 0: [Timer, Rep1]
    // Group 1: [Rep2, Effort]
    const fragments: ICodeFragment[][] = [
        [timerFragment, repFragment1],
        [repFragment2, effortFragment]
    ];

    const block = new RuntimeBlock(
        runtime, 
        [], 
        [], 
        undefined, 
        undefined, 
        undefined, 
        undefined, 
        fragments
    );

    describe('findFragment', () => {
        it('should find a fragment by type', () => {
            const found = block.findFragment(FragmentType.Timer);
            expect(found).toBe(timerFragment);
        });

        it('should find a fragment in a later group', () => {
            const found = block.findFragment(FragmentType.Effort);
            expect(found).toBe(effortFragment);
        });

        it('should return undefined if fragment not found', () => {
            const found = block.findFragment(FragmentType.Distance);
            expect(found).toBeUndefined();
        });

        it('should find a fragment with predicate', () => {
            const found = block.findFragment(FragmentType.Rep, f => f.value === 20);
            expect(found).toBe(repFragment2);
        });

        it('should return undefined if predicate fails', () => {
            const found = block.findFragment(FragmentType.Rep, f => f.value === 999);
            expect(found).toBeUndefined();
        });
    });

    describe('filterFragments', () => {
        it('should return all fragments of a type', () => {
            const found = block.filterFragments(FragmentType.Rep);
            expect(found).toHaveLength(2);
            expect(found).toContain(repFragment1);
            expect(found).toContain(repFragment2);
        });

        it('should return empty array if no fragments of type found', () => {
            const found = block.filterFragments(FragmentType.Distance);
            expect(found).toHaveLength(0);
        });
    });

    describe('hasFragment', () => {
        it('should return true if fragment exists', () => {
            expect(block.hasFragment(FragmentType.Timer)).toBe(true);
            expect(block.hasFragment(FragmentType.Effort)).toBe(true);
        });

        it('should return false if fragment does not exist', () => {
            expect(block.hasFragment(FragmentType.Distance)).toBe(false);
        });
    });
});
