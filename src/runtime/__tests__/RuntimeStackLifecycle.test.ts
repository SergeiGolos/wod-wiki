import { describe, expect, it, vi } from 'bun:test';
import { RuntimeStack } from '../RuntimeStack';
import { ExecutionTracker } from '../../tracker/ExecutionTracker';
import { RuntimeMemory } from '../RuntimeMemory';
import { BlockKey } from '../../core/models/BlockKey';
import { IRuntimeAction } from '../IRuntimeAction';
import { IRuntimeBlock } from '../IRuntimeBlock';

const createRuntimeStub = () => ({
  errors: [],
  eventBus: { unregisterByOwner: vi.fn() },
  memory: new RuntimeMemory(),
  clock: { now: 0, register: vi.fn(), unregister: vi.fn() },
  handle: vi.fn(),
});

const createAction = (name: string, callOrder: string[]): IRuntimeAction => ({
  do: vi.fn(() => callOrder.push(name)),
});

const createBlock = (
  label: string,
  callOrder: string[],
  nextActions?: IRuntimeAction[]
): IRuntimeBlock => {
  const key = new BlockKey();
  const context = {
    ownerId: key.toString(),
    exerciseId: label,
    references: [],
    allocate: vi.fn(),
    get: vi.fn(),
    getAll: vi.fn(),
    release: vi.fn(() => callOrder.push(`${label}.context.release`)),
    isReleased: vi.fn(() => false),
    getOrCreateAnchor: vi.fn(),
  } as any;

  return {
    key,
    sourceIds: [1],
    blockType: 'Test',
    label,
    context,
    mount: vi.fn().mockReturnValue([]),
    next: vi.fn(() => {
      callOrder.push(`${label}.next`);
      return nextActions ?? [];
    }),
    unmount: vi.fn(() => {
      callOrder.push(`${label}.unmount`);
      return [createAction(`${label}.unmount.action`, callOrder)];
    }),
    dispose: vi.fn(() => callOrder.push(`${label}.dispose`)),
    getBehavior: vi.fn().mockReturnValue(undefined),
  };
};

describe('RuntimeStack instrumentation', () => {
  it('sequences push hooks, tracker, wrapper, and logger in order', () => {
    const callOrder: string[] = [];
    const runtime = createRuntimeStub();
    const tracker = {
      getActiveSpanId: vi.fn().mockReturnValue(null),
      startSpan: vi.fn(() => callOrder.push('tracker.startSpan')),
      endSpan: vi.fn(),
    };
    const wrapper = {
      wrap: vi.fn((block: IRuntimeBlock) => {
        callOrder.push('wrapper.wrap');
        return block;
      }),
      cleanup: vi.fn(),
    };
    const logger = {
      debug: vi.fn(() => callOrder.push('logger.debug')),
      error: vi.fn(),
    };
    const hooks = {
      onBeforePush: vi.fn(() => callOrder.push('hooks.beforePush')),
      onAfterPush: vi.fn(() => callOrder.push('hooks.afterPush')),
    };

    const stack = new RuntimeStack(runtime as any, new ExecutionTracker(runtime.memory), {
      tracker,
      wrapper,
      logger,
      hooks,
    });

    const block = createBlock('child', callOrder);
    stack.push(block);

    expect(callOrder).toEqual([
      'hooks.beforePush',
      'tracker.startSpan',
      'wrapper.wrap',
      'logger.debug',
      'hooks.afterPush',
    ]);
  });

  it('runs pop lifecycle sequencing and continues after errors', () => {
    const callOrder: string[] = [];
    const runtime = createRuntimeStub();
    const tracker = {
      getActiveSpanId: vi.fn(),
      startSpan: vi.fn(),
      endSpan: vi.fn(() => callOrder.push('tracker.endSpan')),

    };
    const wrapper = {
      wrap: vi.fn((block: IRuntimeBlock) => block),
      cleanup: vi.fn(() => callOrder.push('wrapper.cleanup')),
    };
    const logger = {
      debug: vi.fn(() => callOrder.push('logger.debug')),
      error: vi.fn(() => callOrder.push('logger.error')),
    };
    const hooks = {
      onBeforePop: vi.fn(() => callOrder.push('hooks.beforePop')),
      onAfterPop: vi.fn(() => callOrder.push('hooks.afterPop')),
      unregisterByOwner: vi.fn(() => callOrder.push('hooks.unregister')),
    };

    const parent = createBlock('parent', callOrder, [createAction('parent.next.action', callOrder)]);
    const child = createBlock('child', callOrder);
    child.unmount = vi.fn(() => {
      callOrder.push('child.unmount');
      throw new Error('Unmount failure');
    });

    const stack = new RuntimeStack(runtime as any, new ExecutionTracker(runtime.memory), {
      tracker,
      wrapper,
      logger,
      hooks,
    });

    stack.push(parent);
    stack.push(child);
    callOrder.length = 0;

    stack.pop();

    expect(callOrder).toEqual([
      'hooks.beforePop',
      'child.unmount',
      'logger.error',
      'tracker.endSpan',
      'child.dispose',
      'child.context.release',
      'hooks.unregister',
      'wrapper.cleanup',
      'logger.debug',
      'parent.next',
      'parent.next.action',
      'hooks.afterPop',
    ]);
  });
});