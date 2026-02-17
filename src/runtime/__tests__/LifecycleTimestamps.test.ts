import { describe, expect, it, vi } from 'bun:test';
import { ScriptRuntime } from '../ScriptRuntime';
import { RuntimeMemory } from '../RuntimeMemory';
import { BlockKey } from '../../core/models/BlockKey';
import { PushBlockAction } from '../actions/stack/PushBlockAction';
import { IRuntimeBlock, BlockLifecycleOptions } from '../contracts/IRuntimeBlock';
import { WodScript } from '../../parser/WodScript';
import { JitCompiler } from '../compiler/JitCompiler';
import { RuntimeStack } from '../RuntimeStack';
import { RuntimeClock, createMockClock } from '../RuntimeClock';
import { EventBus } from '../events/EventBus';

const createBlockStub = (label: string, nextImpl?: (options?: BlockLifecycleOptions) => void): IRuntimeBlock => {
  const key = new BlockKey();
  return {
    key,
    sourceIds: [1],
    blockType: 'Test',
    label,
    context: {
      release: vi.fn(),
      allocate: vi.fn((_type, value) => ({
        id: 'mock-ref',
        get: () => value,
        set: (v: any) => { value = v; }
      })),
    } as any,
    executionTiming: {},
    mount: vi.fn().mockReturnValue([]),
    next: vi.fn((_runtime, options?: BlockLifecycleOptions) => {
      nextImpl?.(options);
      return [];
    }),
    unmount: vi.fn().mockReturnValue([]),
    dispose: vi.fn(),
    getBehavior: vi.fn().mockReturnValue(undefined),
    behaviors: [],
  } as any;
};

describe('Lifecycle timestamps', () => {
  const script = new WodScript('test', []);
  const compiler = {} as JitCompiler;

  it('passes completedAt from pop to parent.next', () => {
    const completedAt = new Date('2024-01-01T00:00:01Z');
    const dependencies = {
      memory: new RuntimeMemory(),
      stack: new RuntimeStack(),
      clock: new RuntimeClock(),
      eventBus: new EventBus(),
    };
    const runtime = new ScriptRuntime(script, compiler, dependencies);

    let receivedOptions: BlockLifecycleOptions | undefined;
    const parent = createBlockStub('parent', options => {
      receivedOptions = options;
    });
    const child = createBlockStub('child');

    runtime.pushBlock(parent);
    runtime.pushBlock(child);

    runtime.popBlock({ completedAt });

    expect(receivedOptions?.completedAt).toEqual(completedAt);
  });

  it('uses provided startTime when pushing children and calls mount with it', () => {
    const startTime = new Date('2024-01-01T00:00:00Z');
    const dependencies = {
      memory: new RuntimeMemory(),
      stack: new RuntimeStack(),
      clock: new RuntimeClock(),
      eventBus: new EventBus(),
    };
    const runtime = new ScriptRuntime(script, compiler, dependencies);

    const child = createBlockStub('child');
    const action = new PushBlockAction(child, { startTime });

    action.do(runtime);

    expect(child.executionTiming?.startTime).toEqual(startTime);
    expect(child.mount).toHaveBeenCalledWith(runtime, expect.objectContaining({ startTime }));
  });

});
