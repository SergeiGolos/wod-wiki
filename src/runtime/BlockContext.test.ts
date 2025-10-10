import { describe, test, expect, beforeEach } from 'vitest';
import { BlockContext } from './BlockContext';
import { IScriptRuntime } from './IScriptRuntime';
import { RuntimeMemory } from './RuntimeMemory';
import { TypedMemoryReference } from './IMemoryReference';

describe('BlockContext', () => {
    let runtime: IScriptRuntime;
    let context: BlockContext;
    const ownerId = 'test-block-123';

    beforeEach(() => {
        // Create minimal runtime with memory
        runtime = {
            memory: new RuntimeMemory(),
        } as IScriptRuntime;
        
        context = new BlockContext(runtime, ownerId);
    });

    describe('Construction', () => {
        test('should create context with ownerId', () => {
            expect(context.ownerId).toBe(ownerId);
            expect(context.references).toEqual([]);
            expect(context.isReleased()).toBe(false);
        });

        test('should accept initial references', () => {
            const ref = runtime.memory.allocate<number>('test', 'owner-1', 42);
            const contextWithRefs = new BlockContext(runtime, 'owner-2', [ref]);
            
            expect(contextWithRefs.references).toHaveLength(1);
            expect(contextWithRefs.references[0]).toBe(ref);
        });
    });

    describe('allocate()', () => {
        test('should allocate memory with default private visibility', () => {
            const ref = context.allocate<number>('counter', 0);
            
            expect(ref).toBeInstanceOf(TypedMemoryReference);
            expect(ref.type).toBe('counter');
            expect(ref.ownerId).toBe(ownerId);
            expect(ref.visibility).toBe('private');
            expect(ref.get()).toBe(0);
        });

        test('should allocate memory with public visibility', () => {
            const ref = context.allocate<string>('message', 'hello', 'public');
            
            expect(ref.visibility).toBe('public');
            expect(ref.get()).toBe('hello');
        });

        test('should track allocated references', () => {
            const ref1 = context.allocate<number>('counter-1', 1);
            const ref2 = context.allocate<number>('counter-2', 2);
            
            expect(context.references).toHaveLength(2);
            expect(context.references).toContain(ref1);
            expect(context.references).toContain(ref2);
        });

        test('should allow allocation without initial value', () => {
            const ref = context.allocate<number>('optional');
            
            expect(ref.get()).toBeUndefined();
        });

        test('should throw error when allocating on released context', () => {
            context.release();
            
            expect(() => {
                context.allocate<number>('test', 0);
            }).toThrow(/Cannot allocate on released context/);
        });
    });

    describe('get()', () => {
        test('should retrieve reference by type', () => {
            const ref = context.allocate<number>('counter', 42);
            
            const retrieved = context.get<number>('counter');
            expect(retrieved).toBe(ref);
            expect(retrieved?.get()).toBe(42);
        });

        test('should return undefined for non-existent type', () => {
            const retrieved = context.get<number>('missing');
            expect(retrieved).toBeUndefined();
        });

        test('should return first reference when multiple exist', () => {
            const ref1 = context.allocate<number>('counter', 1);
            context.allocate<number>('counter', 2);
            
            const retrieved = context.get<number>('counter');
            expect(retrieved).toBe(ref1);
        });
    });

    describe('getAll()', () => {
        test('should return empty array for non-existent type', () => {
            const refs = context.getAll<number>('missing');
            expect(refs).toEqual([]);
        });

        test('should return all references of a type', () => {
            const ref1 = context.allocate<number>('counter', 1);
            const ref2 = context.allocate<number>('counter', 2);
            const ref3 = context.allocate<string>('message', 'test');
            
            const counterRefs = context.getAll<number>('counter');
            expect(counterRefs).toHaveLength(2);
            expect(counterRefs).toContain(ref1);
            expect(counterRefs).toContain(ref2);
            expect(counterRefs).not.toContain(ref3);
        });

        test('should handle single reference', () => {
            const ref = context.allocate<number>('single', 99);
            
            const refs = context.getAll<number>('single');
            expect(refs).toHaveLength(1);
            expect(refs[0]).toBe(ref);
        });
    });

    describe('release()', () => {
        test('should release all memory references', () => {
            const ref1 = context.allocate<number>('counter-1', 1);
            const ref2 = context.allocate<number>('counter-2', 2);
            
            context.release();
            
            // Memory should be cleaned up
            expect(ref1.get()).toBeUndefined();
            expect(ref2.get()).toBeUndefined();
            expect(context.isReleased()).toBe(true);
        });

        test('should clear references array', () => {
            context.allocate<number>('counter', 1);
            context.allocate<number>('counter', 2);
            
            expect(context.references).toHaveLength(2);
            
            context.release();
            
            expect(context.references).toHaveLength(0);
        });

        test('should be idempotent', () => {
            context.allocate<number>('counter', 1);
            
            context.release();
            context.release();
            context.release();
            
            expect(context.isReleased()).toBe(true);
        });

        test('should prevent allocation after release', () => {
            context.release();
            
            expect(() => {
                context.allocate<number>('test', 0);
            }).toThrow();
        });
    });

    describe('isReleased()', () => {
        test('should return false initially', () => {
            expect(context.isReleased()).toBe(false);
        });

        test('should return true after release', () => {
            context.release();
            expect(context.isReleased()).toBe(true);
        });

        test('should remain true after multiple releases', () => {
            context.release();
            context.release();
            expect(context.isReleased()).toBe(true);
        });
    });

    describe('Integration with RuntimeMemory', () => {
        test('should allocate memory in runtime memory system', () => {
            const ref = context.allocate<number>('test', 42);
            
            // Should be searchable in runtime memory
            const found = runtime.memory.search({ 
                type: 'test',
                ownerId: ownerId 
            });
            
            expect(found).toHaveLength(1);
            expect(found[0]).toBe(ref);
        });

        test('should remove memory from runtime on release', () => {
            const ref = context.allocate<number>('test', 42);
            
            context.release();
            
            // Should no longer be searchable
            const found = runtime.memory.search({ 
                type: 'test',
                ownerId: ownerId 
            });
            
            expect(found).toHaveLength(0);
        });

        test('should handle multiple blocks with separate contexts', () => {
            const context1 = new BlockContext(runtime, 'block-1');
            const context2 = new BlockContext(runtime, 'block-2');
            
            const ref1 = context1.allocate<number>('counter', 1);
            const ref2 = context2.allocate<number>('counter', 2);
            
            expect(ref1.ownerId).toBe('block-1');
            expect(ref2.ownerId).toBe('block-2');
            
            // Each context should only have its own reference
            expect(context1.references).toHaveLength(1);
            expect(context2.references).toHaveLength(1);
            
            context1.release();
            
            // Context1 released, context2 still has memory
            expect(context1.references).toHaveLength(0);
            expect(context2.references).toHaveLength(1);
            expect(ref2.get()).toBe(2);
        });
    });
});
