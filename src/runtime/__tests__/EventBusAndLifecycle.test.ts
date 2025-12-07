import { describe, it, expect, vi } from 'vitest';
import { EventBus } from '../EventBus';
import { IEventHandler } from '../IEventHandler';
import { RuntimeMemory } from '../RuntimeMemory';
import { ExecutionTracker } from '../ExecutionTracker';
import { MemoryAwareRuntimeStack } from '../MemoryAwareRuntimeStack';
import { RuntimeBlock } from '../RuntimeBlock';
import { BlockContext } from '../BlockContext';
import { BlockKey } from '../../core/models/BlockKey';
import { DebugRuntimeStack } from '../DebugRuntimeStack';

// Minimal runtime stub implementing the parts used by stack/block
const createRuntimeStub = () => {
  const memory = new RuntimeMemory();
  const eventBus = new EventBus();
  const tracker = new ExecutionTracker(memory);
  const runtime: any = {
    memory,
    eventBus,
    tracker,
    errors: [],
    clock: { now: 0, register: () => {}, unregister: () => {} },
    handle: (_event: any) => {},
  };
  runtime.stack = new MemoryAwareRuntimeStack(runtime, tracker);
  return runtime as any;
};

const createDebugRuntimeStub = () => {
  const memory = new RuntimeMemory();
  const eventBus = new EventBus();
  const tracker = new ExecutionTracker(memory);
  const runtime: any = {
    memory,
    eventBus,
    tracker,
    errors: [],
    clock: { now: 0, register: () => {}, unregister: () => {} },
    handle: (_event: any) => {},
  };
  runtime.stack = new DebugRuntimeStack(runtime, tracker, { debugMode: true });
  return runtime as any;
};

class BareBlock extends RuntimeBlock {
  constructor(runtime: any) {
    const key = new BlockKey();
    super(runtime, [], [], new BlockContext(runtime, key.toString()), key, 'Test', 'Test');
  }
}

describe('EventBus dispatch', () => {
  it('delivers events regardless of current stack frame', () => {
    const bus = new EventBus();
    const calls: Set<string> = new Set();
    const runtime: any = { errors: [], eventBus: bus };
    const parentHandler: IEventHandler = {
      id: 'parent',
      name: 'parent',
      handler: () => { calls.add('parent'); return []; }
    };
    const childHandler: IEventHandler = {
      id: 'child',
      name: 'child',
      handler: () => { calls.add('child'); return []; }
    };
    bus.register('timer:complete', parentHandler, 'parent');
    bus.register('timer:complete', childHandler, 'child');

    bus.dispatch({ name: 'timer:complete', timestamp: new Date(), data: { blockId: 'child' } }, runtime);

    expect(calls.has('parent')).toBe(true);
    expect(calls.has('child')).toBe(true);
  });
});

describe('Lifecycle popWithLifecycle', () => {
  it('unmounts, disposes, and releases context memory', () => {
    const runtime = createRuntimeStub();
    const stack = runtime.stack as MemoryAwareRuntimeStack;
    const block = new BareBlock(runtime);
    const unregisterSpy = vi.spyOn(runtime.eventBus, 'unregisterByOwner');

    // allocate memory owned by block
    block.context.allocate('test-mem', 42, 'private');

    stack.push(block);
    expect(runtime.memory.search({ ownerId: block.key.toString(), type: 'test-mem', id: null, visibility: null }).length).toBe(1);

    stack.popWithLifecycle();

    expect(runtime.memory.search({ ownerId: block.key.toString(), type: 'test-mem', id: null, visibility: null }).length).toBe(0);
    expect(unregisterSpy).toHaveBeenCalledWith(block.key.toString());
  });

  it('cleans up handlers and wrappers in debug stack', () => {
    const runtime = createDebugRuntimeStub();
    const stack = runtime.stack as DebugRuntimeStack;
    const block = new BareBlock(runtime);
    const unregisterSpy = vi.spyOn(runtime.eventBus, 'unregisterByOwner');

    // Track wrapper existence
    stack.push(block);
    expect(stack.getWrappedBlock(block.key.toString())).toBeDefined();

    stack.popWithLifecycle();

    expect(unregisterSpy).toHaveBeenCalledWith(block.key.toString());
    expect(stack.getWrappedBlock(block.key.toString())).toBeUndefined();
  });
});
