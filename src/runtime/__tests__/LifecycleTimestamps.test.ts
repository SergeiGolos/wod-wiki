import { describe, expect, it, vi } from 'bun:test';
import { RuntimeStack } from '../RuntimeStack';
import { ExecutionTracker } from '../ExecutionTracker';
import { RuntimeMemory } from '../RuntimeMemory';
import { BlockKey } from '../../core/models/BlockKey';
import { PushBlockAction } from '../PushBlockAction';
import { TimerBehavior } from '../behaviors/TimerBehavior';
import { IRuntimeBlock, BlockLifecycleOptions } from '../IRuntimeBlock';

const createRuntimeStub = (captureReturn: { wallTimeMs: number; monotonicTimeMs: number }) => {
  const memory = new RuntimeMemory();
  const captureTimestamp = vi.fn((seed?: { wallTimeMs: number; monotonicTimeMs: number }) => seed ?? captureReturn);

  const runtime: any = {
    errors: [],
    eventBus: { unregisterByOwner: vi.fn() },
    memory,
    clock: {
      now: captureReturn.monotonicTimeMs,
      register: vi.fn(),
      unregister: vi.fn(),
      captureTimestamp,
    },
    handle: vi.fn(),
  };

  const stack = new RuntimeStack(runtime as any, new ExecutionTracker(memory));
  runtime.stack = stack;
  return runtime as any;
};

const createBlockStub = (label: string, nextImpl?: (options?: BlockLifecycleOptions) => void): IRuntimeBlock => {
  const key = new BlockKey();
  return {
    key,
    sourceIds: [1],
    blockType: 'Test',
    label,
    context: {
      release: vi.fn(),
    } as any,
    executionTiming: {},
    mount: vi.fn().mockReturnValue([]),
    next: vi.fn((runtime, options?: BlockLifecycleOptions) => {
      nextImpl?.(options);
      return [];
    }),
    unmount: vi.fn().mockReturnValue([]),
    dispose: vi.fn(),
    getBehavior: vi.fn().mockReturnValue(undefined),
  } as any;
};

describe('Lifecycle timestamps', () => {
  it('passes completedAt from pop to parent.next', () => {
    const completedAt = { wallTimeMs: 1234, monotonicTimeMs: 50 };
    const runtime = createRuntimeStub(completedAt);
    const tracker = new ExecutionTracker(runtime.memory);
    const stack = new RuntimeStack(runtime as any, tracker);

    let receivedOptions: BlockLifecycleOptions | undefined;
    const parent = createBlockStub('parent', options => {
      receivedOptions = options;
    });
    const child = createBlockStub('child');

    stack.push(parent);
    stack.push(child);

    stack.pop();

    expect(receivedOptions?.completedAt).toEqual(completedAt);
  });

  it('uses provided startTime when pushing children and calls mount with it', () => {
    const startTime = { wallTimeMs: 1111, monotonicTimeMs: 11 };
    const runtime = createRuntimeStub(startTime);
    const tracker = new ExecutionTracker(runtime.memory);
    const stack = new RuntimeStack(runtime as any, tracker);

    const child = createBlockStub('child');
    const action = new PushBlockAction(child, { startTime });

    action.do(runtime as any);

    expect(child.executionTiming?.startTime).toEqual(startTime);
    expect(child.mount).toHaveBeenCalledWith(runtime, expect.objectContaining({ startTime }));
  });

  it('keeps wall-clock aligned across pause/resume using monotonic deltas', () => {
    const startSeed = { wallTimeMs: 1000, monotonicTimeMs: 500 };
    const seeds = [
      { wallTimeMs: 1200, monotonicTimeMs: 700 }, // pause
      { wallTimeMs: 2000, monotonicTimeMs: 1500 }, // resume
    ];

    const memory = new RuntimeMemory();
    const events: Array<{ name: string; timestamp: Date }> = [];
    const captureTimestamp = vi.fn((seed?: { wallTimeMs: number; monotonicTimeMs: number }) => {
      if (seed) return seed;
      return seeds.shift() ?? { wallTimeMs: Date.now(), monotonicTimeMs: startSeed.monotonicTimeMs };
    });

    const runtime = {
      errors: [],
      eventBus: { unregisterByOwner: vi.fn() },
      memory,
      clock: {
        now: startSeed.monotonicTimeMs,
        register: vi.fn(),
        unregister: vi.fn(),
        captureTimestamp,
      },
      handle: (event: any) => events.push({ name: event.name, timestamp: event.timestamp }),
    } as any;

    const behavior = new TimerBehavior('up', undefined, 'Timer');
    const block: IRuntimeBlock = {
      key: new BlockKey('timer-block'),
      sourceIds: [1],
      blockType: 'Timer',
      label: 'Timer',
      context: { release: vi.fn() } as any,
      executionTiming: {},
      mount: vi.fn(),
      next: vi.fn(),
      unmount: vi.fn(),
      dispose: vi.fn(),
      getBehavior: vi.fn(),
    } as any;

    behavior.onPush(runtime, block, { startTime: startSeed });
    behavior.onTick(600, 100);
    behavior.pause();
    behavior.resume();
    behavior.onTick(1600, 100);

    const timestamps = events
      .filter(e => e.name === 'timer:started' || e.name === 'timer:tick')
      .map(e => e.timestamp.getTime());

    expect(timestamps).toEqual([1000, 1100, 2100]);
  });
});