import { describe, it, expect, vi } from 'vitest';
import { TypedMemoryReference } from '../../../src/runtime/IMemoryReference';
import { RuntimeMemory } from '../../../src/runtime/RuntimeMemory';

describe('TypedMemoryReference Subscription System', () => {
    it('should allow subscribing to memory changes', () => {
        const memory = new RuntimeMemory();
        const ref = memory.allocate<number>('test', 'owner-1', 10);
        
        const callback = vi.fn();
        const unsubscribe = ref.subscribe(callback);
        
        expect(typeof unsubscribe).toBe('function');
        expect(ref.hasSubscribers()).toBe(true);
    });

    it('should call subscriber callback when value changes', () => {
        const memory = new RuntimeMemory();
        const ref = memory.allocate<number>('test', 'owner-1', 10);
        
        const callback = vi.fn();
        ref.subscribe(callback);
        
        ref.set(20);
        
        expect(callback).toHaveBeenCalledTimes(1);
        expect(callback).toHaveBeenCalledWith(20, 10);
    });

    it('should support multiple subscribers on the same reference', () => {
        const memory = new RuntimeMemory();
        const ref = memory.allocate<number>('test', 'owner-1', 10);
        
        const callback1 = vi.fn();
        const callback2 = vi.fn();
        ref.subscribe(callback1);
        ref.subscribe(callback2);
        
        ref.set(20);
        
        expect(callback1).toHaveBeenCalledWith(20, 10);
        expect(callback2).toHaveBeenCalledWith(20, 10);
    });

    it('should allow unsubscribing from changes', () => {
        const memory = new RuntimeMemory();
        const ref = memory.allocate<number>('test', 'owner-1', 10);
        
        const callback = vi.fn();
        const unsubscribe = ref.subscribe(callback);
        
        unsubscribe();
        ref.set(20);
        
        expect(callback).not.toHaveBeenCalled();
        expect(ref.hasSubscribers()).toBe(false);
    });

    it('should support immediate subscription option', () => {
        const memory = new RuntimeMemory();
        const ref = memory.allocate<number>('test', 'owner-1', 10);
        
        const callback = vi.fn();
        ref.subscribe(callback, { immediate: true });
        
        expect(callback).toHaveBeenCalledTimes(1);
        expect(callback).toHaveBeenCalledWith(10, undefined);
    });

    it('should handle callback errors gracefully', () => {
        const memory = new RuntimeMemory();
        const ref = memory.allocate<number>('test', 'owner-1', 10);
        
        const errorCallback = vi.fn(() => {
            throw new Error('Callback error');
        });
        const goodCallback = vi.fn();
        
        ref.subscribe(errorCallback);
        ref.subscribe(goodCallback);
        
        // Should not throw
        expect(() => ref.set(20)).not.toThrow();
        
        // Good callback should still be called
        expect(goodCallback).toHaveBeenCalledWith(20, 10);
    });

    it('should notify subscribers when reference is released', () => {
        const memory = new RuntimeMemory();
        const ref = memory.allocate<number>('test', 'owner-1', 10);
        
        const callback = vi.fn();
        ref.subscribe(callback);
        
        memory.release(ref);
        
        expect(callback).toHaveBeenCalledWith(undefined, 10);
    });

    it('should work with complex object types', () => {
        interface TestData {
            value: number;
            text: string;
        }
        
        const memory = new RuntimeMemory();
        const ref = memory.allocate<TestData>('test', 'owner-1', { value: 1, text: 'hello' });
        
        const callback = vi.fn();
        ref.subscribe(callback);
        
        const newData = { value: 2, text: 'world' };
        ref.set(newData);
        
        expect(callback).toHaveBeenCalledWith(newData, { value: 1, text: 'hello' });
    });

    it('should support subscribing to undefined initial values', () => {
        const memory = new RuntimeMemory();
        const ref = memory.allocate<number>('test', 'owner-1');
        
        const callback = vi.fn();
        ref.subscribe(callback, { immediate: true });
        
        expect(callback).toHaveBeenCalledWith(undefined, undefined);
        
        ref.set(10);
        expect(callback).toHaveBeenCalledWith(10, undefined);
    });

    it('should allow multiple unsubscribe calls safely', () => {
        const memory = new RuntimeMemory();
        const ref = memory.allocate<number>('test', 'owner-1', 10);
        
        const callback = vi.fn();
        const unsubscribe = ref.subscribe(callback);
        
        unsubscribe();
        unsubscribe(); // Should not throw
        
        expect(ref.hasSubscribers()).toBe(false);
    });

    it('should maintain subscription independence', () => {
        const memory = new RuntimeMemory();
        const ref = memory.allocate<number>('test', 'owner-1', 10);
        
        const callback1 = vi.fn();
        const callback2 = vi.fn();
        
        const unsubscribe1 = ref.subscribe(callback1);
        ref.subscribe(callback2);
        
        unsubscribe1();
        ref.set(20);
        
        expect(callback1).not.toHaveBeenCalled();
        expect(callback2).toHaveBeenCalledWith(20, 10);
    });
});

describe('RuntimeMemory Subscription Integration', () => {
    it('should notify subscribers through set operation', () => {
        const memory = new RuntimeMemory();
        const ref = memory.allocate<string>('test', 'owner-1', 'initial');
        
        const callback = vi.fn();
        ref.subscribe(callback);
        
        memory.set(ref, 'updated');
        
        expect(callback).toHaveBeenCalledWith('updated', 'initial');
    });

    it('should handle multiple memory references independently', () => {
        const memory = new RuntimeMemory();
        const ref1 = memory.allocate<number>('test1', 'owner-1', 1);
        const ref2 = memory.allocate<number>('test2', 'owner-2', 2);
        
        const callback1 = vi.fn();
        const callback2 = vi.fn();
        
        ref1.subscribe(callback1);
        ref2.subscribe(callback2);
        
        ref1.set(10);
        
        expect(callback1).toHaveBeenCalledWith(10, 1);
        expect(callback2).not.toHaveBeenCalled();
    });

    it('should clean up subscriptions when memory is released', () => {
        const memory = new RuntimeMemory();
        const ref = memory.allocate<number>('test', 'owner-1', 10);
        
        const callback = vi.fn();
        ref.subscribe(callback);
        
        memory.release(ref);
        
        // Try to set after release - should not notify
        expect(() => memory.set(ref, 20)).toThrow('Invalid memory reference');
        expect(callback).toHaveBeenCalledTimes(1); // Only the release notification
    });
});
