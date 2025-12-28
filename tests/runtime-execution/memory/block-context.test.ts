import { describe, test, expect, beforeEach } from 'bun:test';
import { BlockContext } from '../../../src/runtime/BlockContext';
import { IScriptRuntime } from '../../../src/runtime/contracts/IScriptRuntime';
import { RuntimeMemory } from '../../../src/runtime/RuntimeMemory';
import { TypedMemoryReference } from '../../../src/runtime/contracts/IMemoryReference';

describe('BlockContext', () => {
    let runtime: IScriptRuntime;
    let context: BlockContext;
    const ownerId = 'test-block-123';

    beforeEach(() => {
        // Create minimal runtime with memory
        runtime = {
            memory: new RuntimeMemory(),
        } as unknown as IScriptRuntime;
        
        context = new BlockContext(runtime, ownerId, '');
    });

    describe('Construction', () => {
        test('should create context with ownerId', () => {
            expect(context.ownerId).toBe(ownerId);
            expect(context.references).toEqual([]);
            expect(context.isReleased()).toBe(false);
        });

        test('should accept initial references', () => {
            const ref = runtime.memory.allocate<number>('test', 'owner-1', 42);
            const contextWithRefs = new BlockContext(runtime, 'owner-2', '', [ref]);
            
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
                ownerId: ownerId,
                id: null,
                visibility: null
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
                ownerId: ownerId,
                id: null,
                visibility: null
            });
            
            expect(found).toHaveLength(0);
        });

        test('should handle multiple blocks with separate contexts', () => {
            const context1 = new BlockContext(runtime, 'block-1', '');
            const context2 = new BlockContext(runtime, 'block-2', '');
            
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

    describe('Memory Event Subscriptions', () => {
        let eventBus: any;
        let fullRuntime: IScriptRuntime;
        
        beforeEach(() => {
            // Create a full runtime with EventBus for testing subscriptions
            const { EventBus } = require('../../../src/runtime/events/EventBus');
            eventBus = new EventBus();
            const memory = new RuntimeMemory();
            
            // Connect memory events to EventBus
            const { MemoryAllocateEvent, MemorySetEvent, MemoryReleaseEvent } = require('../../../src/runtime/events/MemoryEvents');
            memory.setEventDispatcher((eventType: string, ref: any, value: any, oldValue?: any) => {
                switch (eventType) {
                    case 'allocate':
                        eventBus.dispatch(new MemoryAllocateEvent(ref, value), fullRuntime);
                        break;
                    case 'set':
                        eventBus.dispatch(new MemorySetEvent(ref, value, oldValue), fullRuntime);
                        break;
                    case 'release':
                        eventBus.dispatch(new MemoryReleaseEvent(ref, value), fullRuntime);
                        break;
                }
            });
            
            fullRuntime = {
                memory,
                eventBus,
            } as unknown as IScriptRuntime;
        });

        test('should subscribe to allocate events', () => {
            const ctx = new BlockContext(fullRuntime, 'test-block');
            const allocatedRefs: any[] = [];
            
            ctx.onAllocate((ref, value) => {
                allocatedRefs.push({ ref, value });
            });
            
            const ref = ctx.allocate<number>('counter', 42);
            
            expect(allocatedRefs).toHaveLength(1);
            expect(allocatedRefs[0].value).toBe(42);
            expect(allocatedRefs[0].ref.type).toBe('counter');
        });

        test('should subscribe to set events', () => {
            const ctx = new BlockContext(fullRuntime, 'test-block');
            const setEvents: any[] = [];
            
            const ref = ctx.allocate<number>('counter', 0);
            
            ctx.onSet((eventRef, value, oldValue) => {
                setEvents.push({ eventRef, value, oldValue });
            });
            
            ref.set(10);
            ref.set(20);
            
            expect(setEvents).toHaveLength(2);
            expect(setEvents[0].value).toBe(10);
            expect(setEvents[0].oldValue).toBe(0);
            expect(setEvents[1].value).toBe(20);
            expect(setEvents[1].oldValue).toBe(10);
        });

        test('should subscribe to release events when memory is manually released', () => {
            const ctx = new BlockContext(fullRuntime, 'test-block');
            const releaseEvents: any[] = [];
            
            const ref = ctx.allocate<number>('counter', 42);
            
            ctx.onRelease((eventRef, lastValue) => {
                releaseEvents.push({ eventRef, lastValue });
            });
            
            // Manually release the memory reference (not through context.release())
            // This simulates an external release scenario
            fullRuntime.memory.release(ref);
            
            expect(releaseEvents).toHaveLength(1);
            expect(releaseEvents[0].lastValue).toBe(42);
        });

        test('should not receive release events when context.release() is called', () => {
            // When context.release() is called, it unsubscribes first, then releases memory
            // This means the context's own listeners won't receive release events
            // This is expected behavior - a disposing context shouldn't fire its own listeners
            const ctx = new BlockContext(fullRuntime, 'test-block');
            const releaseEvents: any[] = [];
            
            ctx.allocate<number>('counter', 42);
            
            ctx.onRelease((eventRef, lastValue) => {
                releaseEvents.push({ eventRef, lastValue });
            });
            
            ctx.release();
            
            // Should NOT receive release events because we unsubscribed before releasing
            expect(releaseEvents).toHaveLength(0);
        });

        test('should subscribe to any memory event', () => {
            const ctx = new BlockContext(fullRuntime, 'test-block');
            const allEvents: any[] = [];
            
            ctx.onAny((ref, value, oldValue) => {
                allEvents.push({ ref, value, oldValue });
            });
            
            const ref = ctx.allocate<number>('counter', 0);
            ref.set(10);
            
            // Should have received allocate and set events
            expect(allEvents.length).toBeGreaterThanOrEqual(2);
        });

        test('should only receive events for own references', () => {
            const ctx1 = new BlockContext(fullRuntime, 'block-1');
            const ctx2 = new BlockContext(fullRuntime, 'block-2');
            const ctx1Events: any[] = [];
            const ctx2Events: any[] = [];
            
            ctx1.onSet((ref, value) => {
                ctx1Events.push({ ref, value });
            });
            ctx2.onSet((ref, value) => {
                ctx2Events.push({ ref, value });
            });
            
            const ref1 = ctx1.allocate<number>('counter', 0);
            const ref2 = ctx2.allocate<number>('counter', 0);
            
            ref1.set(10);
            ref2.set(20);
            
            // Each context should only receive events for its own references
            expect(ctx1Events).toHaveLength(1);
            expect(ctx1Events[0].value).toBe(10);
            expect(ctx2Events).toHaveLength(1);
            expect(ctx2Events[0].value).toBe(20);
        });

        test('should unsubscribe manually', () => {
            const ctx = new BlockContext(fullRuntime, 'test-block');
            const setEvents: any[] = [];
            
            const ref = ctx.allocate<number>('counter', 0);
            
            const unsubscribe = ctx.onSet((eventRef, value) => {
                setEvents.push(value);
            });
            
            ref.set(10);
            expect(setEvents).toHaveLength(1);
            
            unsubscribe();
            
            ref.set(20);
            // Should not receive after unsubscribe
            expect(setEvents).toHaveLength(1);
        });

        test('should automatically unsubscribe on release', () => {
            const ctx = new BlockContext(fullRuntime, 'test-block');
            const allocEvents: any[] = [];
            
            ctx.onAllocate(() => {
                allocEvents.push('event');
            });
            
            ctx.allocate<number>('counter1', 0);
            expect(allocEvents).toHaveLength(1);
            
            ctx.release();
            
            // Context is released, should not be able to subscribe
            expect(() => {
                ctx.onAllocate(() => {});
            }).toThrow(/Cannot subscribe on released context/);
        });

        test('should throw error when subscribing on released context', () => {
            const ctx = new BlockContext(fullRuntime, 'test-block');
            ctx.release();
            
            expect(() => {
                ctx.onAllocate(() => {});
            }).toThrow(/Cannot subscribe on released context/);
            
            expect(() => {
                ctx.onSet(() => {});
            }).toThrow(/Cannot subscribe on released context/);
            
            expect(() => {
                ctx.onRelease(() => {});
            }).toThrow(/Cannot subscribe on released context/);
            
            expect(() => {
                ctx.onAny(() => {});
            }).toThrow(/Cannot subscribe on released context/);
        });
    });
});
