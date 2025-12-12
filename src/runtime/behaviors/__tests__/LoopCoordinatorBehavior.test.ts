
import { describe, it, expect, vi, beforeEach } from 'bun:test';
import { LoopCoordinatorBehavior, LoopType } from '../LoopCoordinatorBehavior';
import { IRuntimeBlock } from '../../IRuntimeBlock';
import { IScriptRuntime } from '../../IScriptRuntime';
import { TimerBehavior } from '../TimerBehavior';
import { PushBlockAction } from '../../PushBlockAction';
import { IEvent } from '../../IEvent';

// Mocks
const mockRuntime = {
  script: {
    getIds: vi.fn(),
  },
  jit: {
    compile: vi.fn(),
  },
  memory: {
    search: vi.fn().mockReturnValue([]),
    allocate: vi.fn(),
    get: vi.fn(),
    set: vi.fn(),
  },
  clock: {
    register: vi.fn(),
    unregister: vi.fn(),
    now: 1000,
  },
  handle: vi.fn(),
} as unknown as IScriptRuntime;

const mockBlock = {
  key: { toString: () => 'block-1' },
  getBehavior: vi.fn(),
} as unknown as IRuntimeBlock;

const mockTimerBehavior = {
  restart: vi.fn(),
  isRunning: vi.fn(),
  isComplete: vi.fn(),
} as unknown as TimerBehavior;

describe('LoopCoordinatorBehavior - EMOM Multi-round', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (mockBlock.getBehavior as any).mockReturnValue(mockTimerBehavior);
    (mockRuntime.script.getIds as any).mockReturnValue([{}]);
    (mockRuntime.jit.compile as any).mockReturnValue({});
  });

  it('should restart timer for subsequent rounds', () => {
    const behavior = new LoopCoordinatorBehavior({
      childGroups: [[1]],
      loopType: LoopType.INTERVAL,
      totalRounds: 3,
      intervalDurationMs: 60000,
    });

    // 1. Start Round 0
    behavior.onPush(mockRuntime, mockBlock);

    // Check if timer was restarted (emitRoundChanged calls it)
    expect(mockTimerBehavior.restart).toHaveBeenCalledTimes(1);

    // 2. Simulate Round 0 completion
    // Child pops. Timer is running. We wait.
    (mockTimerBehavior.isRunning as any).mockReturnValue(true);
    (mockTimerBehavior.isComplete as any).mockReturnValue(false);
    behavior.onNext(mockRuntime, mockBlock); // Should return [] (waiting)

    // 3. Simulate Timer Complete (Interval End)
    // Dispatch timer:complete
    const event: IEvent = { name: 'timer:complete', data: { blockId: 'block-1' }, timestamp: new Date() };
    behavior.onEvent(event, mockRuntime, mockBlock);

    // Expect: Advance to Round 1
    // advance() calls emitRoundChanged
    // emitRoundChanged calls timer.restart()
    expect(mockTimerBehavior.restart).toHaveBeenCalledTimes(2);
    expect(behavior.getState().rounds).toBe(1);

    // 4. Simulate Round 1 completion (slow work, finishes AFTER timer?)
    // No, let's simulate fast work again.
    behavior.onNext(mockRuntime, mockBlock); // Wait

    // 5. Timer Complete Round 1
    behavior.onEvent(event, mockRuntime, mockBlock);

    expect(mockTimerBehavior.restart).toHaveBeenCalledTimes(3); // Round 2 started
    expect(behavior.getState().rounds).toBe(2);
  });
});
