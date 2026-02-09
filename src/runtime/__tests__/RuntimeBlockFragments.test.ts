import { describe, expect, it, beforeEach } from 'bun:test';
import { RuntimeBlock } from '../RuntimeBlock';
import { IScriptRuntime } from '../contracts/IScriptRuntime';
import { ICodeFragment, FragmentType } from '../../core/models/CodeFragment';
import type { FragmentState } from '../contracts/memory/MemoryTypes';

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
        origin: 'user'
    };

    const effortFragment: ICodeFragment = {
        type: 'effort',
        fragmentType: FragmentType.Effort,
        value: 'Run'
    };

    // Combine all fragments into a flat array for the new memory-based storage
    const allFragments: ICodeFragment[] = [
        timerFragment, repFragment1, repFragment2, effortFragment
    ];

    let block: RuntimeBlock;

    beforeEach(() => {
        // Create a block and set fragments in memory
        block = new RuntimeBlock(
            runtime, 
            [], 
            [], 
            undefined, 
            undefined, 
            undefined, 
            undefined
        );

        // Set fragments in memory using the public setMemoryValue method
        const fragmentState: FragmentState = {
            groups: [allFragments]
        };
        block.setMemoryValue('fragment', fragmentState);
    });

    describe('findFragment', () => {
        it('should find a fragment by type', () => {
            const found = block.findFragment(FragmentType.Timer);
            expect(found).toEqual(timerFragment);
        });

        it('should find a fragment in a later group', () => {
            const found = block.findFragment(FragmentType.Effort);
            expect(found).toEqual(effortFragment);
        });

        it('should return undefined if fragment not found', () => {
            const found = block.findFragment(FragmentType.Distance);
            expect(found).toBeUndefined();
        });

        it('should find a fragment with predicate', () => {
            const found = block.findFragment(FragmentType.Rep, f => f.value === 20);
            expect(found).toEqual(repFragment2);
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
            expect(found).toContainEqual(repFragment1);
            expect(found).toContainEqual(repFragment2);
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
