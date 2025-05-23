import { describe, it, expect, vi, beforeEach, MockedFunction } from 'vitest'; // Added MockedFunction
import { RuntimeBlock } from '../RuntimeBlock';
import { JitStatement } from '../../../JitStatement';
import { IRuntimeAction } from '../../../IRuntimeAction';
import { ITimerRuntime } from '../../../ITimerRuntime';
import { RuntimeMetric } from '../../../RuntimeMetric';
import { IMetricCompositionStrategy } from '../../../metrics/IMetricCompositionStrategy';
// import { BlockKey } from '../../../BlockKey'; // Removed unused import
import { RuntimeSpan } from '../../../RuntimeSpan';
import { ICodeStatement } from '../../../CodeStatement'; // Corrected path
import { ZeroIndexMeta } from '../../../ZeroIndexMeta'; 

// Mock IRuntimeAction for testing purposes
const mockAction: IRuntimeAction = {
  name: 'mockAction',
  apply: vi.fn(),
};

const mockActionStart: IRuntimeAction = {
  name: 'mockActionStart',
  apply: vi.fn(),
};

const mockActionStop: IRuntimeAction = {
  name: 'mockActionStop',
  apply: vi.fn(),
};

// A concrete implementation of RuntimeBlock for testing
class TestableRuntimeBlock extends RuntimeBlock {
  public metricCompositionStrategy?: IMetricCompositionStrategy;
  public onBlockStartMock: MockedFunction< (runtime: ITimerRuntime) => IRuntimeAction[]>; 
  public onBlockStopMock: MockedFunction< (runtime: ITimerRuntime) => IRuntimeAction[]>;

  constructor(sources: JitStatement[] = []) {
    super(sources.length > 0 ? sources : [new JitStatement({ 
      id: 0, 
      children: [],
      fragments: [],
      meta: new ZeroIndexMeta(),
    } as ICodeStatement)]);
    this.onBlockStartMock = vi.fn((_runtime: ITimerRuntime) => [mockActionStart]); // Added _runtime argument
    this.onBlockStopMock = vi.fn((_runtime: ITimerRuntime) => [mockActionStop]); // Added _runtime argument
  }

  protected onEnter(_runtime: ITimerRuntime): IRuntimeAction[] { 
    return [];
  }
  protected onLeave(_runtime: ITimerRuntime): IRuntimeAction[] { 
    return [];
  }
  protected onNext(_runtime: ITimerRuntime): IRuntimeAction[] { 
    return [];
  }

  protected onBlockStart(runtime: ITimerRuntime): IRuntimeAction[] {
    return this.onBlockStartMock(runtime);
  }

  protected onBlockStop(runtime: ITimerRuntime): IRuntimeAction[] {
    return this.onBlockStopMock(runtime);
  }
}

// Mock ITimerRuntime
// ITimerRuntime does not have a direct blockKey. blockKey is on IRuntimeBlock.
// The tests that access mockTimerRuntime.blockKey need to be adjusted.
// For now, the factory creates a valid ITimerRuntime.
const createMockTimerRuntime = (): ITimerRuntime => ({
  code: 'testCode',
  jit: { script: {} as any, handlers: [], registerStrategy: vi.fn(), compile: vi.fn(), root: vi.fn(), idle: vi.fn(), end: vi.fn() } as any,
  trace: { push: vi.fn(), pop: vi.fn(), current: vi.fn(), traverseAll: vi.fn(), depth: 0, clear: vi.fn(), peek: vi.fn() } as any,
  history: [],
  script: { statements: [], root: new JitStatement({id: 'root', meta: new ZeroIndexMeta(), fragments: [], children: []} as ICodeStatement) } as any, // Added more details to script
  registry: undefined,
  apply: vi.fn(),
  push: vi.fn(),
  pop: vi.fn(),
  reset: vi.fn(),
  // Added missing properties from the actual ITimerRuntime definition if any were missed previously
  // current, dispose, isPaused, isStopped, isRunning, isIdle, isDone, peek, depth, metrics, query, find, findAll, select, selectMany, on, off, emit, now
  // These seem to be from a different/extended version of ITimerRuntime than what's in ITimerRuntime.ts. 
  // Sticking to the definition from ITimerRuntime.ts for now.
});

describe('RuntimeBlock', () => {
  let block: TestableRuntimeBlock;
  let mockTimerRuntime: ITimerRuntime;

  beforeEach(() => {
    mockTimerRuntime = createMockTimerRuntime();
    const mockJitStatement = new JitStatement({ 
      id: 1,  // Changed to number
      meta: new ZeroIndexMeta(), 
      fragments: [],
      children: [],
      parent: undefined,
    } as ICodeStatement); 
    block = new TestableRuntimeBlock([mockJitStatement]);
    
    block.onBlockStartMock.mockClear();
    block.onBlockStopMock.mockClear();
    (mockAction.apply as MockedFunction<any>).mockClear();
    (mockActionStart.apply as MockedFunction<any>).mockClear();
    (mockActionStop.apply as MockedFunction<any>).mockClear();
  });

  describe('onStart', () => {
    it('should add a RuntimeSpan to this.spans', () => {
      block.onStart(mockTimerRuntime);
      expect(block.spans().length).toBe(1);
      expect(block.spans()[0]).toBeInstanceOf(RuntimeSpan);
    });

    it('new RuntimeSpan should contain one ITimeSpan with a start event and no stop event', () => {
      block.onStart(mockTimerRuntime);
      const span = block.spans()[0]; 
      expect(span.timeSpans.length).toBe(1);
      const timeSpan = span.timeSpans[0];
      expect(timeSpan.start).toBeDefined();
      expect(timeSpan.stop).toBeUndefined();
    });

    it('start event should have name "block_started", a valid timestamp, and blockKey from the block itself', () => {
      block.onStart(mockTimerRuntime);
      const timeSpan = block.spans()[0].timeSpans[0]; 
      expect(timeSpan.start?.name).toBe('block_started');
      expect(timeSpan.start?.timestamp).toBeInstanceOf(Date);
      // blockKey in TimeSpanEvent should come from the block that was started, not the runtime directly
      expect(timeSpan.start?.blockKey).toEqual(block.blockKey.toString()); 
      expect(timeSpan.blockKey).toEqual(block.blockKey.toString());
    });

    it('should call onBlockStart and return its actions', () => {
      const returnedActions = block.onStart(mockTimerRuntime);
      expect(block.onBlockStartMock).toHaveBeenCalledTimes(1);
      expect(block.onBlockStartMock).toHaveBeenCalledWith(mockTimerRuntime);
      expect(returnedActions).toEqual([mockActionStart]);
    });

    it('calling onStart again should add a new ITimeSpan to the same RuntimeSpan if the last one is still running', () => {
      block.onStart(mockTimerRuntime); 
      expect(block.spans().length).toBe(1); 
      expect(block.spans()[0].timeSpans.length).toBe(1); 
      const firstTimeSpan = block.spans()[0].timeSpans[0]; 
      expect(firstTimeSpan.stop).toBeUndefined();

      block.onStart(mockTimerRuntime); 
      expect(block.spans().length).toBe(1); 
      expect(block.spans()[0].timeSpans.length).toBe(2); 

      const secondTimeSpan = block.spans()[0].timeSpans[1]; 
      expect(secondTimeSpan.start).toBeDefined();
      expect(secondTimeSpan.stop).toBeUndefined();
      expect(block.spans()[0].timeSpans[0].stop).toBeUndefined(); 
    });

     it('calling onStart should create a new RuntimeSpan if the last one was stopped', () => {
      block.onStart(mockTimerRuntime); 
      block.onStop(mockTimerRuntime);  
      
      expect(block.spans().length).toBe(1); 
      expect(block.spans()[0].timeSpans.length).toBe(1); 
      expect(block.spans()[0].timeSpans[0].stop).toBeDefined(); 

      const newMockTimerRuntime = createMockTimerRuntime();
      block.onStart(newMockTimerRuntime); 
      
      expect(block.spans().length).toBe(2); 
      expect(block.spans()[1].timeSpans.length).toBe(1); 
      expect(block.spans()[1].timeSpans[0].start).toBeDefined(); 
      expect(block.spans()[1].timeSpans[0].stop).toBeUndefined(); 
    });
  });

  describe('onStop', () => {
    it('should set the stop event on the last ITimeSpan of the last RuntimeSpan', () => {
      block.onStart(mockTimerRuntime);
      block.onStop(mockTimerRuntime);
      const timeSpan = block.spans()[0].timeSpans[0]; 
      expect(timeSpan.stop).toBeDefined();
    });

    it('stop event should have name "block_stopped", a valid timestamp, and blockKey from the block itself', () => {
      block.onStart(mockTimerRuntime);
      block.onStop(mockTimerRuntime);
      const timeSpan = block.spans()[0].timeSpans[0]; 
      expect(timeSpan.stop?.name).toBe('block_stopped');
      expect(timeSpan.stop?.timestamp).toBeInstanceOf(Date);
      expect(timeSpan.stop?.blockKey).toEqual(block.blockKey.toString());
    });

    it('should call onBlockStop and return its actions', () => {
      block.onStart(mockTimerRuntime); 
      const returnedActions = block.onStop(mockTimerRuntime);
      expect(block.onBlockStopMock).toHaveBeenCalledTimes(1);
      expect(block.onBlockStopMock).toHaveBeenCalledWith(mockTimerRuntime);
      expect(returnedActions).toEqual([mockActionStop]);
    });

    it('calling onStop when no ITimeSpan is active (no onStart called) should behave gracefully', () => {
      expect(() => block.onStop(mockTimerRuntime)).not.toThrow();
      expect(block.spans().length).toBe(0); 
      expect(block.onBlockStopMock).toHaveBeenCalledTimes(1); 
    });
    
    it('calling onStop multiple times should only set stop event once and call onBlockStop each time', () => {
      block.onStart(mockTimerRuntime);
      
      block.onStop(mockTimerRuntime); 
      const firstStopTime = block.spans()[0].timeSpans[0].stop?.timestamp; 
      expect(block.onBlockStopMock).toHaveBeenCalledTimes(1);
      
      block.onStop(mockTimerRuntime); 
      const secondStopTime = block.spans()[0].timeSpans[0].stop?.timestamp; 
      
      expect(block.spans()[0].timeSpans[0].stop).toBeDefined(); 
      expect(firstStopTime).toBe(secondStopTime); 
      expect(block.onBlockStopMock).toHaveBeenCalledTimes(2); 
    });
  });

  describe('composeMetrics', () => {
    let testBlock: TestableRuntimeBlock;

    beforeEach(() => {
      // mockTimerRuntime is already created by the outer beforeEach
      const mockJitStatement = new JitStatement({ 
        id: 2, // Changed to number
        meta: new ZeroIndexMeta(), 
        fragments: [],
        children: [],
        parent: undefined,
      } as ICodeStatement);
      testBlock = new TestableRuntimeBlock([mockJitStatement]);
    });

    it('should return an empty array if sources are empty and no strategy is set', () => {
      testBlock = new TestableRuntimeBlock([]);
      const metrics = testBlock.metrics(mockTimerRuntime);
      expect(metrics).toEqual([]);
    });

    it('should correctly compose metrics from sources when no strategy is set', () => {
      const mockEffortFn1 = vi.fn().mockReturnValue({ effort: 'effort1' });
      const mockEffortFn2 = vi.fn().mockReturnValue({ effort: 'effort2' });

      const iCodeStmt1: ICodeStatement = { id: 1, effort: mockEffortFn1, meta: new ZeroIndexMeta(), fragments: [], children: [] } as any;
      const iCodeStmt2: ICodeStatement = { id: 2, effort: mockEffortFn2, meta: new ZeroIndexMeta(), fragments: [], children: [] } as any;
      
      const mockSources = [
        new JitStatement(iCodeStmt1),
        new JitStatement(iCodeStmt2),
      ];
      (mockSources[0].node as any).effort = mockEffortFn1;
      (mockSources[1].node as any).effort = mockEffortFn2;

      testBlock = new TestableRuntimeBlock(mockSources);
      // When calling metrics, the blockKey used internally by JitStatement methods (like effort) 
      // will be the one from the runtime block instance (testBlock.blockKey) if not passed explicitly.
      // The mockTimerRuntime passed here is for the ITimerRuntime context.
      const metrics = testBlock.metrics(mockTimerRuntime);

      expect(metrics.length).toBe(2);
      expect(metrics[0].sourceId).toBe('1');
      expect(metrics[0].effort).toBe('effort1');
      // JitStatement.effort(blockKey) is called. The blockKey comes from the RuntimeBlock itself or the runtime.
      // The default implementation of RuntimeBlock.metrics passes its own blockKey (this.blockKey) to statement.effort.
      expect(mockEffortFn1).toHaveBeenCalledWith(testBlock.blockKey);

      expect(metrics[1].sourceId).toBe('2');
      expect(metrics[1].effort).toBe('effort2');
      expect(mockEffortFn2).toHaveBeenCalledWith(testBlock.blockKey);
    });

    it('should use the metricCompositionStrategy if provided', () => {
      const mockStrategyMetrics: RuntimeMetric[] = [
        { sourceId: 'strat1', effort: 'strat_effort1', values: [] },
      ];
      const mockStrategy: IMetricCompositionStrategy = {
        composeMetrics: vi.fn().mockReturnValue(mockStrategyMetrics),
      };
      
      const iCodeStmt = { id: 3, meta: new ZeroIndexMeta(), fragments: [], children: [] } as ICodeStatement; // Changed to number
      testBlock = new TestableRuntimeBlock([new JitStatement(iCodeStmt)]);
      testBlock.metricCompositionStrategy = mockStrategy;

      const metrics = testBlock.metrics(mockTimerRuntime);

      expect(mockStrategy.composeMetrics).toHaveBeenCalledWith(testBlock, mockTimerRuntime);
      expect(metrics).toBe(mockStrategyMetrics);
    });

    it('should use default effort if effort fragment is undefined and no strategy', () => {
      const mockEffortFn = vi.fn().mockReturnValue(undefined); 
      
      const iCodeStmt: ICodeStatement = { id: 4, effort: mockEffortFn, meta: new ZeroIndexMeta(), fragments: [], children: [] } as any; // Changed to number
      const mockSources = [new JitStatement(iCodeStmt)];
      (mockSources[0].node as any).effort = mockEffortFn;

      testBlock = new TestableRuntimeBlock(mockSources);
      const metrics = testBlock.metrics(mockTimerRuntime);

      expect(metrics.length).toBe(1);
      expect(metrics[0].sourceId).toBe('4');
      expect(metrics[0].effort).toBe('default_effort');
      expect(mockEffortFn).toHaveBeenCalledWith(testBlock.blockKey);
    });
  });
});
