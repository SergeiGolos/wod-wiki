import { describe, it, expect, beforeEach } from 'bun:test';
import { BehaviorTestHarness } from '@/testing/harness';
import { FragmentType, ICodeFragment } from '@/core/models/CodeFragment';
import { MetricBehavior } from '@/types/MetricBehavior';
import { PopBlockAction } from '@/runtime/actions/stack/PopBlockAction';
import { CompileAndPushBlockAction } from '@/runtime/actions/stack/CompileAndPushBlockAction';
import { ClearChildrenAction } from '@/runtime/actions/stack/ClearChildrenAction';

import { FragmentBucket } from '../FragmentBucket';
import { TimerCapability } from '../TimerCapability';
import { GateBlock } from '../GateBlock';
import { TimerLeafBlock } from '../TimerLeafBlock';
import { EffortLeafBlock } from '../EffortLeafBlock';
import { SequentialContainerBlock } from '../SequentialContainerBlock';
import { RoundLoopBlock } from '../RoundLoopBlock';
import { AmrapBlock } from '../AmrapBlock';
import { EmomBlock } from '../EmomBlock';

// ============================================================================
// FragmentBucket
// ============================================================================
describe('FragmentBucket', () => {
  let bucket: FragmentBucket;

  beforeEach(() => {
    bucket = new FragmentBucket();
  });

  it('starts empty', () => {
    expect(bucket.count).toBe(0);
    expect(bucket.all).toEqual([]);
  });

  it('adds and retrieves fragments', () => {
    const frag: ICodeFragment = {
      fragmentType: FragmentType.Label,
      type: 'label',
      image: 'Rest',
      origin: 'compiler',
      behavior: MetricBehavior.Defined,
      value: 'Rest',
    };
    bucket.add(frag);
    expect(bucket.count).toBe(1);
    expect(bucket.firstOfType(FragmentType.Label)).toBe(frag);
  });

  it('classifies plan fragments (Defined, Hint)', () => {
    bucket.add({ fragmentType: FragmentType.Duration, type: 'duration', behavior: MetricBehavior.Defined, origin: 'compiler', value: 60000 });
    bucket.add({ fragmentType: FragmentType.Effort, type: 'effort', behavior: MetricBehavior.Hint, origin: 'compiler', value: 'easy' });
    bucket.add({ fragmentType: FragmentType.Spans, type: 'spans', behavior: MetricBehavior.Recorded, origin: 'runtime', value: [] });

    expect(bucket.getPlan()).toHaveLength(2);
    expect(bucket.getRecord()).toHaveLength(1);
    expect(bucket.getAnalysis()).toHaveLength(0);
  });

  it('replaceByType replaces all of a given type', () => {
    bucket.add({ fragmentType: FragmentType.Rep, type: 'rep', behavior: MetricBehavior.Defined, origin: 'compiler', value: 10 });
    bucket.add({ fragmentType: FragmentType.Rep, type: 'rep', behavior: MetricBehavior.Recorded, origin: 'runtime', value: 5 });
    bucket.add({ fragmentType: FragmentType.Effort, type: 'effort', behavior: MetricBehavior.Defined, origin: 'compiler', value: 'Burpees' });

    bucket.replaceByType(FragmentType.Rep, [
      { fragmentType: FragmentType.Rep, type: 'rep', behavior: MetricBehavior.Recorded, origin: 'runtime', value: 10 },
    ]);

    expect(bucket.byType(FragmentType.Rep)).toHaveLength(1);
    expect(bucket.byType(FragmentType.Effort)).toHaveLength(1);
  });

  it('remove filters by predicate', () => {
    bucket.add({ fragmentType: FragmentType.Rep, type: 'rep', behavior: MetricBehavior.Defined, origin: 'compiler', value: 10 });
    bucket.add({ fragmentType: FragmentType.Rep, type: 'rep', behavior: MetricBehavior.Recorded, origin: 'runtime', value: 5 });

    bucket.remove(f => f.behavior === MetricBehavior.Recorded);
    expect(bucket.count).toBe(1);
    expect(bucket.all[0].behavior).toBe(MetricBehavior.Defined);
  });

  it('notifies subscribers on change', () => {
    const changes: number[] = [];
    bucket.subscribe((frags) => changes.push(frags.length));

    bucket.add({ fragmentType: FragmentType.Label, type: 'label', value: 'A' });
    bucket.add({ fragmentType: FragmentType.Label, type: 'label', value: 'B' });
    expect(changes).toEqual([1, 2]);
  });

  it('dispose clears fragments and listeners', () => {
    bucket.add({ fragmentType: FragmentType.Label, type: 'label', value: 'X' });
    const changes: number[] = [];
    bucket.subscribe((frags) => changes.push(frags.length));
    bucket.dispose();

    expect(bucket.count).toBe(0);
    // After dispose, adding should not notify
    bucket.add({ fragmentType: FragmentType.Label, type: 'label', value: 'Y' });
    expect(changes).toHaveLength(0);
  });

  it('valueOf returns value of first fragment of given type', () => {
    bucket.add({ fragmentType: FragmentType.Duration, type: 'duration', value: 60000 });
    expect(bucket.valueOf<number>(FragmentType.Duration)).toBe(60000);
    expect(bucket.valueOf<string>(FragmentType.Label)).toBeUndefined();
  });
});

// ============================================================================
// TimerCapability
// ============================================================================
describe('TimerCapability', () => {
  it('tracks elapsed time across spans', () => {
    const timer = new TimerCapability({ direction: 'up' });
    const t0 = new Date('2024-01-01T12:00:00Z');
    timer.openSpan(t0);
    const t1 = new Date(t0.getTime() + 5000);
    expect(timer.getElapsedMs(t1)).toBe(5000);
  });

  it('detects countdown expiry', () => {
    const timer = new TimerCapability({ direction: 'down', durationMs: 10000 });
    const t0 = new Date('2024-01-01T12:00:00Z');
    timer.openSpan(t0);

    expect(timer.isExpired(new Date(t0.getTime() + 5000))).toBe(false);
    expect(timer.isExpired(new Date(t0.getTime() + 10000))).toBe(true);
    expect(timer.isExpired(new Date(t0.getTime() + 15000))).toBe(true);
  });

  it('pauses and resumes', () => {
    const timer = new TimerCapability({ direction: 'up' });
    const t0 = new Date('2024-01-01T12:00:00Z');
    timer.openSpan(t0);
    const pauseAt = new Date(t0.getTime() + 3000);
    timer.pause(pauseAt);
    expect(timer.isRunning).toBe(false);
    expect(timer.getElapsedMs(pauseAt)).toBe(3000);

    const resumeAt = new Date(t0.getTime() + 10000);
    timer.resume(resumeAt);
    expect(timer.isRunning).toBe(true);

    const checkAt = new Date(t0.getTime() + 12000);
    // 3s (first span) + 2s (second span from 10s to 12s) = 5s
    expect(timer.getElapsedMs(checkAt)).toBe(5000);
  });

  it('getRemainingMs returns correct countdown remaining', () => {
    const timer = new TimerCapability({ direction: 'down', durationMs: 10000 });
    const t0 = new Date('2024-01-01T12:00:00Z');
    timer.openSpan(t0);
    expect(timer.getRemainingMs(new Date(t0.getTime() + 3000))).toBe(7000);
    expect(timer.getRemainingMs(new Date(t0.getTime() + 15000))).toBe(0);
  });

  it('resetSpans clears and reopens', () => {
    const timer = new TimerCapability({ direction: 'down', durationMs: 60000 });
    const t0 = new Date('2024-01-01T12:00:00Z');
    timer.openSpan(t0);
    timer.closeSpan(new Date(t0.getTime() + 30000));

    const t1 = new Date(t0.getTime() + 35000);
    timer.resetSpans(t1);
    expect(timer.spans).toHaveLength(1);
    expect(timer.getElapsedMs(t1)).toBe(0);
    expect(timer.isRunning).toBe(true);
  });

  it('syncToFragments writes spans fragment to bucket', () => {
    const timer = new TimerCapability({ direction: 'down', durationMs: 10000, label: 'Test', role: 'primary' });
    const t0 = new Date('2024-01-01T12:00:00Z');
    timer.openSpan(t0);

    const bucket = new FragmentBucket();
    timer.syncToFragments(bucket, new Date(t0.getTime() + 2000));

    const spansFrags = bucket.byType(FragmentType.Spans);
    expect(spansFrags).toHaveLength(1);
    expect(spansFrags[0].behavior).toBe(MetricBehavior.Recorded);
    const val = spansFrags[0].value as { direction: string; durationMs: number; label: string; role: string };
    expect(val.direction).toBe('down');
    expect(val.durationMs).toBe(10000);
    expect(val.label).toBe('Test');
    expect(val.role).toBe('primary');
  });

  it('count-up timer never expires', () => {
    const timer = new TimerCapability({ direction: 'up' });
    const t0 = new Date('2024-01-01T12:00:00Z');
    timer.openSpan(t0);
    expect(timer.isExpired(new Date(t0.getTime() + 999999999))).toBe(false);
  });
});

// ============================================================================
// GateBlock
// ============================================================================
describe('GateBlock', () => {
  let harness: BehaviorTestHarness;

  beforeEach(() => {
    harness = new BehaviorTestHarness()
      .withClock(new Date('2024-01-01T12:00:00Z'));
  });

  it('creates with default "Ready" label and "Start" button', () => {
    const block = new GateBlock(harness.runtime);
    expect(block.blockType).toBe('Gate');
    expect(block.label).toBe('Ready');

    const actions = block.fragments.byType(FragmentType.Action);
    expect(actions).toHaveLength(1);
    expect(actions[0].image).toBe('Start');
  });

  it('creates with custom label and buttons', () => {
    const block = new GateBlock(harness.runtime, {
      label: 'Get Set',
      buttons: [
        { id: 'go', label: 'Go!', eventName: 'next' },
        { id: 'skip', label: 'Skip', eventName: 'skip' },
      ],
    });
    expect(block.label).toBe('Get Set');
    const actions = block.fragments.byType(FragmentType.Action);
    expect(actions).toHaveLength(2);
    expect(actions[0].image).toBe('Go!');
    expect(actions[1].image).toBe('Skip');
  });

  it('onMount returns no actions (just waits)', () => {
    const block = new GateBlock(harness.runtime);
    const actions = block.mount(harness.runtime, { clock: harness.clock });
    expect(actions).toHaveLength(0);
    expect(block.isComplete).toBe(false);
  });

  it('completes on first next() call with user-advance reason', () => {
    const block = new GateBlock(harness.runtime);
    block.mount(harness.runtime, { clock: harness.clock });

    const actions = block.next(harness.runtime, { clock: harness.clock });
    expect(block.isComplete).toBe(true);
    expect(block.completionReason).toBe('user-advance');

    // Should contain a PopBlockAction (auto-pop on complete)
    const popActions = actions.filter(a => a.type === 'pop-block');
    expect(popActions.length).toBeGreaterThanOrEqual(1);
  });

  it('dispose cleans up properly', () => {
    const block = new GateBlock(harness.runtime);
    block.mount(harness.runtime, { clock: harness.clock });
    block.unmount(harness.runtime, { clock: harness.clock });
    block.dispose(harness.runtime);

    expect(block.fragments.count).toBe(0);
  });
});

// ============================================================================
// TimerLeafBlock
// ============================================================================
describe('TimerLeafBlock', () => {
  let harness: BehaviorTestHarness;

  beforeEach(() => {
    harness = new BehaviorTestHarness()
      .withClock(new Date('2024-01-01T12:00:00Z'));
  });

  it('creates with duration fragment', () => {
    const block = new TimerLeafBlock(harness.runtime, {
      durationMs: 60000,
      label: 'Rest',
    });
    expect(block.blockType).toBe('TimerLeaf');
    expect(block.label).toBe('Rest');

    const durations = block.fragments.byType(FragmentType.Duration);
    expect(durations).toHaveLength(1);
    expect(durations[0].value).toBe(60000);
  });

  it('starts countdown on mount', () => {
    const block = new TimerLeafBlock(harness.runtime, { durationMs: 10000 });
    block.mount(harness.runtime, { clock: harness.clock });

    expect(block.timer.isRunning).toBe(true);
    expect(block.isComplete).toBe(false);
  });

  it('auto-completes when timer expires via tick event', () => {
    const block = new TimerLeafBlock(harness.runtime, { durationMs: 5000 });
    harness.push(block);
    harness.mount();

    expect(block.isComplete).toBe(false);

    // Advance past expiry and simulate tick
    harness.advanceClock(6000);
    harness.simulateTick();

    expect(block.isComplete).toBe(true);
    expect(block.completionReason).toBe('timer-expired');
  });

  it('ignores next() when allowSkip is false (default)', () => {
    const block = new TimerLeafBlock(harness.runtime, { durationMs: 10000 });
    block.mount(harness.runtime, { clock: harness.clock });

    block.next(harness.runtime, { clock: harness.clock });
    expect(block.isComplete).toBe(false);
  });

  it('completes on next() when allowSkip is true', () => {
    const block = new TimerLeafBlock(harness.runtime, {
      durationMs: 10000,
      allowSkip: true,
    });
    block.mount(harness.runtime, { clock: harness.clock });

    const actions = block.next(harness.runtime, { clock: harness.clock });
    expect(block.isComplete).toBe(true);
    expect(block.completionReason).toBe('user-advance');
    expect(actions.some(a => a.type === 'pop-block')).toBe(true);
  });

  it('syncs timer to fragments on unmount', () => {
    const block = new TimerLeafBlock(harness.runtime, { durationMs: 10000, label: 'Rest' });
    block.mount(harness.runtime, { clock: harness.clock });
    harness.advanceClock(3000);
    block.unmount(harness.runtime, { clock: harness.clock });

    const spans = block.fragments.byType(FragmentType.Spans);
    expect(spans).toHaveLength(1);
    expect(spans[0].behavior).toBe(MetricBehavior.Recorded);
  });
});

// ============================================================================
// EffortLeafBlock
// ============================================================================
describe('EffortLeafBlock', () => {
  let harness: BehaviorTestHarness;

  beforeEach(() => {
    harness = new BehaviorTestHarness()
      .withClock(new Date('2024-01-01T12:00:00Z'));
  });

  it('creates with rep and effort fragments', () => {
    const block = new EffortLeafBlock(harness.runtime, {
      exerciseName: 'Burpees',
      targetReps: 15,
    });

    expect(block.blockType).toBe('Effort');
    expect(block.label).toBe('15 Burpees');
    expect(block.targetReps).toBe(15);
    expect(block.currentReps).toBe(0);
    expect(block.exerciseName).toBe('Burpees');

    const reps = block.fragments.byType(FragmentType.Rep);
    expect(reps).toHaveLength(1);
    expect(reps[0].behavior).toBe(MetricBehavior.Defined);

    const efforts = block.fragments.byType(FragmentType.Effort);
    expect(efforts).toHaveLength(1);
    expect(efforts[0].image).toBe('Burpees');
  });

  it('tracks rep increments', () => {
    const block = new EffortLeafBlock(harness.runtime, {
      exerciseName: 'Squats',
      targetReps: 5,
    });

    block.incrementRep();
    expect(block.currentReps).toBe(1);
    block.incrementRep();
    expect(block.currentReps).toBe(2);

    // Writes recorded rep fragment
    const recordedReps = block.fragments.byType(FragmentType.Rep).filter(
      f => f.behavior === MetricBehavior.Recorded
    );
    expect(recordedReps).toHaveLength(1);
    expect((recordedReps[0].value as { current: number }).current).toBe(2);
  });

  it('does not increment past target', () => {
    const block = new EffortLeafBlock(harness.runtime, {
      exerciseName: 'Pushups',
      targetReps: 2,
    });
    block.incrementRep();
    block.incrementRep();
    block.incrementRep(); // should be capped
    expect(block.currentReps).toBe(2);
    expect(block.isTargetComplete).toBe(true);
  });

  it('setReps sets count directly (capped at target)', () => {
    const block = new EffortLeafBlock(harness.runtime, {
      exerciseName: 'Lunges',
      targetReps: 10,
    });
    block.setReps(7);
    expect(block.currentReps).toBe(7);
    block.setReps(20);
    expect(block.currentReps).toBe(10);
  });

  it('completes with target-achieved when target met', () => {
    const block = new EffortLeafBlock(harness.runtime, {
      exerciseName: 'Sit-ups',
      targetReps: 3,
    });
    block.mount(harness.runtime, { clock: harness.clock });

    block.incrementRep();
    block.incrementRep();
    block.incrementRep();

    const actions = block.next(harness.runtime, { clock: harness.clock });
    expect(block.isComplete).toBe(true);
    expect(block.completionReason).toBe('target-achieved');
    expect(actions.some(a => a.type === 'pop-block')).toBe(true);
  });

  it('completes with user-advance when target NOT met', () => {
    const block = new EffortLeafBlock(harness.runtime, {
      exerciseName: 'Pull-ups',
      targetReps: 10,
    });
    block.mount(harness.runtime, { clock: harness.clock });
    block.incrementRep();

    const actions = block.next(harness.runtime, { clock: harness.clock });
    expect(block.isComplete).toBe(true);
    expect(block.completionReason).toBe('user-advance');
    expect(actions.some(a => a.type === 'pop-block')).toBe(true);
  });

  it('starts a segment timer on mount', () => {
    const block = new EffortLeafBlock(harness.runtime, {
      exerciseName: 'Deadlifts',
      targetReps: 5,
    });
    block.mount(harness.runtime, { clock: harness.clock });

    expect(block.timer.isRunning).toBe(true);
    expect(block.timer.direction).toBe('up');
    expect(block.timer.role).toBe('secondary');
  });
});

// ============================================================================
// SequentialContainerBlock
// ============================================================================
describe('SequentialContainerBlock', () => {
  let harness: BehaviorTestHarness;

  beforeEach(() => {
    harness = new BehaviorTestHarness()
      .withClock(new Date('2024-01-01T12:00:00Z'));
  });

  it('creates with correct config', () => {
    const block = new SequentialContainerBlock(harness.runtime, {
      label: 'Warm-up',
      childGroups: [[1], [2], [3]],
    });
    expect(block.blockType).toBe('Group');
    expect(block.label).toBe('Warm-up');
  });

  it('dispatches first child on mount via CompileAndPushBlockAction', () => {
    const block = new SequentialContainerBlock(harness.runtime, {
      childGroups: [[1], [2]],
    });

    const actions = block.mount(harness.runtime, { clock: harness.clock });

    const compileActions = actions.filter(a => a.type === 'compile-and-push-block') as CompileAndPushBlockAction[];
    expect(compileActions).toHaveLength(1);
    expect(compileActions[0].statementIds).toEqual([1]);
  });

  it('dispatches next child on each next() call', () => {
    const block = new SequentialContainerBlock(harness.runtime, {
      childGroups: [[1], [2], [3]],
    });
    block.mount(harness.runtime, { clock: harness.clock });

    // After first child completes, next() dispatches second
    const actions1 = block.next(harness.runtime, { clock: harness.clock });
    const compile1 = actions1.filter(a => a.type === 'compile-and-push-block') as CompileAndPushBlockAction[];
    expect(compile1).toHaveLength(1);
    expect(compile1[0].statementIds).toEqual([2]);

    // After second child completes, next() dispatches third
    const actions2 = block.next(harness.runtime, { clock: harness.clock });
    const compile2 = actions2.filter(a => a.type === 'compile-and-push-block') as CompileAndPushBlockAction[];
    expect(compile2).toHaveLength(1);
    expect(compile2[0].statementIds).toEqual([3]);
  });

  it('completes after all children exhausted (no loop)', () => {
    const block = new SequentialContainerBlock(harness.runtime, {
      childGroups: [[1]],
    });
    block.mount(harness.runtime, { clock: harness.clock });

    // Child completes, no more children
    block.next(harness.runtime, { clock: harness.clock });
    expect(block.isComplete).toBe(true);
    expect(block.completionReason).toBe('children-complete');
  });

  it('starts a count-up timer on mount', () => {
    const block = new SequentialContainerBlock(harness.runtime, {
      childGroups: [[1]],
    });
    block.mount(harness.runtime, { clock: harness.clock });
    expect(block.timer.isRunning).toBe(true);
    expect(block.timer.direction).toBe('up');
  });
});

// ============================================================================
// RoundLoopBlock
// ============================================================================
describe('RoundLoopBlock', () => {
  let harness: BehaviorTestHarness;

  beforeEach(() => {
    harness = new BehaviorTestHarness()
      .withClock(new Date('2024-01-01T12:00:00Z'));
  });

  it('creates with correct N-round config', () => {
    const block = new RoundLoopBlock(harness.runtime, {
      childGroups: [[1], [2]],
      totalRounds: 3,
    });
    expect(block.blockType).toBe('Rounds');
    expect(block.label).toBe('3 Rounds');
  });

  it('dispatches first child on mount', () => {
    const block = new RoundLoopBlock(harness.runtime, {
      childGroups: [[1], [2]],
      totalRounds: 2,
    });
    const actions = block.mount(harness.runtime, { clock: harness.clock });
    const compiles = actions.filter(a => a.type === 'compile-and-push-block') as CompileAndPushBlockAction[];
    expect(compiles).toHaveLength(1);
    expect(compiles[0].statementIds).toEqual([1]);
  });

  it('loops through children for N rounds then completes', () => {
    const block = new RoundLoopBlock(harness.runtime, {
      childGroups: [[1]],
      totalRounds: 2,
    });
    block.mount(harness.runtime, { clock: harness.clock });

    // Round 1, child 1 done → loop restart for round 2
    const a1 = block.next(harness.runtime, { clock: harness.clock });
    expect(block.isComplete).toBe(false);
    // Should have dispatched child again for round 2
    const compiles1 = a1.filter(a => a.type === 'compile-and-push-block');
    expect(compiles1.length).toBeGreaterThanOrEqual(1);

    // Round 2, child 1 done → all rounds exhausted → complete
    block.next(harness.runtime, { clock: harness.clock });
    expect(block.isComplete).toBe(true);
    expect(block.completionReason).toBe('children-complete');
  });

  it('tracks current round in fragments', () => {
    const block = new RoundLoopBlock(harness.runtime, {
      childGroups: [[1]],
      totalRounds: 3,
    });
    block.mount(harness.runtime, { clock: harness.clock });

    const roundFrag = block.fragments.firstOfType(FragmentType.CurrentRound);
    expect(roundFrag).toBeDefined();
    expect((roundFrag!.value as { current: number }).current).toBe(1);

    // After first round completes (next dispatches round 2)
    block.next(harness.runtime, { clock: harness.clock });
    const roundFrag2 = block.fragments.firstOfType(FragmentType.CurrentRound);
    expect((roundFrag2!.value as { current: number }).current).toBe(2);
  });
});

// ============================================================================
// AmrapBlock
// ============================================================================
describe('AmrapBlock', () => {
  let harness: BehaviorTestHarness;

  beforeEach(() => {
    harness = new BehaviorTestHarness()
      .withClock(new Date('2024-01-01T12:00:00Z'));
  });

  it('creates with unbounded rounds and countdown timer', () => {
    const block = new AmrapBlock(harness.runtime, {
      durationMs: 600000, // 10 min
      childGroups: [[1], [2]],
    });
    expect(block.blockType).toBe('AMRAP');
    expect(block.timer.direction).toBe('down');
    expect(block.timer.durationMs).toBe(600000);
  });

  it('starts countdown on mount and dispatches first child', () => {
    const block = new AmrapBlock(harness.runtime, {
      durationMs: 60000,
      childGroups: [[1]],
    });
    const actions = block.mount(harness.runtime, { clock: harness.clock });

    expect(block.timer.isRunning).toBe(true);
    // Should dispatch first child
    const compiles = actions.filter(a => a.type === 'compile-and-push-block');
    expect(compiles).toHaveLength(1);
  });

  it('loops children while timer is active', () => {
    const block = new AmrapBlock(harness.runtime, {
      durationMs: 60000,
      childGroups: [[1]],
    });
    block.mount(harness.runtime, { clock: harness.clock });

    // Child done — should loop (timer still active)
    harness.advanceClock(10000);
    const a1 = block.next(harness.runtime, { clock: harness.clock });
    expect(block.isComplete).toBe(false);
    // Should have dispatched next child
    const compiles = a1.filter(a => a.type === 'compile-and-push-block');
    expect(compiles.length).toBeGreaterThanOrEqual(1);
  });

  it('completes when timer expires via tick event', () => {
    const block = new AmrapBlock(harness.runtime, {
      durationMs: 10000,
      childGroups: [[1]],
    });
    // Mount directly to avoid executing CompileAndPushBlockAction
    block.mount(harness.runtime, { clock: harness.clock });
    // Manually push to stack for event dispatch
    harness.runtime.stack.push(block);

    harness.advanceClock(11000);
    harness.simulateTick();

    expect(block.isComplete).toBe(true);
    expect(block.completionReason).toBe('timer-expired');
  });

  it('does not loop after timer expires', () => {
    const block = new AmrapBlock(harness.runtime, {
      durationMs: 10000,
      childGroups: [[1]],
    });
    block.mount(harness.runtime, { clock: harness.clock });
    harness.advanceClock(11000);

    // Even without tick event, shouldLoop() should be false
    block.next(harness.runtime, { clock: harness.clock });
    // Since timer expired but completion was not marked via tick yet,
    // it should still not loop because shouldLoop checks timer.isExpired
    expect(block.isComplete).toBe(true);
    expect(block.completionReason).toBe('children-complete');
  });

  it('emits ClearChildrenAction when timer expires on tick', () => {
    const block = new AmrapBlock(harness.runtime, {
      durationMs: 5000,
      childGroups: [[1]],
    });
    // Mount directly, then push to stack for event routing
    block.mount(harness.runtime, { clock: harness.clock });
    harness.runtime.stack.push(block);

    // Dispatch tick event directly through event bus to capture returned actions
    harness.advanceClock(6000);
    const event = { name: 'tick', timestamp: harness.clock.now, data: { source: 'test' } };
    const actions = harness.runtime.eventBus.dispatch(event, harness.runtime);

    // The tick handler should return ClearChildrenAction
    const clearAction = actions.find(a => a.type === 'clear-children');
    expect(clearAction).toBeDefined();
    expect(block.isComplete).toBe(true);
  });
});

// ============================================================================
// EmomBlock
// ============================================================================
describe('EmomBlock', () => {
  let harness: BehaviorTestHarness;

  beforeEach(() => {
    harness = new BehaviorTestHarness()
      .withClock(new Date('2024-01-01T12:00:00Z'));
  });

  it('creates with interval duration and round count', () => {
    const block = new EmomBlock(harness.runtime, {
      intervalMs: 60000,
      totalRounds: 10,
      childGroups: [[1]],
    });
    expect(block.blockType).toBe('EMOM');
    expect(block.timer.direction).toBe('down');
    expect(block.timer.durationMs).toBe(60000);

    const durations = block.fragments.byType(FragmentType.Duration);
    expect(durations).toHaveLength(1);
    expect(durations[0].value).toBe(60000);
  });

  it('starts interval timer on mount', () => {
    const block = new EmomBlock(harness.runtime, {
      intervalMs: 60000,
      totalRounds: 3,
      childGroups: [[1]],
    });
    block.mount(harness.runtime, { clock: harness.clock });

    expect(block.timer.isRunning).toBe(true);
  });

  it('resets timer on interval expiry and advances round', () => {
    const block = new EmomBlock(harness.runtime, {
      intervalMs: 60000,
      totalRounds: 3,
      childGroups: [[1]],
    });
    // Mock script.getIds so CompileAndPushBlockAction doesn't throw
    (harness.runtime as any).script = { getIds: () => [] };
    block.mount(harness.runtime, { clock: harness.clock });
    harness.runtime.stack.push(block);

    // Advance past first interval
    harness.advanceClock(61000);
    harness.simulateTick();

    // Should still be running (not complete — 2 more rounds)
    expect(block.isComplete).toBe(false);
    // Timer should have been reset
    expect(block.timer.isRunning).toBe(true);

    // Round should have advanced
    const roundFrag = block.fragments.firstOfType(FragmentType.CurrentRound);
    expect((roundFrag!.value as { current: number }).current).toBe(2);
  });

  it('completes when all rounds exhausted', () => {
    const block = new EmomBlock(harness.runtime, {
      intervalMs: 10000,
      totalRounds: 2,
      childGroups: [[1]],
    });
    // Mock script.getIds so CompileAndPushBlockAction doesn't throw
    (harness.runtime as any).script = { getIds: () => [] };
    block.mount(harness.runtime, { clock: harness.clock });
    harness.runtime.stack.push(block);

    // First interval expires → advance to round 2
    harness.advanceClock(11000);
    harness.simulateTick();
    expect(block.isComplete).toBe(false);

    // Second interval expires → all rounds exhausted → complete
    harness.advanceClock(11000);
    harness.simulateTick();
    expect(block.isComplete).toBe(true);
    expect(block.completionReason).toBe('rounds-exhausted');
  });

  it('emits ClearChildrenAction on interval expiry', () => {
    const block = new EmomBlock(harness.runtime, {
      intervalMs: 10000,
      totalRounds: 3,
      childGroups: [[1]],
    });
    block.mount(harness.runtime, { clock: harness.clock });
    harness.runtime.stack.push(block);

    // Dispatch tick event directly through event bus to capture returned actions
    harness.advanceClock(11000);
    const event = { name: 'tick', timestamp: harness.clock.now, data: { source: 'test' } };
    const actions = harness.runtime.eventBus.dispatch(event, harness.runtime);

    const clearActions = actions.filter(a => a.type === 'clear-children');
    expect(clearActions.length).toBeGreaterThanOrEqual(1);
  });
});

// ============================================================================
// Cross-cutting: TypedBlock backward compatibility
// ============================================================================
describe('TypedBlock backward compatibility', () => {
  let harness: BehaviorTestHarness;

  beforeEach(() => {
    harness = new BehaviorTestHarness()
      .withClock(new Date('2024-01-01T12:00:00Z'));
  });

  it('behaviors is empty array for typed blocks', () => {
    const block = new GateBlock(harness.runtime);
    expect(block.behaviors).toEqual([]);
    expect(block.getBehavior(class {} as any)).toBeUndefined();
  });

  it('markComplete is idempotent', () => {
    const block = new GateBlock(harness.runtime);
    block.markComplete('first');
    block.markComplete('second');
    expect(block.completionReason).toBe('first');
  });

  it('executionTiming records start and end times', () => {
    const block = new GateBlock(harness.runtime);
    const startTime = new Date('2024-01-01T12:00:00Z');
    block.mount(harness.runtime, { clock: harness.clock, startTime });

    expect(block.executionTiming.startTime).toEqual(startTime);

    harness.advanceClock(5000);
    const completedAt = harness.clock.now;
    block.unmount(harness.runtime, { clock: harness.clock, completedAt });
    expect(block.executionTiming.completedAt).toEqual(completedAt);
  });

  it('sourceIds defaults to empty array', () => {
    const block = new GateBlock(harness.runtime);
    expect(block.sourceIds).toEqual([]);
  });

  it('sourceIds can be configured', () => {
    const block = new GateBlock(harness.runtime, { sourceIds: [1, 2, 3] });
    expect(block.sourceIds).toEqual([1, 2, 3]);
  });

  it('label falls back to blockType when no label fragment', () => {
    const block = new GateBlock(harness.runtime, { label: undefined });
    // GateBlock defaults to 'Ready' if label not provided
    expect(block.label).toBe('Ready');
  });
});
