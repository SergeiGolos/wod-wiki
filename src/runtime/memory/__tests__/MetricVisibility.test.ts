import { describe, it, expect } from 'bun:test';
import {
    getMetricVisibility,
    isFragmentTag,
    filterTagsByVisibility,
    VISIBILITY_ICONS,
    VISIBILITY_LABELS,
    MetricVisibility,
} from '../MetricVisibility';
import { MemoryTag, MemoryLocation } from '../MemoryLocation';
import { RuntimeBlock } from '../../RuntimeBlock';
import { IScriptRuntime } from '../../contracts/IScriptRuntime';
import { IMetric, MetricType } from '../../../core/models/Metric';

// ============================================================================
// MetricVisibility classification tests
// ============================================================================

describe('MetricVisibility', () => {
    describe('getMetricVisibility', () => {
        it('should classify metric:display as display', () => {
            expect(getMetricVisibility('metric:display')).toBe('display');
        });

        it('should classify metric:promote as promote', () => {
            expect(getMetricVisibility('metric:promote')).toBe('promote');
        });

        it('should classify metric:rep-target as promote', () => {
            expect(getMetricVisibility('metric:rep-target')).toBe('promote');
        });

        it('should classify metric:tracked as private', () => {
            expect(getMetricVisibility('metric:tracked')).toBe('private');
        });

        it('should classify metric:label as private', () => {
            expect(getMetricVisibility('metric:label')).toBe('private');
        });

        it('should default unknown metric:* tags to private', () => {
            expect(getMetricVisibility('metric:unknown' as MemoryTag)).toBe('private');
        });

        it('should return undefined for non-metric tags', () => {
            expect(getMetricVisibility('time' as MemoryTag)).toBeUndefined();
            expect(getMetricVisibility('round')).toBeUndefined();
            expect(getMetricVisibility('completion')).toBeUndefined();
            expect(getMetricVisibility('display')).toBeUndefined();
            expect(getMetricVisibility('controls')).toBeUndefined();
        });
    });

    describe('isFragmentTag', () => {
        it('should return true for metric namespace tags', () => {
            expect(isFragmentTag('metric:display')).toBe(true);
            expect(isFragmentTag('metric:label')).toBe(true);
            expect(isFragmentTag('metric:tracked')).toBe(true);
            expect(isFragmentTag('metric:rep-target')).toBe(true);
            expect(isFragmentTag('metrics')).toBe(true);
        });

        it('should return false for non-metric tags', () => {
            expect(isFragmentTag('time' as MemoryTag)).toBe(false);
            expect(isFragmentTag('round')).toBe(false);
            expect(isFragmentTag('completion')).toBe(false);
        });
    });

    describe('filterTagsByVisibility', () => {
        const allTags: MemoryTag[] = [
            'time', 'round', 'completion', 'display', 'controls',
            'metrics', 'metric:display', 'metric:promote',
            'metric:rep-target', 'metric:tracked', 'metric:label',
        ];

        it('should filter display tags', () => {
            const result = filterTagsByVisibility(allTags, 'display');
            expect(result).toEqual(['metric:display']);
        });

        it('should filter promote tags', () => {
            const result = filterTagsByVisibility(allTags, 'promote');
            expect(result).toEqual(['metric:promote', 'metric:rep-target']);
        });

        it('should filter private tags', () => {
            const result = filterTagsByVisibility(allTags, 'private');
            //   'metric' (bare) starts with 'metric:' is false, but isFragmentTag returns true
            // Actually   'metric' does NOT start with 'metric:' — let's verify
            expect(result).toContain('metric:tracked');
            expect(result).toContain('metric:label');
        });
    });

    describe('VISIBILITY_ICONS and VISIBILITY_LABELS', () => {
        it('should have entries for all three tiers', () => {
            const tiers: MetricVisibility[] = ['display', 'promote', 'private'];
            for (const tier of tiers) {
                expect(VISIBILITY_ICONS[tier]).toBeDefined();
                expect(VISIBILITY_LABELS[tier]).toBeDefined();
            }
        });
    });
});

// ============================================================================
// RuntimeBlock.getMetricMemoryByVisibility integration tests
// ============================================================================

describe('RuntimeBlock.getMetricMemoryByVisibility', () => {
    const runtime = {} as IScriptRuntime;

    function createFragment(tag: string, value: unknown): IMetric {
        return {
            type: MetricType.Duration,
            image: '',
            origin: 'runtime',
            value,
        } as IMetric;
    }

    it('should return display-tier locations only', () => {
        const block = new RuntimeBlock(runtime);
        block.pushMemory(new MemoryLocation('metric:display', [createFragment('action', 'Squats')]));
        block.pushMemory(new MemoryLocation('metric:label', [createFragment('label', 'My Block')]));
        block.pushMemory(new MemoryLocation('time', [createFragment('timer', { direction: 'up' })]));

        const display = block.getMetricMemoryByVisibility('display');
        expect(display).toHaveLength(1);
        expect(display[0].tag).toBe('metric:display');
    });

    it('should return promote-tier locations only', () => {
        const block = new RuntimeBlock(runtime);
        block.pushMemory(new MemoryLocation('metric:display', [createFragment('action', 'Squats')]));
        block.pushMemory(new MemoryLocation('metric:rep-target', [createFragment('rep', 21)]));
        block.pushMemory(new MemoryLocation('metric:promote', [createFragment('effort', 'Heavy')]));

        const promote = block.getMetricMemoryByVisibility('promote');
        expect(promote).toHaveLength(2);
        expect(promote.map(l => l.tag)).toEqual(['metric:rep-target', 'metric:promote']);
    });

    it('should return private-tier locations only', () => {
        const block = new RuntimeBlock(runtime);
        block.pushMemory(new MemoryLocation('metric:display', [createFragment('action', 'Squats')]));
        block.pushMemory(new MemoryLocation('metric:tracked', [createFragment('duration', 5000)]));
        block.pushMemory(new MemoryLocation('metric:label', [createFragment('label', 'Timer')]));

        const priv = block.getMetricMemoryByVisibility('private');
        expect(priv).toHaveLength(2);
        expect(priv.map(l => l.tag)).toEqual(['metric:tracked', 'metric:label']);
    });

    it('should return empty array when no matching tier exists', () => {
        const block = new RuntimeBlock(runtime);
        block.pushMemory(new MemoryLocation('time', [createFragment('timer', { direction: 'up' })]));
        block.pushMemory(new MemoryLocation('round', [createFragment('round', { current: 1 })]));

        expect(block.getMetricMemoryByVisibility('display')).toEqual([]);
        expect(block.getMetricMemoryByVisibility('promote')).toEqual([]);
        expect(block.getMetricMemoryByVisibility('private')).toEqual([]);
    });

    it('should handle blocks with all three tiers', () => {
        const block = new RuntimeBlock(runtime);
        block.pushMemory(new MemoryLocation('metric:display', [createFragment('action', 'Run')]));
        block.pushMemory(new MemoryLocation('metric:display', [createFragment('rep', '21')]));
        block.pushMemory(new MemoryLocation('metric:rep-target', [createFragment('rep', 15)]));
        block.pushMemory(new MemoryLocation('metric:tracked', [createFragment('duration', 3000)]));
        block.pushMemory(new MemoryLocation('metric:label', [createFragment('label', 'Fran')]));

        expect(block.getMetricMemoryByVisibility('display')).toHaveLength(2);
        expect(block.getMetricMemoryByVisibility('promote')).toHaveLength(1);
        expect(block.getMetricMemoryByVisibility('private')).toHaveLength(2);
    });
});
