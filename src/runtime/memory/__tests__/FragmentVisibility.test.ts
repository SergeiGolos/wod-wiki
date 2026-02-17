import { describe, it, expect } from 'bun:test';
import {
    getFragmentVisibility,
    isFragmentTag,
    filterTagsByVisibility,
    VISIBILITY_ICONS,
    VISIBILITY_LABELS,
    FragmentVisibility,
} from '../FragmentVisibility';
import { MemoryTag, MemoryLocation } from '../MemoryLocation';
import { RuntimeBlock } from '../../RuntimeBlock';
import { IScriptRuntime } from '../../contracts/IScriptRuntime';
import { ICodeFragment, FragmentType } from '../../../core/models/CodeFragment';

// ============================================================================
// FragmentVisibility classification tests
// ============================================================================

describe('FragmentVisibility', () => {
    describe('getFragmentVisibility', () => {
        it('should classify fragment:display as display', () => {
            expect(getFragmentVisibility('fragment:display')).toBe('display');
        });

        it('should classify fragment:promote as promote', () => {
            expect(getFragmentVisibility('fragment:promote')).toBe('promote');
        });

        it('should classify fragment:rep-target as promote', () => {
            expect(getFragmentVisibility('fragment:rep-target')).toBe('promote');
        });

        it('should classify fragment:tracked as private', () => {
            expect(getFragmentVisibility('fragment:tracked')).toBe('private');
        });

        it('should classify fragment:label as private', () => {
            expect(getFragmentVisibility('fragment:label')).toBe('private');
        });

        it('should default unknown fragment:* tags to private', () => {
            expect(getFragmentVisibility('fragment:unknown' as MemoryTag)).toBe('private');
        });

        it('should return undefined for non-fragment tags', () => {
            expect(getFragmentVisibility('timer')).toBeUndefined();
            expect(getFragmentVisibility('round')).toBeUndefined();
            expect(getFragmentVisibility('completion')).toBeUndefined();
            expect(getFragmentVisibility('display')).toBeUndefined();
            expect(getFragmentVisibility('controls')).toBeUndefined();
        });
    });

    describe('isFragmentTag', () => {
        it('should return true for fragment namespace tags', () => {
            expect(isFragmentTag('fragment:display')).toBe(true);
            expect(isFragmentTag('fragment:label')).toBe(true);
            expect(isFragmentTag('fragment:tracked')).toBe(true);
            expect(isFragmentTag('fragment:rep-target')).toBe(true);
            expect(isFragmentTag('fragment')).toBe(true);
        });

        it('should return false for non-fragment tags', () => {
            expect(isFragmentTag('timer')).toBe(false);
            expect(isFragmentTag('round')).toBe(false);
            expect(isFragmentTag('completion')).toBe(false);
        });
    });

    describe('filterTagsByVisibility', () => {
        const allTags: MemoryTag[] = [
            'timer', 'round', 'completion', 'display', 'controls',
            'fragment', 'fragment:display', 'fragment:promote',
            'fragment:rep-target', 'fragment:tracked', 'fragment:label',
        ];

        it('should filter display tags', () => {
            const result = filterTagsByVisibility(allTags, 'display');
            expect(result).toEqual(['fragment:display']);
        });

        it('should filter promote tags', () => {
            const result = filterTagsByVisibility(allTags, 'promote');
            expect(result).toEqual(['fragment:promote', 'fragment:rep-target']);
        });

        it('should filter private tags', () => {
            const result = filterTagsByVisibility(allTags, 'private');
            // 'fragment' (bare) starts with 'fragment:' is false, but isFragmentTag returns true
            // Actually 'fragment' does NOT start with 'fragment:' — let's verify
            expect(result).toContain('fragment:tracked');
            expect(result).toContain('fragment:label');
        });
    });

    describe('VISIBILITY_ICONS and VISIBILITY_LABELS', () => {
        it('should have entries for all three tiers', () => {
            const tiers: FragmentVisibility[] = ['display', 'promote', 'private'];
            for (const tier of tiers) {
                expect(VISIBILITY_ICONS[tier]).toBeDefined();
                expect(VISIBILITY_LABELS[tier]).toBeDefined();
            }
        });
    });
});

// ============================================================================
// RuntimeBlock.getFragmentMemoryByVisibility integration tests
// ============================================================================

describe('RuntimeBlock.getFragmentMemoryByVisibility', () => {
    const runtime = {} as IScriptRuntime;

    function createFragment(tag: string, value: unknown): ICodeFragment {
        return {
            fragmentType: FragmentType.Duration,
            type: tag,
            image: '',
            origin: 'runtime',
            value,
        } as ICodeFragment;
    }

    it('should return display-tier locations only', () => {
        const block = new RuntimeBlock(runtime);
        block.pushMemory(new MemoryLocation('fragment:display', [createFragment('action', 'Squats')]));
        block.pushMemory(new MemoryLocation('fragment:label', [createFragment('label', 'My Block')]));
        block.pushMemory(new MemoryLocation('time', [createFragment('timer', { direction: 'up' })]));

        const display = block.getFragmentMemoryByVisibility('display');
        expect(display).toHaveLength(1);
        expect(display[0].tag).toBe('fragment:display');
    });

    it('should return promote-tier locations only', () => {
        const block = new RuntimeBlock(runtime);
        block.pushMemory(new MemoryLocation('fragment:display', [createFragment('action', 'Squats')]));
        block.pushMemory(new MemoryLocation('fragment:rep-target', [createFragment('rep', 21)]));
        block.pushMemory(new MemoryLocation('fragment:promote', [createFragment('effort', 'Heavy')]));

        const promote = block.getFragmentMemoryByVisibility('promote');
        expect(promote).toHaveLength(2);
        expect(promote.map(l => l.tag)).toEqual(['fragment:rep-target', 'fragment:promote']);
    });

    it('should return private-tier locations only', () => {
        const block = new RuntimeBlock(runtime);
        block.pushMemory(new MemoryLocation('fragment:display', [createFragment('action', 'Squats')]));
        block.pushMemory(new MemoryLocation('fragment:tracked', [createFragment('duration', 5000)]));
        block.pushMemory(new MemoryLocation('fragment:label', [createFragment('label', 'Timer')]));

        const priv = block.getFragmentMemoryByVisibility('private');
        expect(priv).toHaveLength(2);
        expect(priv.map(l => l.tag)).toEqual(['fragment:tracked', 'fragment:label']);
    });

    it('should return empty array when no matching tier exists', () => {
        const block = new RuntimeBlock(runtime);
        block.pushMemory(new MemoryLocation('time', [createFragment('timer', { direction: 'up' })]));
        block.pushMemory(new MemoryLocation('round', [createFragment('round', { current: 1 })]));

        expect(block.getFragmentMemoryByVisibility('display')).toEqual([]);
        expect(block.getFragmentMemoryByVisibility('promote')).toEqual([]);
        expect(block.getFragmentMemoryByVisibility('private')).toEqual([]);
    });

    it('should handle blocks with all three tiers', () => {
        const block = new RuntimeBlock(runtime);
        block.pushMemory(new MemoryLocation('fragment:display', [createFragment('action', 'Run')]));
        block.pushMemory(new MemoryLocation('fragment:display', [createFragment('rep', '21')]));
        block.pushMemory(new MemoryLocation('fragment:rep-target', [createFragment('rep', 15)]));
        block.pushMemory(new MemoryLocation('fragment:tracked', [createFragment('duration', 3000)]));
        block.pushMemory(new MemoryLocation('fragment:label', [createFragment('label', 'Fran')]));

        expect(block.getFragmentMemoryByVisibility('display')).toHaveLength(2);
        expect(block.getFragmentMemoryByVisibility('promote')).toHaveLength(1);
        expect(block.getFragmentMemoryByVisibility('private')).toHaveLength(2);
    });
});
