import { describe, it, expect, vi } from 'vitest';
import { TimerBlock } from './TimerBlock';
import { JitStatement } from '@/core/types/JitStatement';
import { ITimerRuntime } from '@/core/ITimerRuntime';
import { TimerState } from '../outputs/SetTimerStateAction';
import { SetTimerStateAction } from '../outputs/SetTimerStateAction';
import { SetDurationAction } from '../outputs/SetDurationAction';
import { StartTimerAction } from '../actions/StartTimerAction';
import { SetButtonAction } from '../outputs/SetButtonAction';
import { CompleteHandler } from '../inputs/CompleteEvent';
import { Duration } from '@/core/types/Duration';
import { BlockKey } from '@/core/types/BlockKey';

// Mock implementation for JitStatement
function createMockStatement(duration?: number): JitStatement {
  return {
    id: 'test-statement',
    parent: undefined,
    children: [],
    meta: {},
    fragments: [],
    duration: (blockKey: BlockKey) => new Duration(duration),
    durations: () => duration ? [new Duration(duration)] : [],
    efforts: () => [],
    effort: (blockKey: BlockKey | number) => undefined,
    repetitions: () => [],
    repetition: (blockKey: BlockKey | number) => undefined,
    rounds: () => [],
    round: (blockKey: BlockKey | number) => undefined,
    resistances: () => [],
    resistance: (blockKey: BlockKey | number) => undefined,
    distances: () => [],
    distance: (blockKey: BlockKey | number) => undefined,
    increments: () => [],
    increment: (blockKey: BlockKey | number) => undefined,
    laps: () => [],
    lap: (blockKey: BlockKey | number) => undefined,
    toString: () => 'test statement',
    // Add other methods as needed for minimal functionality
  } as any;
}

describe('TimerBlock', () => {
  const mockRuntime = {} as ITimerRuntime;

  it('should create timer block with leaf property set to true', () => {
    const statement = createMockStatement(30000); // 30 seconds
    const block = new TimerBlock([statement]);
    
    expect(block.leaf).toBe(true);
  });

  it('should include CompleteHandler in handlers', () => {
    const statement = createMockStatement(30000);
    const block = new TimerBlock([statement]);
    
    expect(block.handlers.length).toBeGreaterThan(0);
    expect(block.handlers.some(h => h instanceof CompleteHandler)).toBe(true);
  });

  it('should create countdown timer for duration statements', () => {
    const statement = createMockStatement(30000); // 30 seconds
    const block = new TimerBlock([statement]);
    
    const actions = block.enter(mockRuntime);
    
    // Should contain a SetTimerStateAction with RUNNING_COUNTDOWN
    const timerStateAction = actions.find(a => a instanceof SetTimerStateAction) as SetTimerStateAction;
    expect(timerStateAction).toBeDefined();
    expect(timerStateAction.state).toBe(TimerState.RUNNING_COUNTDOWN);
    expect(timerStateAction.name).toBe("primary");
  });

  it('should create countup timer for statements without duration', () => {
    const statement = createMockStatement(); // No duration
    const block = new TimerBlock([statement]);
    
    const actions = block.enter(mockRuntime);
    
    // Should contain a SetTimerStateAction with RUNNING_COUNTUP
    const timerStateAction = actions.find(a => a instanceof SetTimerStateAction) as SetTimerStateAction;
    expect(timerStateAction).toBeDefined();
    expect(timerStateAction.state).toBe(TimerState.RUNNING_COUNTUP);
  });

  it('should include SetDurationAction for countdown timers', () => {
    const duration = 30000; // 30 seconds
    const statement = createMockStatement(duration);
    const block = new TimerBlock([statement]);
    
    const actions = block.enter(mockRuntime);
    
    // Should contain a SetDurationAction
    const durationAction = actions.find(a => a instanceof SetDurationAction) as SetDurationAction;
    expect(durationAction).toBeDefined();
    expect(durationAction.duration).toBe(duration);
    expect(durationAction.timerName).toBe("primary");
  });

  it('should not include SetDurationAction for countup timers', () => {
    const statement = createMockStatement(); // No duration
    const block = new TimerBlock([statement]);
    
    const actions = block.enter(mockRuntime);
    
    // Should not contain a SetDurationAction
    const durationAction = actions.find(a => a instanceof SetDurationAction);
    expect(durationAction).toBeUndefined();
  });

  it('should include StartTimerAction on enter', () => {
    const statement = createMockStatement(30000);
    const block = new TimerBlock([statement]);
    
    const actions = block.enter(mockRuntime);
    
    // Should contain a StartTimerAction
    const startAction = actions.find(a => a instanceof StartTimerAction);
    expect(startAction).toBeDefined();
  });

  it('should include button setup actions on enter', () => {
    const statement = createMockStatement(30000);
    const block = new TimerBlock([statement]);
    
    const actions = block.enter(mockRuntime);
    
    // Should contain SetButtonAction instances
    const buttonActions = actions.filter(a => a instanceof SetButtonAction) as SetButtonAction[];
    expect(buttonActions.length).toBeGreaterThan(0);
    
    // Should have both system and runtime button actions
    const systemButtons = buttonActions.find(a => (a as any).target === "system");
    const runtimeButtons = buttonActions.find(a => (a as any).target === "runtime");
    expect(systemButtons).toBeDefined();
    expect(runtimeButtons).toBeDefined();
  });

  it('should return PopBlockAction on next', () => {
    const statement = createMockStatement(30000);
    const block = new TimerBlock([statement]);
    
    const actions = block.next(mockRuntime);
    
    expect(actions.length).toBe(1);
    expect(actions[0].name).toBe("pop");
  });

  it('should clean up timer state on leave', () => {
    const statement = createMockStatement(30000);
    const block = new TimerBlock([statement]);
    
    const actions = block.leave(mockRuntime);
    
    // Should contain timer cleanup actions
    const timerStateAction = actions.find(a => a instanceof SetTimerStateAction) as SetTimerStateAction;
    expect(timerStateAction).toBeDefined();
    expect(timerStateAction.state).toBe(TimerState.STOPPED);
  });

  it('should return empty actions for onBlockStart and onBlockStop', () => {
    const statement = createMockStatement(30000);
    const block = new TimerBlock([statement]);
    
    expect(block.onStart(mockRuntime)).toEqual([]);
    expect(block.onStop(mockRuntime)).toEqual([]);
  });
});