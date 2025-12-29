import { describe, it, expect, vi, beforeEach } from 'bun:test';
import { BehaviorTestHarness, MockBlock } from '@/testing/harness';
import { LoopCoordinatorBehavior, LoopType } from '../LoopCoordinatorBehavior';
import { TimerBehavior } from '../TimerBehavior';
import { IEvent } from '../../contracts/events/IEvent';
import { IRuntimeBehavior } from '../../contracts/IRuntimeBehavior';
import { IRuntimeBlock } from '../../contracts/IRuntimeBlock';

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

    // Create a real timer behavior and spy on its methods
    mockTimerBehavior = new TimerBehavior('up') as any;
    vi.spyOn(mockTimerBehavior, 'restart');
    vi.spyOn(mockTimerBehavior, 'isRunning');
    vi.spyOn(mockTimerBehavior, 'isComplete');
    vi.spyOn(mockTimerBehavior, 'onPush').mockReturnValue([]);
    vi.spyOn(mockTimerBehavior, 'onNext').mockReturnValue([]);
    vi.spyOn(mockTimerBehavior, 'onPop').mockReturnValue([]);
  });

  it('should restart timer for subsequent rounds', () => {
    const loopBehavior = new LoopCoordinatorBehavior({
      childGroups: [[1]],
      loopType: LoopType.INTERVAL,
      totalRounds: 3,
      intervalDurationMs: 60000,
    });

    // Create a MockBlock and inject behaviors
    const mockBlock = new MockBlock('block-1', [loopBehavior]);
    (mockBlock as any).behaviors.push(mockTimerBehavior);

    // Mock the runtime's script and jit for the loop coordinator
    (harness.runtime as any).script = { getIds: vi.fn().mockReturnValue([{}]) };
    (harness.runtime as any).jit = { compile: vi.fn().mockReturnValue({}) };

    // 1. Start Round 0
    loopBehavior.onPush(mockBlock);

    // Check if timer was restarted on push
    expect(mockTimerBehavior.restart).toHaveBeenCalledTimes(1);

    // 2. Simulate Round 0 completion - Child pops, timer is running
    (mockTimerBehavior.isRunning as any).mockReturnValue(true);
    (mockTimerBehavior.isComplete as any).mockReturnValue(false);
    loopBehavior.onNext(mockBlock); // Should return [] (waiting)

    // 3. Simulate Timer Complete (Interval End)
    const event: IEvent = { name: 'timer:complete', data: { blockId: 'block-1' }, timestamp: new Date() };
    loopBehavior.onEvent(event, mockBlock);

    // Expect: Advance to Round 1 - timer.restart() called
    expect(mockTimerBehavior.restart).toHaveBeenCalledTimes(2);
    expect(loopBehavior.getState().rounds).toBe(1);

    // 4. Simulate Round 1 waiting
    loopBehavior.onNext(mockBlock);

    // 5. Timer Complete Round 1
    loopBehavior.onEvent(event, mockBlock);

    expect(mockTimerBehavior.restart).toHaveBeenCalledTimes(3);
    expect(loopBehavior.getState().rounds).toBe(2);
  });
});
