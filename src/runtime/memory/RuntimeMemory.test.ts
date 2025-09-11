import { describe, it, expect, beforeEach } from 'vitest';
import { RuntimeMemory } from './RuntimeMemory';
import { IMemoryReference } from './IMemoryReference';

describe('RuntimeMemory', () => {
    let memory: RuntimeMemory;

    beforeEach(() => {
        memory = new RuntimeMemory();
    });

    describe('basic allocation', () => {
        it('should allocate memory and return a valid reference', () => {
            const ref = memory.allocate<string>('test-type', 'initial-value');

            expect(ref.isValid()).toBe(true);
            expect(ref.type).toBe('test-type');
            expect(ref.get()).toBe('initial-value');
            expect(ref.id).toBeDefined();
        });

        it('should allow setting and getting values', () => {
            const ref = memory.allocate<number>('number', 'test-owner', 42);

            expect(ref.get()).toBe(42);

            ref.set(100);
            expect(ref.get()).toBe(100);
        });

        it('should track references by owner', () => {
            const ref1 = memory.allocate<string>('type1', 'value1', 'owner1');
            const ref2 = memory.allocate<string>('type2', 'value2', 'owner1');
            const ref3 = memory.allocate<string>('type3', 'value3', 'owner2');

            const owner1Refs = memory.getByOwner('owner1');
            const owner2Refs = memory.getByOwner('owner2');

            expect(owner1Refs).toHaveLength(2);
            expect(owner2Refs).toHaveLength(1);
            expect(owner1Refs.map(r => r.id).sort()).toEqual([ref1.id, ref2.id].sort());
            expect(owner2Refs[0].id).toBe(ref3.id);
        });
    });

    describe('memory cleanup', () => {
        it('should invalidate memory reference when released', () => {
            const ref = memory.allocate<string>('test-type', 'test-value');

            expect(ref.isValid()).toBe(true);

            memory.release(ref);

            expect(ref.isValid()).toBe(false);
            expect(ref.get()).toBeUndefined();
        });

        it('should throw error when trying to set value on invalid reference', () => {
            const ref = memory.allocate<string>('test-type', 'test-value');
            memory.release(ref);

            expect(() => ref.set('new-value')).toThrow();
        });

        it('should clean up all references owned by an owner', () => {
            const ref1 = memory.allocate<string>('type1', 'value1', 'owner1');
            const ref2 = memory.allocate<string>('type2', 'value2', 'owner1');
            const ref3 = memory.allocate<string>('type3', 'value3', 'owner2');

            // Release by owner
            const owner1Refs = memory.getByOwner('owner1');
            for (const ref of owner1Refs) {
                memory.release(ref);
            }

            expect(ref1.isValid()).toBe(false);
            expect(ref2.isValid()).toBe(false);
            expect(ref3.isValid()).toBe(true);

            expect(memory.getByOwner('owner1')).toHaveLength(0);
            expect(memory.getByOwner('owner2')).toHaveLength(1);
        });
    });

    describe('child references', () => {
        it('should create child references', () => {
            const parent = memory.allocate<string>('parent', 'parent-value');
            const child = parent.createChild<number>('child', 42);

            expect(child.isValid()).toBe(true);
            expect(child.type).toBe('child');
            expect(child.get()).toBe(42);
        });

        it('should invalidate children when parent is released', () => {
            const parent = memory.allocate<string>('parent', 'parent-value');
            const child1 = parent.createChild<number>('child1', 1);
            const child2 = parent.createChild<number>('child2', 2);

            expect(parent.isValid()).toBe(true);
            expect(child1.isValid()).toBe(true);
            expect(child2.isValid()).toBe(true);

            memory.release(parent);

            expect(parent.isValid()).toBe(false);
            expect(child1.isValid()).toBe(false);
            expect(child2.isValid()).toBe(false);
        });

        it('should not allow creating children on invalid references', () => {
            const parent = memory.allocate<string>('parent', 'parent-value');
            memory.release(parent);

            expect(() => parent.createChild<number>('child', 42)).toThrow();
        });
    });

    describe('debug functionality', () => {
        it('should create memory snapshot', () => {
            const ref1 = memory.allocate<string>('string-type', 'owner1', 'value1');
            const ref2 = memory.allocate<number>('number-type', 'owner2', 42);

            const snapshot = memory.getMemorySnapshot();

            expect(snapshot.entries).toHaveLength(2);
            expect(snapshot.totalAllocated).toBe(2);
            expect(snapshot.summary.byType).toEqual({
                'string-type': 1,
                'number-type': 1
            });
            expect(snapshot.summary.byOwner).toEqual({
                'owner1': 1,
                'owner2': 1
            });
        });

        it('should get entries by type', () => {
            const ref1 = memory.allocate<string>('string-type', 'owner1', 'value1');
            const ref2 = memory.allocate<string>('string-type', 'owner2', 'value2');
            const ref3 = memory.allocate<number>('number-type', 'owner3', 42);

            const stringEntries = memory.getByType('string-type');
            const numberEntries = memory.getByType('number-type');

            expect(stringEntries).toHaveLength(2);
            expect(numberEntries).toHaveLength(1);
            expect(stringEntries.map(e => e.value).sort()).toEqual(['value1', 'value2']);
            expect(numberEntries[0].value).toBe(42);
        });

        it('should build memory hierarchy', () => {
            const parent = memory.allocate<string>('parent', 'parent-value', 'owner1');
            const child1 = parent.createChild<string>('child', 'child1-value');
            const child2 = parent.createChild<string>('child', 'child2-value');

            const hierarchy = memory.getMemoryHierarchy();

            expect(hierarchy.roots).toHaveLength(1);
            expect(hierarchy.roots[0].entry.id).toBe(parent.id);
            expect(hierarchy.roots[0].children).toHaveLength(2);
            
            const childIds = hierarchy.roots[0].children.map(c => c.entry.id).sort();
            expect(childIds).toEqual([child1.id, child2.id].sort());
        });
    });
});