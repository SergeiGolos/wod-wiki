import { describe, it, expect, beforeEach } from 'bun:test';
import { ChildRunnerBehavior } from '../ChildRunnerBehavior';
import { ChildIndexBehavior } from '../ChildIndexBehavior';
import { BoundTimerBehavior } from '../BoundTimerBehavior';
import { BoundLoopBehavior } from '../BoundLoopBehavior';
import { SinglePassBehavior } from '../SinglePassBehavior';
import { RoundPerLoopBehavior } from '../RoundPerLoopBehavior';
import { createMockClock } from '../../RuntimeClock';
import { IRuntimeBehavior } from '../../contracts/IRuntimeBehavior';
import { IRuntimeBlock } from '../../contracts/IRuntimeBlock';
import { BlockKey } from '@/core/models/BlockKey';

/**
 * Minimal mock block for testing behavior interactions.
 */
class SimpleMockBlock implements Partial<IRuntimeBlock> {
  public readonly key = new BlockKey();
  public readonly label = 'TestBlock';
  public readonly sourceIds: number[] = [];
  private readonly behaviors: IRuntimeBehavior[];

  constructor(behaviors: IRuntimeBehavior[]) {
    this.behaviors = behaviors;
  }

  getBehavior<T extends IRuntimeBehavior>(behaviorType: new (...args: any[]) => T): T | undefined {
    return this.behaviors.find(b => b instanceof behaviorType) as T | undefined;
  }
}

/**
 * ChildRunnerBehavior Tests
 * 
 * Verifies child block pushing behavior including timer completion checks.
 * These tests focus on the onNext() return values without executing actions.
 */
describe('ChildRunnerBehavior', () => {
  let mockClock: ReturnType<typeof createMockClock>;

  beforeEach(() => {
    mockClock = createMockClock(new Date('2024-01-01T12:00:00Z'));
  });

  describe('onNext() - timer completion checks', () => {
    it('should NOT push children when BoundTimerBehavior is complete (timer expired)', () => {
      const timerDurationMs = 5000; // 5 second timer
      const childIndex = new ChildIndexBehavior(3);
      const boundTimer = new BoundTimerBehavior(timerDurationMs, 'down', 'Countdown');
      const childRunner = new ChildRunnerBehavior([[1], [2], [3]]);

      const block = new SimpleMockBlock([childIndex, boundTimer, childRunner]) as unknown as IRuntimeBlock;

      // Initialize behaviors
      childIndex.onPush?.(block, mockClock);
      childIndex.onNext(block, mockClock); // index 0
      
      // Timer starts when pushed - simulate that
      boundTimer.start(mockClock.now);

      // Advance time past the timer duration
      mockClock.advance(timerDurationMs + 1000); // 6 seconds

      expect(boundTimer.isComplete(mockClock.now)).toBe(true);

      // onNext should return empty actions when timer is complete
      const actions = childRunner.onNext(block, mockClock);
      expect(actions).toEqual([]);
    });

    it('should push children when BoundTimerBehavior is NOT complete', () => {
      const timerDurationMs = 10000; // 10 second timer
      const childIndex = new ChildIndexBehavior(3);
      const boundTimer = new BoundTimerBehavior(timerDurationMs, 'down', 'Countdown');
      const childRunner = new ChildRunnerBehavior([[1], [2], [3]]);

      const block = new SimpleMockBlock([childIndex, boundTimer, childRunner]) as unknown as IRuntimeBlock;

      // Initialize behaviors
      childIndex.onPush?.(block, mockClock);
      childIndex.onNext(block, mockClock); // index 0

      // Timer starts when pushed
      boundTimer.start(mockClock.now);

      // Advance time but NOT past the timer duration
      mockClock.advance(3000); // 3 seconds

      expect(boundTimer.isComplete(mockClock.now)).toBe(false);

      // onNext should return compile-and-push-block action
      const actions = childRunner.onNext(block, mockClock);
      expect(actions.length).toBe(1);
      expect(actions[0].type).toBe('compile-and-push-block');
    });

    it('should handle blocks without timer behavior (no timer check needed)', () => {
      const childIndex = new ChildIndexBehavior(2);
      const childRunner = new ChildRunnerBehavior([[1], [2]]);

      const block = new SimpleMockBlock([childIndex, childRunner]) as unknown as IRuntimeBlock;

      // Initialize behaviors
      childIndex.onPush?.(block, mockClock);
      childIndex.onNext(block, mockClock); // index 0

      // onNext should still push children when no timer behavior present
      const actions = childRunner.onNext(block, mockClock);
      expect(actions.length).toBe(1);
      expect(actions[0].type).toBe('compile-and-push-block');
    });
  });

  describe('onNext() - loop completion checks', () => {
    it('should NOT push children when BoundLoopBehavior is complete', () => {
      const childIndex = new ChildIndexBehavior(2);
      const roundPerLoop = new RoundPerLoopBehavior();
      const boundLoop = new BoundLoopBehavior(1); // 1 round
      const childRunner = new ChildRunnerBehavior([[1], [2]]);

      const block = new SimpleMockBlock([childIndex, roundPerLoop, boundLoop, childRunner]) as unknown as IRuntimeBlock;

      // Initialize behaviors
      childIndex.onPush?.(block, mockClock);
      roundPerLoop.onPush?.(block, mockClock); // round = 1

      // Advance to second round
      childIndex.onNext(block, mockClock); // index 0
      childIndex.onNext(block, mockClock); // index 1
      childIndex.onNext(block, mockClock); // wraps to 0, hasJustWrapped = true
      roundPerLoop.onNext(block, mockClock); // round = 2

      // Trigger BoundLoopBehavior to mark complete
      boundLoop.onNext(block, mockClock); // should mark complete (round 2 > totalRounds 1)

      expect(boundLoop.isComplete()).toBe(true);

      // onNext should return empty actions when loop is complete
      const actions = childRunner.onNext(block, mockClock);
      expect(actions).toEqual([]);
    });

    it('should NOT push children when SinglePassBehavior is complete', () => {
      const childIndex = new ChildIndexBehavior(1);
      const roundPerLoop = new RoundPerLoopBehavior();
      const singlePass = new SinglePassBehavior();
      const childRunner = new ChildRunnerBehavior([[1]]);

      const block = new SimpleMockBlock([childIndex, roundPerLoop, singlePass, childRunner]) as unknown as IRuntimeBlock;

      // Initialize behaviors
      childIndex.onPush?.(block, mockClock);
      roundPerLoop.onPush?.(block, mockClock); // round = 1

      // Advance to trigger wrap
      childIndex.onNext(block, mockClock); // index 0
      childIndex.onNext(block, mockClock); // wraps to 0, hasJustWrapped = true
      roundPerLoop.onNext(block, mockClock); // round = 2
      
      // SinglePassBehavior should mark complete when round >= 2
      singlePass.onNext(block, mockClock); // should mark complete

      expect(singlePass.isComplete()).toBe(true);

      // onNext should return empty actions when single pass is complete
      const actions = childRunner.onNext(block, mockClock);
      expect(actions).toEqual([]);
    });
  });
});
