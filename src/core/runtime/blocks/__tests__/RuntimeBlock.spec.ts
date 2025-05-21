import { RuntimeBlock } from '../RuntimeBlock';
import { JitStatement } from '../../../JitStatement';
import { IRuntimeAction } from '../../../IRuntimeAction';
import { ITimerRuntime } from '../../../ITimerRuntime';
import { BlockKey } from '../../../BlockKey';
import { RuntimeSpan } from '../../../RuntimeSpan';
import { ITimeSpan } from '../../../ITimeSpan';

// Mock IRuntimeAction for testing purposes
const mockAction: IRuntimeAction = {
  name: 'mockAction',
  apply: jest.fn(),
};

const mockActionStart: IRuntimeAction = {
  name: 'mockActionStart',
  apply: jest.fn(),
};

const mockActionStop: IRuntimeAction = {
  name: 'mockActionStop',
  apply: jest.fn(),
};

// A concrete implementation of RuntimeBlock for testing
class TestableRuntimeBlock extends RuntimeBlock {
  public onBlockStartMock = jest.fn<IRuntimeAction[], [ITimerRuntime]>(() => [mockActionStart]);
  public onBlockStopMock = jest.fn<IRuntimeAction[], [ITimerRuntime]>(() => [mockActionStop]);

  constructor(sources: JitStatement[] = []) {
    super(sources.length > 0 ? sources : [new JitStatement({} as any)]); // Ensure at least one source for BlockKey
  }

  protected onEnter(runtime: ITimerRuntime): IRuntimeAction[] {
    return [];
  }
  protected onLeave(runtime: ITimerRuntime): IRuntimeAction[] {
    return [];
  }
  protected onNext(runtime: ITimerRuntime): IRuntimeAction[] {
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
const mockTimerRuntime: ITimerRuntime = {} as ITimerRuntime; // Add properties if needed by methods

describe('RuntimeBlock', () => {
  let block: TestableRuntimeBlock;

  beforeEach(() => {
    // Create a new JitStatement with a minimal valid structure for BlockKey
    const mockJitStatement = new JitStatement({ 
      id: "stmt1", 
      key: "stmt1", 
      type: "action", 
      content: "test statement",
      sources: [],
      children: [],
      title: "",
      iterations: 0,
      ord: 0,
      statement: "test",
    } as any); // Use 'as any' to simplify JitStatement creation for tests
    block = new TestableRuntimeBlock([mockJitStatement]);
    // Reset mocks for spies
    block.onBlockStartMock.mockClear();
    block.onBlockStopMock.mockClear();
    mockAction.apply.mockClear();
    mockActionStart.apply.mockClear();
    mockActionStop.apply.mockClear();
  });

  describe('onStart', () => {
    it('should add a RuntimeSpan to this.spans', () => {
      block.onStart(mockTimerRuntime);
      expect(block.spans.length).toBe(1);
      expect(block.spans[0]).toBeInstanceOf(RuntimeSpan);
    });

    it('new RuntimeSpan should contain one ITimeSpan with a start event and no stop event', () => {
      block.onStart(mockTimerRuntime);
      const span = block.spans[0];
      expect(span.timeSpans.length).toBe(1);
      const timeSpan = span.timeSpans[0];
      expect(timeSpan.start).toBeDefined();
      expect(timeSpan.stop).toBeUndefined();
    });

    it('start event should have name "block_started", a valid timestamp, and blockKey', () => {
      block.onStart(mockTimerRuntime);
      const timeSpan = block.spans[0].timeSpans[0];
      expect(timeSpan.start?.name).toBe('block_started');
      expect(timeSpan.start?.timestamp).toBeInstanceOf(Date);
      expect(timeSpan.start?.blockKey).toEqual(block.blockKey.toString());
      expect(timeSpan.blockKey).toEqual(block.blockKey.toString()); // Also check ITimeSpan's own blockKey
    });

    it('should call onBlockStart and return its actions', () => {
      const actions = block.onStart(mockTimerRuntime);
      expect(block.onBlockStartMock).toHaveBeenCalledTimes(1);
      expect(block.onBlockStartMock).toHaveBeenCalledWith(mockTimerRuntime);
      expect(actions).toEqual([mockActionStart]);
    });

    it('calling onStart again should add a new ITimeSpan to the same RuntimeSpan if the last one is still running', () => {
      block.onStart(mockTimerRuntime); // First call
      expect(block.spans.length).toBe(1);
      expect(block.spans[0].timeSpans.length).toBe(1);
      const firstTimeSpan = block.spans[0].timeSpans[0];
      expect(firstTimeSpan.stop).toBeUndefined();

      block.onStart(mockTimerRuntime); // Second call
      expect(block.spans.length).toBe(1); // Still one RuntimeSpan
      expect(block.spans[0].timeSpans.length).toBe(2); // Now two ITimeSpans in it

      const secondTimeSpan = block.spans[0].timeSpans[1];
      expect(secondTimeSpan.start).toBeDefined();
      expect(secondTimeSpan.stop).toBeUndefined();
      // The first ITimeSpan should still be "open" as per clarification
      expect(block.spans[0].timeSpans[0].stop).toBeUndefined(); 
    });

     it('calling onStart should create a new RuntimeSpan if the last one was stopped', () => {
      block.onStart(mockTimerRuntime); // First call, creates first RuntimeSpan and first ITimeSpan
      block.onStop(mockTimerRuntime);  // Stops the first ITimeSpan in the first RuntimeSpan
      
      expect(block.spans.length).toBe(1);
      expect(block.spans[0].timeSpans.length).toBe(1);
      expect(block.spans[0].timeSpans[0].stop).toBeDefined();

      block.onStart(mockTimerRuntime); // Second call to onStart
      
      // As per RuntimeBlock.onStart logic:
      // "let currentSpan = this.spans[this.spans.length - 1];
      // if (!currentSpan || (currentSpan.timeSpans.length > 0 && currentSpan.timeSpans[currentSpan.timeSpans.length - 1].stop)) {
      // currentSpan = new RuntimeSpan(); ... this.spans.push(currentSpan); }"
      // This means a new RuntimeSpan should be created.
      expect(block.spans.length).toBe(2); 
      expect(block.spans[1].timeSpans.length).toBe(1);
      expect(block.spans[1].timeSpans[0].start).toBeDefined();
      expect(block.spans[1].timeSpans[0].stop).toBeUndefined();
    });
  });

  describe('onStop', () => {
    it('should set the stop event on the last ITimeSpan of the last RuntimeSpan', () => {
      block.onStart(mockTimerRuntime);
      block.onStop(mockTimerRuntime);
      const timeSpan = block.spans[0].timeSpans[0];
      expect(timeSpan.stop).toBeDefined();
    });

    it('stop event should have name "block_stopped", a valid timestamp, and blockKey', () => {
      block.onStart(mockTimerRuntime);
      block.onStop(mockTimerRuntime);
      const timeSpan = block.spans[0].timeSpans[0];
      expect(timeSpan.stop?.name).toBe('block_stopped');
      expect(timeSpan.stop?.timestamp).toBeInstanceOf(Date);
      expect(timeSpan.stop?.blockKey).toEqual(block.blockKey.toString());
    });

    it('should call onBlockStop and return its actions', () => {
      block.onStart(mockTimerRuntime); // Must start first to have an active timespan
      const actions = block.onStop(mockTimerRuntime);
      expect(block.onBlockStopMock).toHaveBeenCalledTimes(1);
      expect(block.onBlockStopMock).toHaveBeenCalledWith(mockTimerRuntime);
      expect(actions).toEqual([mockActionStop]);
    });

    it('calling onStop when no ITimeSpan is active (no onStart called) should behave gracefully', () => {
      expect(() => block.onStop(mockTimerRuntime)).not.toThrow();
      expect(block.spans.length).toBe(0); // No RuntimeSpan was created
      expect(block.onBlockStopMock).toHaveBeenCalledTimes(1); // onBlockStop is still called
    });
    
    it('calling onStop multiple times should only set stop event once and call onBlockStop each time', () => {
      block.onStart(mockTimerRuntime);
      
      block.onStop(mockTimerRuntime); // First call
      const firstStopTime = block.spans[0].timeSpans[0].stop?.timestamp;
      expect(block.onBlockStopMock).toHaveBeenCalledTimes(1);
      
      block.onStop(mockTimerRuntime); // Second call
      const secondStopTime = block.spans[0].timeSpans[0].stop?.timestamp;
      
      expect(block.spans[0].timeSpans[0].stop).toBeDefined();
      expect(firstStopTime).toBe(secondStopTime); // Timestamp should not change
      expect(block.onBlockStopMock).toHaveBeenCalledTimes(2); // onBlockStop called again
    });
  });
});
