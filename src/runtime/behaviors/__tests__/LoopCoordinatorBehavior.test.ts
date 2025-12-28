import { describe, it, expect, vi, beforeEach } from 'bun:test';
import { BehaviorTestHarness, MockBlock } from '@/testing/harness';
import { LoopCoordinatorBehavior, LoopType } from '../LoopCoordinatorBehavior';
import { TimerBehavior } from '../TimerBehavior';
import { IEvent } from '../../IEvent';
import { IRuntimeBehavior } from '../../IRuntimeBehavior';
import { IRuntimeBlock } from '../../IRuntimeBlock';

/**
 * LoopCoordinatorBehavior Contract Tests (Migrated to Test Harness)
 * 
 * Tests the EMOM multi-round behavior coordination between loops and timers.
 */
describe('LoopCoordinatorBehavior - EMOM Multi-round', () => {
  let harness: BehaviorTestHarness;
  let mockTimerBehavior: Partial<TimerBehavior> & IRuntimeBehavior;

  beforeEach(() => {
    harness = new BehaviorTestHarness()
      .withClock(new Date('2024-01-01T12:00:00Z'));

    // Create a mock timer behavior with spied methods
    mockTimerBehavior = {
      restart: vi.fn(),
      isRunning: vi.fn(),
      isComplete: vi.fn(),
      onPush: vi.fn(() => []),
      onNext: vi.fn(() => []),
      onPop: vi.fn(() => []),
    } as unknown as Partial<TimerBehavior> & IRuntimeBehavior;
  });

  it('should restart timer for subsequent rounds', () => {
    const loopBehavior = new LoopCoordinatorBehavior({
      childGroups: [[1]],
      loopType: LoopType.INTERVAL,
      totalRounds: 3,
      intervalDurationMs: 60000,
    });

    // Create a mock block that returns our mock timer for getBehavior
    const mockBlock: IRuntimeBlock = {
      key: { toString: () => 'block-1' },
      getBehavior: vi.fn((type: any) => {
        if (type === TimerBehavior) return mockTimerBehavior;
        return undefined;
      }),
      sourceIds: [],
      blockType: 'MockBlock',
      label: 'MockBlock',
      context: { ownerId: 'block-1' } as any,
      fragments: [],
      executionTiming: {},
      mount: vi.fn(() => []),
      next: vi.fn(() => []),
      unmount: vi.fn(() => []),
      dispose: vi.fn(),
    } as unknown as IRuntimeBlock;

    // Mock the runtime's script and jit for the loop coordinator
    (harness.runtime as any).script = { getIds: vi.fn().mockReturnValue([{}]) };
    (harness.runtime as any).jit = { compile: vi.fn().mockReturnValue({}) };

    // 1. Start Round 0
    loopBehavior.onPush(harness.runtime, mockBlock);

    // Check if timer was restarted on push
    expect(mockTimerBehavior.restart).toHaveBeenCalledTimes(1);

    // 2. Simulate Round 0 completion - Child pops, timer is running
    (mockTimerBehavior.isRunning as any).mockReturnValue(true);
    (mockTimerBehavior.isComplete as any).mockReturnValue(false);
    loopBehavior.onNext(harness.runtime, mockBlock); // Should return [] (waiting)

    // 3. Simulate Timer Complete (Interval End)
    const event: IEvent = { name: 'timer:complete', data: { blockId: 'block-1' }, timestamp: new Date() };
    loopBehavior.onEvent(event, harness.runtime, mockBlock);

    // Expect: Advance to Round 1 - timer.restart() called
    expect(mockTimerBehavior.restart).toHaveBeenCalledTimes(2);
    expect(loopBehavior.getState().rounds).toBe(1);

    // 4. Simulate Round 1 waiting
    loopBehavior.onNext(harness.runtime, mockBlock);

    // 5. Timer Complete Round 1
    loopBehavior.onEvent(event, harness.runtime, mockBlock);

    expect(mockTimerBehavior.restart).toHaveBeenCalledTimes(3);
    expect(loopBehavior.getState().rounds).toBe(2);
  });
});
