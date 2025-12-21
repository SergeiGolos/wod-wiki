import { describe, expect, it, vi } from 'bun:test';
import { ScriptRuntime } from '../ScriptRuntime';
import { RuntimeMemory } from '../RuntimeMemory';
import { BlockKey } from '../../core/models/BlockKey';
import { PushBlockAction } from '../PushBlockAction';
import { TimerBehavior } from '../behaviors/TimerBehavior';
import { IRuntimeBlock, BlockLifecycleOptions } from '../IRuntimeBlock';
import { WodScript } from '../../parser/WodScript';
import { JitCompiler } from '../JitCompiler';
import { RuntimeStack } from '../RuntimeStack';
import { RuntimeClock } from '../RuntimeClock';
import { EventBus } from '../EventBus';
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
    next: vi.fn((_runtime, options?: BlockLifecycleOptions) => {
      nextImpl?.(options);
      return [];
    }),
    unmount: vi.fn().mockReturnValue([]),
    dispose: vi.fn(),
    getBehavior: vi.fn().mockReturnValue(undefined),
  } as any;
};

describe('Lifecycle timestamps', () => {
  const script = new WodScript('test', []);
  const compiler = {} as JitCompiler;

  it('passes completedAt from pop to parent.next', () => {
    const completedAt = { wallTimeMs: 1234, monotonicTimeMs: 50 };
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
    const startTime = { wallTimeMs: 1111, monotonicTimeMs: 11 };
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

    const runtimeStub = {
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

    behavior.onPush(runtimeStub, block, { startTime: startSeed });
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