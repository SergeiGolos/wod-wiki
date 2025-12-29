import { describe, it, expect, beforeEach } from 'bun:test';
import { PhasedActionProcessor } from '../PhasedActionProcessor';
import { ActionPhase, IPhasedAction } from '../ActionPhase';
import { IRuntimeAction } from '../../contracts/IRuntimeAction';
import { IScriptRuntime } from '../../contracts/IScriptRuntime';

// Mock runtime for testing
const createMockRuntime = (): IScriptRuntime => ({
  script: {} as any,
  eventBus: {} as any,
  memory: {} as any,
  stack: { current: null, count: 0, blocks: [], keys: [], push: () => {}, pop: () => undefined, clear: () => {} } as any,
  clock: { now: new Date(), isRunning: true } as any,
  jit: {} as any,
  errors: [],
  options: {},
  queueActions: () => {},
  pushBlock: () => ({} as any),
  popBlock: () => ({} as any),
  handle: () => {},
  isComplete: () => false,
  dispose: () => {},
} as IScriptRuntime);

// Test action that records when it was executed
class TestAction implements IPhasedAction {
  readonly type = 'test-action';
  public executedAt: number | null = null;
  
  constructor(
    readonly phase: ActionPhase,
    readonly id: string,
    private executionOrder: string[]
  ) {}
  
  do(_runtime: IScriptRuntime): void {
    this.executedAt = Date.now();
    this.executionOrder.push(`${this.phase}:${this.id}`);
  }
}

// Non-phased action (should be returned as immediate)
class ImmediateAction implements IRuntimeAction {
  readonly type = 'immediate-action';
  public executed = false;
  
  do(_runtime: IScriptRuntime): void {
    this.executed = true;
  }
}

describe('PhasedActionProcessor', () => {
  let processor: PhasedActionProcessor;
  let executionOrder: string[];
  
  beforeEach(() => {
    processor = new PhasedActionProcessor({ debug: false });
    executionOrder = [];
  });
  
  describe('queue()', () => {
    it('should return null for phased actions', () => {
      const action = new TestAction(ActionPhase.DISPLAY, 'test', executionOrder);
      const result = processor.queue(action);
      expect(result).toBeNull();
    });
    
    it('should return the action for immediate/non-phased actions', () => {
      const action = new ImmediateAction();
      const result = processor.queue(action);
      expect(result).toBe(action);
    });
    
    it('should queue phased actions for later processing', () => {
      const action = new TestAction(ActionPhase.DISPLAY, 'test', executionOrder);
      processor.queue(action);
      expect(processor.hasPendingActions()).toBe(true);
    });
  });
  
  describe('queueMany()', () => {
    it('should separate phased from immediate actions', () => {
      const phasedAction = new TestAction(ActionPhase.STACK, 'phased', executionOrder);
      const immediateAction = new ImmediateAction();
      
      const result = processor.queueMany([phasedAction, immediateAction]);
      
      expect(result).toHaveLength(1);
      expect(result[0]).toBe(immediateAction);
      expect(processor.hasPendingActions()).toBe(true);
    });
  });
  
  describe('processAllPhases()', () => {
    it('should execute phases in correct order', () => {
      const runtime = createMockRuntime();
      
      // Queue actions in reverse order to verify sorting
      processor.queue(new TestAction(ActionPhase.STACK, 'stack1', executionOrder));
      processor.queue(new TestAction(ActionPhase.DISPLAY, 'display1', executionOrder));
      processor.queue(new TestAction(ActionPhase.EVENT, 'event1', executionOrder));
      processor.queue(new TestAction(ActionPhase.MEMORY, 'memory1', executionOrder));
      processor.queue(new TestAction(ActionPhase.SIDE_EFFECT, 'side1', executionOrder));
      
      processor.processAllPhases(runtime);
      
      // Verify order: DISPLAY -> MEMORY -> SIDE_EFFECT -> EVENT -> STACK
      expect(executionOrder).toEqual([
        'display:display1',
        'memory:memory1',
        'side_effect:side1',
        'event:event1',
        'stack:stack1'
      ]);
    });
    
    it('should process multiple actions in same phase in queue order', () => {
      const runtime = createMockRuntime();
      
      processor.queue(new TestAction(ActionPhase.DISPLAY, 'display1', executionOrder));
      processor.queue(new TestAction(ActionPhase.DISPLAY, 'display2', executionOrder));
      processor.queue(new TestAction(ActionPhase.DISPLAY, 'display3', executionOrder));
      
      processor.processAllPhases(runtime);
      
      expect(executionOrder).toEqual([
        'display:display1',
        'display:display2',
        'display:display3'
      ]);
    });
    
    it('should return false if no pending actions', () => {
      const runtime = createMockRuntime();
      const result = processor.processAllPhases(runtime);
      expect(result).toBe(false);
    });
    
    it('should return true if actions were processed', () => {
      const runtime = createMockRuntime();
      processor.queue(new TestAction(ActionPhase.DISPLAY, 'test', executionOrder));
      const result = processor.processAllPhases(runtime);
      expect(result).toBe(true);
    });
    
    it('should clear pending actions after processing', () => {
      const runtime = createMockRuntime();
      processor.queue(new TestAction(ActionPhase.DISPLAY, 'test', executionOrder));
      
      expect(processor.hasPendingActions()).toBe(true);
      processor.processAllPhases(runtime);
      expect(processor.hasPendingActions()).toBe(false);
    });
  });
  
  describe('getCurrentPhase()', () => {
    it('should return null when not processing', () => {
      expect(processor.getCurrentPhase()).toBeNull();
    });
  });
  
  describe('getPendingCounts()', () => {
    it('should return counts per phase', () => {
      processor.queue(new TestAction(ActionPhase.DISPLAY, 'd1', executionOrder));
      processor.queue(new TestAction(ActionPhase.DISPLAY, 'd2', executionOrder));
      processor.queue(new TestAction(ActionPhase.STACK, 's1', executionOrder));
      
      const counts = processor.getPendingCounts();
      
      expect(counts.get(ActionPhase.DISPLAY)).toBe(2);
      expect(counts.get(ActionPhase.STACK)).toBe(1);
      expect(counts.get(ActionPhase.MEMORY)).toBe(0);
    });
  });
  
  describe('clear()', () => {
    it('should remove all pending actions', () => {
      processor.queue(new TestAction(ActionPhase.DISPLAY, 'test', executionOrder));
      processor.queue(new TestAction(ActionPhase.STACK, 'test2', executionOrder));
      
      expect(processor.hasPendingActions()).toBe(true);
      processor.clear();
      expect(processor.hasPendingActions()).toBe(false);
    });
  });
  
  describe('phase isolation', () => {
    it('should ensure STACK actions run after all other phases', () => {
      const runtime = createMockRuntime();
      
      // Simulate a typical scenario: display update, event emit, then pop
      processor.queue(new TestAction(ActionPhase.DISPLAY, 'update-ui', executionOrder));
      processor.queue(new TestAction(ActionPhase.STACK, 'pop-block', executionOrder));
      processor.queue(new TestAction(ActionPhase.EVENT, 'emit-complete', executionOrder));
      processor.queue(new TestAction(ActionPhase.MEMORY, 'update-state', executionOrder));
      
      processor.processAllPhases(runtime);
      
      // Stack should always be last
      expect(executionOrder[executionOrder.length - 1]).toBe('stack:pop-block');
      
      // Display should be first
      expect(executionOrder[0]).toBe('display:update-ui');
    });
  });
});
