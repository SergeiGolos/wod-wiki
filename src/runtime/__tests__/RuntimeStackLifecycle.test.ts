import { describe, expect, it, vi } from 'bun:test';
import { ScriptRuntime } from '../ScriptRuntime';

import { RuntimeMemory } from '../RuntimeMemory';
import { BlockKey } from '../../core/models/BlockKey';
import { IRuntimeAction } from '../contracts/IRuntimeAction';
import { IRuntimeBlock } from '../contracts/IRuntimeBlock';
import { WodScript } from '../../parser/WodScript';
import { JitCompiler } from '../compiler/JitCompiler';
import { IRuntimeOptions } from '../contracts/IRuntimeOptions';
import { RuntimeStack } from '../RuntimeStack';
import { RuntimeClock } from '../RuntimeClock';
import { EventBus } from '../events/EventBus';

const createAction = (name: string, callOrder: string[]): IRuntimeAction => ({
  type: 'test-action',
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
    behaviors: [],
    isComplete: false,
    markComplete: vi.fn(),
  };
};

describe('ScriptRuntime Lifecycle', () => {
  // Mock dependencies
  const script = new WodScript('test', []);
  const compiler = {} as JitCompiler; // Mock compiler

  it('sequences push hooks, tracker, wrapper, and logger in order', () => {
    const callOrder: string[] = [];

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

    const options: IRuntimeOptions = {
      tracker,
      wrapper,
      logger,
      hooks,
    } as any;

    const dependencies = {
      memory: new RuntimeMemory(),
      stack: new RuntimeStack(),
      clock: new RuntimeClock(),
      eventBus: new EventBus(),
    };

    const runtime = new ScriptRuntime(script, compiler, dependencies, options);

    const block = createBlock('child', callOrder);
    runtime.pushBlock(block);

    expect(callOrder).toEqual([
      'hooks.beforePush',
      'tracker.startSpan',
      'wrapper.wrap',
      'logger.debug',
      'hooks.afterPush',
    ]);
  });

  it('propagates errors from unmount instead of swallowing them', () => {
    const callOrder: string[] = [];

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

    const options: IRuntimeOptions = {
      tracker,
      wrapper,
      logger,
      hooks,
    } as any;

    const dependencies = {
      memory: new RuntimeMemory(),
      stack: new RuntimeStack(),
      clock: new RuntimeClock(),
      eventBus: new EventBus(),
    };

    const runtime = new ScriptRuntime(script, compiler, dependencies, options);

    const parent = createBlock('parent', callOrder, [createAction('parent.next.action', callOrder)]);
    const child = createBlock('child', callOrder);
    child.unmount = vi.fn(() => {
      callOrder.push('child.unmount');
      throw new Error('Unmount failure');
    });

    runtime.pushBlock(parent);
    runtime.pushBlock(child);
    callOrder.length = 0;

    // Errors now propagate rather than being silently swallowed
    expect(() => runtime.popBlock()).toThrow('Unmount failure');

    // Only the calls before the error should have happened
    expect(callOrder).toEqual([
      'hooks.beforePop',
      'child.unmount',
    ]);
  });
});
